package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/config"
	"github.com/dk/stackr/internal/database"
	"github.com/dk/stackr/internal/handlers"
	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/repository"
	"github.com/dk/stackr/internal/services"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("startup error: %v", err)
	}
}

func run() error {
	// --- Configuration ---
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// --- Database Migrations ---
	log.Println("running database migrations...")
	if err := database.RunMigrations(cfg); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	log.Println("migrations complete")

	// --- Database Connection ---
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer pool.Close()

	log.Println("database connected")

	// --- Services ---
	authSvc := services.NewAuthService(cfg.JWTSecret)

	// --- Repositories ---
	userRepo := repository.NewUserRepository(pool)
	accountRepo := repository.NewAccountRepository(pool)
	snapshotRepo := repository.NewSnapshotRepository(pool)
	incomeRepo := repository.NewIncomeRepository(pool)

	// --- Handlers ---
	authHandler := handlers.NewAuthHandler(userRepo, authSvc)
	accountHandler := handlers.NewAccountHandler(accountRepo)
	snapshotHandler := handlers.NewSnapshotHandler(snapshotRepo)
	incomeHandler := handlers.NewIncomeHandler(incomeRepo)
	dashboardHandler := handlers.NewDashboardHandler(accountRepo, snapshotRepo, incomeRepo)
	exportHandler := handlers.NewExportHandler(accountRepo, snapshotRepo, incomeRepo)

	// --- Router ---
	router := buildRouter(cfg, authSvc, authHandler, accountHandler, snapshotHandler, incomeHandler, dashboardHandler, exportHandler)

	// --- HTTP Server ---
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		return fmt.Errorf("server error: %w", err)
	case sig := <-quit:
		log.Printf("received signal %v, shutting down gracefully...", sig)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	log.Println("server stopped")
	return nil
}

func buildRouter(
	cfg *config.Config,
	authSvc *services.AuthService,
	authHandler *handlers.AuthHandler,
	accountHandler *handlers.AccountHandler,
	snapshotHandler *handlers.SnapshotHandler,
	incomeHandler *handlers.IncomeHandler,
	dashboardHandler *handlers.DashboardHandler,
	exportHandler *handlers.ExportHandler,
) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS — self-hosted, allow all origins
	router.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:   []string{"Content-Disposition"},
		MaxAge:          12 * time.Hour,
	}))

	v1 := router.Group("/api/v1")

	// Health check (unauthenticated) — used by Kubernetes liveness/readiness probes.
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// --- Auth routes (public) ---
	auth := v1.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.GET("/me", middleware.Auth(authSvc), authHandler.Me)
		auth.POST("/change-password", middleware.Auth(authSvc), authHandler.ChangePassword)
	}

	// --- Protected routes ---
	protected := v1.Group("")
	protected.Use(middleware.Auth(authSvc))
	{
		// Accounts
		accounts := protected.Group("/accounts")
		{
			accounts.GET("", accountHandler.List)
			accounts.POST("", accountHandler.Create)
			accounts.PUT("/:id", accountHandler.Update)
			accounts.DELETE("/:id", accountHandler.Delete)
		}

		// Snapshots — /snapshots/history must be registered before /:id
		// to avoid Gin routing ambiguity.
		snapshots := protected.Group("/snapshots")
		{
			snapshots.GET("", snapshotHandler.List)
			snapshots.POST("", snapshotHandler.Create)
			snapshots.POST("/bulk", snapshotHandler.BulkUpsert)
			snapshots.GET("/history", snapshotHandler.History)
			snapshots.PUT("/:id", snapshotHandler.Update)
		}

		// Income
		income := protected.Group("/income")
		{
			income.GET("", incomeHandler.List)
			income.POST("", incomeHandler.Create)
			income.PUT("/:id", incomeHandler.Update)
		}

		// Dashboard
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/summary", dashboardHandler.Summary)
			dashboard.GET("/savings-rate", dashboardHandler.SavingsRateHistory)
		}

		// Export
		export := protected.Group("/export")
		{
			export.GET("/json", exportHandler.ExportJSON)
			export.GET("/csv", exportHandler.ExportCSV)
		}
	}

	return router
}
