package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dk/stackr/internal/models"
)

// AccountRepository handles database operations for accounts.
type AccountRepository struct {
	db *pgxpool.Pool
}

// NewAccountRepository constructs an AccountRepository.
func NewAccountRepository(db *pgxpool.Pool) *AccountRepository {
	return &AccountRepository{db: db}
}

// ListByUser returns all accounts belonging to the given user, ordered by creation time.
func (r *AccountRepository) ListByUser(ctx context.Context, userID string) ([]models.Account, error) {
	const query = `
		SELECT id, user_id, name, type, COALESCE(institution, ''), currency,
		       COALESCE(color, ''), is_active, COALESCE(notes, ''), created_at
		FROM accounts
		WHERE user_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Type, &a.Institution,
			&a.Currency, &a.Color, &a.IsActive, &a.Notes, &a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		accounts = append(accounts, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}
	return accounts, nil
}

// GetByID returns a single account by its ID, verifying ownership.
func (r *AccountRepository) GetByID(ctx context.Context, id, userID string) (*models.Account, error) {
	const query = `
		SELECT id, user_id, name, type, COALESCE(institution, ''), currency,
		       COALESCE(color, ''), is_active, COALESCE(notes, ''), created_at
		FROM accounts
		WHERE id = $1 AND user_id = $2`

	var a models.Account
	err := r.db.QueryRow(ctx, query, id, userID).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.Institution,
		&a.Currency, &a.Color, &a.IsActive, &a.Notes, &a.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get account: %w", err)
	}
	return &a, nil
}

// Create inserts a new account and returns the created record.
func (r *AccountRepository) Create(ctx context.Context, a *models.Account) (*models.Account, error) {
	const query = `
		INSERT INTO accounts (user_id, name, type, institution, currency, color, is_active, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, name, type, COALESCE(institution, ''), currency,
		          COALESCE(color, ''), is_active, COALESCE(notes, ''), created_at`

	var created models.Account
	err := r.db.QueryRow(ctx, query,
		a.UserID, a.Name, a.Type,
		a.Institution, a.Currency,
		a.Color, a.IsActive,
		a.Notes,
	).Scan(
		&created.ID, &created.UserID, &created.Name, &created.Type,
		&created.Institution, &created.Currency, &created.Color,
		&created.IsActive, &created.Notes, &created.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create account: %w", err)
	}
	return &created, nil
}

// Update modifies an existing account. Only the owning user may update.
func (r *AccountRepository) Update(ctx context.Context, a *models.Account) (*models.Account, error) {
	const query = `
		UPDATE accounts
		SET name = $1, type = $2, institution = $3, currency = $4,
		    color = $5, is_active = $6, notes = $7
		WHERE id = $8 AND user_id = $9
		RETURNING id, user_id, name, type, COALESCE(institution, ''), currency,
		          COALESCE(color, ''), is_active, COALESCE(notes, ''), created_at`

	var updated models.Account
	err := r.db.QueryRow(ctx, query,
		a.Name, a.Type,
		a.Institution, a.Currency,
		a.Color, a.IsActive,
		a.Notes,
		a.ID, a.UserID,
	).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Type,
		&updated.Institution, &updated.Currency, &updated.Color,
		&updated.IsActive, &updated.Notes, &updated.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update account: %w", err)
	}
	return &updated, nil
}

// Delete permanently removes an account. Only the owning user may delete.
func (r *AccountRepository) Delete(ctx context.Context, id, userID string) error {
	const query = `DELETE FROM accounts WHERE id = $1 AND user_id = $2`

	tag, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("delete account: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SetActive updates the is_active flag for an account.
func (r *AccountRepository) SetActive(ctx context.Context, id, userID string, active bool) error {
	const query = `UPDATE accounts SET is_active = $1 WHERE id = $2 AND user_id = $3`

	tag, err := r.db.Exec(ctx, query, active, id, userID)
	if err != nil {
		return fmt.Errorf("set account active: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

