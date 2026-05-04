package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dk/stackr/internal/models"
)

// SnapshotRepository handles database operations for balance snapshots.
type SnapshotRepository struct {
	db *pgxpool.Pool
}

// NewSnapshotRepository constructs a SnapshotRepository.
func NewSnapshotRepository(db *pgxpool.Pool) *SnapshotRepository {
	return &SnapshotRepository{db: db}
}

// ListByUser returns all snapshots for accounts belonging to the given user,
// optionally filtered by year and/or month (pass 0 to skip that filter).
func (r *SnapshotRepository) ListByUser(ctx context.Context, userID string, year, month int) ([]models.BalanceSnapshot, error) {
	query := `
		SELECT bs.id, bs.account_id, bs.year, bs.month, bs.balance, bs.exchange_rate, bs.created_at, bs.updated_at
		FROM balance_snapshots bs
		JOIN accounts a ON a.id = bs.account_id
		WHERE a.user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	if year != 0 {
		query += fmt.Sprintf(" AND bs.year = $%d", argIdx)
		args = append(args, year)
		argIdx++
	}
	if month != 0 {
		query += fmt.Sprintf(" AND bs.month = $%d", argIdx)
		args = append(args, month)
		argIdx++
	}

	query += " ORDER BY bs.year DESC, bs.month DESC, bs.account_id ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list snapshots: %w", err)
	}
	defer rows.Close()

	var snapshots []models.BalanceSnapshot
	for rows.Next() {
		var s models.BalanceSnapshot
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Year, &s.Month, &s.Balance, &s.ExchangeRate, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan snapshot: %w", err)
		}
		snapshots = append(snapshots, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate snapshots: %w", err)
	}
	return snapshots, nil
}

// GetByID returns a single snapshot, verifying ownership via the accounts join.
func (r *SnapshotRepository) GetByID(ctx context.Context, id, userID string) (*models.BalanceSnapshot, error) {
	const query = `
		SELECT bs.id, bs.account_id, bs.year, bs.month, bs.balance, bs.exchange_rate, bs.created_at, bs.updated_at
		FROM balance_snapshots bs
		JOIN accounts a ON a.id = bs.account_id
		WHERE bs.id = $1 AND a.user_id = $2`

	var s models.BalanceSnapshot
	err := r.db.QueryRow(ctx, query, id, userID).Scan(
		&s.ID, &s.AccountID, &s.Year, &s.Month, &s.Balance, &s.ExchangeRate, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get snapshot: %w", err)
	}
	return &s, nil
}

// Upsert inserts or updates a snapshot for the given account/year/month.
// The owning user must match via the accounts table.
func (r *SnapshotRepository) Upsert(ctx context.Context, s *models.BalanceSnapshot, userID string) (*models.BalanceSnapshot, error) {
	// Verify that the account belongs to the user before upserting.
	const ownerCheck = `SELECT 1 FROM accounts WHERE id = $1 AND user_id = $2`
	var exists int
	if err := r.db.QueryRow(ctx, ownerCheck, s.AccountID, userID).Scan(&exists); err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("verify account ownership: %w", err)
	}

	const query = `
		INSERT INTO balance_snapshots (account_id, year, month, balance, exchange_rate)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (account_id, year, month) DO UPDATE
		    SET balance = EXCLUDED.balance,
		        exchange_rate = EXCLUDED.exchange_rate,
		        updated_at = NOW()
		RETURNING id, account_id, year, month, balance, exchange_rate, created_at, updated_at`

	var created models.BalanceSnapshot
	err := r.db.QueryRow(ctx, query, s.AccountID, s.Year, s.Month, s.Balance, s.ExchangeRate).Scan(
		&created.ID, &created.AccountID, &created.Year, &created.Month,
		&created.Balance, &created.ExchangeRate, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("upsert snapshot: %w", err)
	}
	return &created, nil
}

// UpdateBalance changes the balance of an existing snapshot.
func (r *SnapshotRepository) UpdateBalance(ctx context.Context, id, userID string, balance int64) (*models.BalanceSnapshot, error) {
	const query = `
		UPDATE balance_snapshots bs
		SET balance = $1, updated_at = NOW()
		FROM accounts a
		WHERE bs.id = $2 AND bs.account_id = a.id AND a.user_id = $3
		RETURNING bs.id, bs.account_id, bs.year, bs.month, bs.balance, bs.exchange_rate, bs.created_at, bs.updated_at`

	var s models.BalanceSnapshot
	err := r.db.QueryRow(ctx, query, balance, id, userID).Scan(
		&s.ID, &s.AccountID, &s.Year, &s.Month, &s.Balance, &s.ExchangeRate, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update snapshot balance: %w", err)
	}
	return &s, nil
}

// HistoryFilter defines the parameters for the snapshot history query.
type HistoryFilter struct {
	AccountID string
	FromYear  int
	FromMonth int
	ToYear    int
	ToMonth   int
}

// ListHistory returns snapshots for a user optionally filtered by account and date range.
func (r *SnapshotRepository) ListHistory(ctx context.Context, userID string, f HistoryFilter) ([]models.BalanceSnapshot, error) {
	query := `
		SELECT bs.id, bs.account_id, bs.year, bs.month, bs.balance, bs.exchange_rate, bs.created_at, bs.updated_at
		FROM balance_snapshots bs
		JOIN accounts a ON a.id = bs.account_id
		WHERE a.user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	if f.AccountID != "" {
		query += fmt.Sprintf(" AND bs.account_id = $%d", argIdx)
		args = append(args, f.AccountID)
		argIdx++
	}
	if f.FromYear != 0 {
		query += fmt.Sprintf(" AND (bs.year > $%d OR (bs.year = $%d AND bs.month >= $%d))", argIdx, argIdx, argIdx+1)
		args = append(args, f.FromYear, f.FromMonth)
		argIdx += 2
	}
	if f.ToYear != 0 {
		query += fmt.Sprintf(" AND (bs.year < $%d OR (bs.year = $%d AND bs.month <= $%d))", argIdx, argIdx, argIdx+1)
		args = append(args, f.ToYear, f.ToMonth)
		argIdx += 2
	}

	query += " ORDER BY bs.year ASC, bs.month ASC, bs.account_id ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list snapshot history: %w", err)
	}
	defer rows.Close()

	var snapshots []models.BalanceSnapshot
	for rows.Next() {
		var s models.BalanceSnapshot
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Year, &s.Month, &s.Balance, &s.ExchangeRate, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan snapshot: %w", err)
		}
		snapshots = append(snapshots, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate snapshot history: %w", err)
	}
	return snapshots, nil
}

// NetWorthForMonth computes the net worth for a given user/year/month by
// summing all balance snapshots converted to CHF via the per-snapshot
// exchange rate. Liabilities are subtracted.
// It returns 0 if there are no snapshots for that month.
func (r *SnapshotRepository) NetWorthForMonth(ctx context.Context, userID string, year, month int) (int64, error) {
	const query = `
		SELECT COALESCE(SUM(
		    CASE WHEN a.type = 'LIABILITY'
		         THEN -ROUND(bs.balance * bs.exchange_rate)::BIGINT
		         ELSE  ROUND(bs.balance * bs.exchange_rate)::BIGINT END
		), 0)
		FROM balance_snapshots bs
		JOIN accounts a ON a.id = bs.account_id
		WHERE a.user_id = $1 AND bs.year = $2 AND bs.month = $3`

	var total int64
	if err := r.db.QueryRow(ctx, query, userID, year, month).Scan(&total); err != nil {
		return 0, fmt.Errorf("net worth for month: %w", err)
	}
	return total, nil
}

// AllSnapshotsForUser returns every snapshot for a user, used by the export handler.
func (r *SnapshotRepository) AllSnapshotsForUser(ctx context.Context, userID string) ([]models.BalanceSnapshot, error) {
	const query = `
		SELECT bs.id, bs.account_id, bs.year, bs.month, bs.balance, bs.exchange_rate, bs.created_at, bs.updated_at
		FROM balance_snapshots bs
		JOIN accounts a ON a.id = bs.account_id
		WHERE a.user_id = $1
		ORDER BY bs.year ASC, bs.month ASC, bs.account_id ASC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("all snapshots: %w", err)
	}
	defer rows.Close()

	var snapshots []models.BalanceSnapshot
	for rows.Next() {
		var s models.BalanceSnapshot
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Year, &s.Month, &s.Balance, &s.ExchangeRate, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan snapshot: %w", err)
		}
		snapshots = append(snapshots, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate snapshots: %w", err)
	}
	return snapshots, nil
}
