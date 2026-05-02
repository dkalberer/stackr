package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DBHost         string
	DBPort         string
	DBName         string
	DBUser         string
	DBPassword     string
	DBSchema   string
	JWTSecret  string
	Port       string
	CORSOrigin string
}

// Load reads configuration from environment variables.
// Required variables: DB_PASSWORD, JWT_SECRET.
// All other variables have sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		DBHost:         getEnvOrDefault("DB_HOST", "localhost"),
		DBPort:         getEnvOrDefault("DB_PORT", "5432"),
		DBName:         getEnvOrDefault("DB_NAME", "postgres"),
		DBUser:         getEnvOrDefault("DB_USER", "postgres"),
		DBPassword:     os.Getenv("DB_PASSWORD"),
		DBSchema:       getEnvOrDefault("DB_SCHEMA", "stackr"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		Port:       getEnvOrDefault("PORT", "8080"),
		CORSOrigin: getEnvOrDefault("CORS_ORIGIN", "http://localhost:5173"),
	}

	if cfg.DBPassword == "" {
		return nil, fmt.Errorf("DB_PASSWORD environment variable is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	return cfg, nil
}

// DSN returns a PostgreSQL connection string for pgx.
// Sets search_path so all queries target the stackr schema without qualification.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s dbname=%s user=%s password=%s sslmode=disable search_path=%s",
		c.DBHost, c.DBPort, c.DBName, c.DBUser, c.DBPassword, c.DBSchema,
	)
}

func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
