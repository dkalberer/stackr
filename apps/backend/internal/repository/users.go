package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dk/stackr/internal/models"
)

// UserRepository handles database operations for users.
type UserRepository struct {
	db *pgxpool.Pool
}

// NewUserRepository constructs a UserRepository.
func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// Create inserts a new user and returns the created record.
func (r *UserRepository) Create(ctx context.Context, email, passwordHash, name string) (*models.User, error) {
	const query = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, name, created_at`

	var u models.User
	err := r.db.QueryRow(ctx, query, email, passwordHash, name).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return &u, nil
}

// GetByEmail returns the user with the given email address, including the password hash.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, name, created_at
		FROM users
		WHERE email = $1`

	var u models.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &u, nil
}

// GetByID returns the user with the given ID.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, name, created_at
		FROM users
		WHERE id = $1`

	var u models.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

// UpdatePassword sets a new bcrypt password hash for the given user.
func (r *UserRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	const query = `UPDATE users SET password_hash = $1 WHERE id = $2`

	tag, err := r.db.Exec(ctx, query, passwordHash, id)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// EmailExists reports whether the given email is already registered.
func (r *UserRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	const query = `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	if err := r.db.QueryRow(ctx, query, email).Scan(&exists); err != nil {
		return false, fmt.Errorf("check email existence: %w", err)
	}
	return exists, nil
}
