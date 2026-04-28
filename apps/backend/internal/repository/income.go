package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dk/stackr/internal/models"
)

// IncomeRepository handles database operations for income entries.
type IncomeRepository struct {
	db *pgxpool.Pool
}

// NewIncomeRepository constructs an IncomeRepository.
func NewIncomeRepository(db *pgxpool.Pool) *IncomeRepository {
	return &IncomeRepository{db: db}
}

// ListByUser returns income entries for the given user, optionally filtered.
// Pass 0 for year or month to skip that filter.
func (r *IncomeRepository) ListByUser(ctx context.Context, userID string, year, month int) ([]models.IncomeEntry, error) {
	query := `
		SELECT id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at
		FROM income_entries
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	if year != 0 {
		query += fmt.Sprintf(" AND year = $%d", argIdx)
		args = append(args, year)
		argIdx++
	}
	if month != 0 {
		query += fmt.Sprintf(" AND month = $%d", argIdx)
		args = append(args, month)
		argIdx++
	}

	query += " ORDER BY year DESC, month DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list income entries: %w", err)
	}
	defer rows.Close()

	var entries []models.IncomeEntry
	for rows.Next() {
		var e models.IncomeEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Year, &e.Month, &e.GrossIncome, &e.NetIncome, &e.Notes, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan income entry: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate income entries: %w", err)
	}
	return entries, nil
}

// GetByID returns a single income entry, verifying ownership.
func (r *IncomeRepository) GetByID(ctx context.Context, id, userID string) (*models.IncomeEntry, error) {
	const query = `
		SELECT id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at
		FROM income_entries
		WHERE id = $1 AND user_id = $2`

	var e models.IncomeEntry
	err := r.db.QueryRow(ctx, query, id, userID).Scan(
		&e.ID, &e.UserID, &e.Year, &e.Month, &e.GrossIncome, &e.NetIncome, &e.Notes, &e.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get income entry: %w", err)
	}
	return &e, nil
}

// GetByYearMonth returns the income entry for a specific month, if any.
func (r *IncomeRepository) GetByYearMonth(ctx context.Context, userID string, year, month int) (*models.IncomeEntry, error) {
	const query = `
		SELECT id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at
		FROM income_entries
		WHERE user_id = $1 AND year = $2 AND month = $3`

	var e models.IncomeEntry
	err := r.db.QueryRow(ctx, query, userID, year, month).Scan(
		&e.ID, &e.UserID, &e.Year, &e.Month, &e.GrossIncome, &e.NetIncome, &e.Notes, &e.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get income entry by month: %w", err)
	}
	return &e, nil
}

// Upsert inserts or updates an income entry for the given user/year/month.
func (r *IncomeRepository) Upsert(ctx context.Context, e *models.IncomeEntry) (*models.IncomeEntry, error) {
	const query = `
		INSERT INTO income_entries (user_id, year, month, gross_income, net_income, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, year, month) DO UPDATE
		    SET gross_income = EXCLUDED.gross_income,
		        net_income   = EXCLUDED.net_income,
		        notes        = EXCLUDED.notes
		RETURNING id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at`

	var created models.IncomeEntry
	err := r.db.QueryRow(ctx, query,
		e.UserID, e.Year, e.Month, e.GrossIncome, e.NetIncome, e.Notes,
	).Scan(
		&created.ID, &created.UserID, &created.Year, &created.Month,
		&created.GrossIncome, &created.NetIncome, &created.Notes, &created.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("upsert income entry: %w", err)
	}
	return &created, nil
}

// Update modifies an existing income entry.
func (r *IncomeRepository) Update(ctx context.Context, e *models.IncomeEntry) (*models.IncomeEntry, error) {
	const query = `
		UPDATE income_entries
		SET gross_income = $1, net_income = $2, notes = $3
		WHERE id = $4 AND user_id = $5
		RETURNING id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at`

	var updated models.IncomeEntry
	err := r.db.QueryRow(ctx, query,
		e.GrossIncome, e.NetIncome, e.Notes, e.ID, e.UserID,
	).Scan(
		&updated.ID, &updated.UserID, &updated.Year, &updated.Month,
		&updated.GrossIncome, &updated.NetIncome, &updated.Notes, &updated.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update income entry: %w", err)
	}
	return &updated, nil
}

// RecentEntries returns the N most recent income entries for a user, ordered newest-first.
func (r *IncomeRepository) RecentEntries(ctx context.Context, userID string, n int) ([]models.IncomeEntry, error) {
	const query = `
		SELECT id, user_id, year, month, gross_income, net_income, COALESCE(notes, ''), created_at
		FROM income_entries
		WHERE user_id = $1
		ORDER BY year DESC, month DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, userID, n)
	if err != nil {
		return nil, fmt.Errorf("recent income entries: %w", err)
	}
	defer rows.Close()

	var entries []models.IncomeEntry
	for rows.Next() {
		var e models.IncomeEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Year, &e.Month, &e.GrossIncome, &e.NetIncome, &e.Notes, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan income entry: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate income entries: %w", err)
	}
	return entries, nil
}

// AllForUser returns every income entry for a user, used by the export handler.
func (r *IncomeRepository) AllForUser(ctx context.Context, userID string) ([]models.IncomeEntry, error) {
	return r.ListByUser(ctx, userID, 0, 0)
}
