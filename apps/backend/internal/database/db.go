package database

import (
	"context"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dk/stackr/internal/config"
	"github.com/dk/stackr/migrations"
)

// Connect creates a pgxpool connection pool and verifies connectivity.
func Connect(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	// Explicitly set search_path so every connection targets the stackr schema.
	poolCfg.ConnConfig.RuntimeParams["search_path"] = cfg.DBSchema

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

// RunMigrations applies all pending up-migrations from the embedded SQL files.
// It is safe to call when the schema is already up to date.
func RunMigrations(cfg *config.Config) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("create migration source: %w", err)
	}

	// golang-migrate pgx/v5 driver DSN uses the pgx5:// scheme.
	migrateURL := fmt.Sprintf(
		"pgx5://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword,
		cfg.DBHost, cfg.DBPort, cfg.DBName,
		cfg.DBSSLMode,
	)

	m, err := migrate.NewWithSourceInstance("iofs", src, migrateURL)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}
