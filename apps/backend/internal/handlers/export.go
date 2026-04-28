package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
)

// ExportHandler handles data export requests.
type ExportHandler struct {
	accounts  *repository.AccountRepository
	snapshots *repository.SnapshotRepository
	income    *repository.IncomeRepository
}

// NewExportHandler constructs an ExportHandler.
func NewExportHandler(
	accounts *repository.AccountRepository,
	snapshots *repository.SnapshotRepository,
	income *repository.IncomeRepository,
) *ExportHandler {
	return &ExportHandler{
		accounts:  accounts,
		snapshots: snapshots,
		income:    income,
	}
}

// exportPayload is the full data export structure.
type exportPayload struct {
	ExportedAt time.Time                `json:"exported_at"`
	Accounts   []models.Account         `json:"accounts"`
	Snapshots  []models.BalanceSnapshot `json:"snapshots"`
	Income     []models.IncomeEntry     `json:"income"`
}

// ExportJSON handles GET /export/json.
func (h *ExportHandler) ExportJSON(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	ctx := c.Request.Context()

	accounts, err := h.accounts.ListByUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export accounts"})
		return
	}
	snapshots, err := h.snapshots.AllSnapshotsForUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export snapshots"})
		return
	}
	income, err := h.income.AllForUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export income"})
		return
	}

	if accounts == nil {
		accounts = []models.Account{}
	}
	if snapshots == nil {
		snapshots = []models.BalanceSnapshot{}
	}
	if income == nil {
		income = []models.IncomeEntry{}
	}

	payload := exportPayload{
		ExportedAt: time.Now().UTC(),
		Accounts:   accounts,
		Snapshots:  snapshots,
		Income:     income,
	}

	filename := fmt.Sprintf("stackr-export-%s.json", time.Now().Format("2006-01-02"))
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", "application/json")

	enc := json.NewEncoder(c.Writer)
	enc.SetIndent("", "  ")
	if err := enc.Encode(payload); err != nil {
		// Headers already sent; nothing more we can do.
		return
	}
}

// ExportCSV handles GET /export/csv.
// It produces a ZIP-like multi-sheet representation by writing three CSV blocks
// separated by blank lines and section headers.
func (h *ExportHandler) ExportCSV(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	ctx := c.Request.Context()

	accounts, err := h.accounts.ListByUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export accounts"})
		return
	}
	snapshots, err := h.snapshots.AllSnapshotsForUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export snapshots"})
		return
	}
	income, err := h.income.AllForUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export income"})
		return
	}

	filename := fmt.Sprintf("stackr-export-%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	w := csv.NewWriter(c.Writer)

	// --- Accounts ---
	_ = w.Write([]string{"# ACCOUNTS"})
	_ = w.Write([]string{"id", "name", "type", "institution", "currency", "color", "is_active", "notes", "created_at"})
	for _, a := range accounts {
		_ = w.Write([]string{
			a.ID, a.Name, string(a.Type), a.Institution,
			a.Currency, a.Color, strconv.FormatBool(a.IsActive),
			a.Notes, a.CreatedAt.Format(time.RFC3339),
		})
	}
	_ = w.Write([]string{})

	// --- Balance Snapshots ---
	_ = w.Write([]string{"# BALANCE SNAPSHOTS"})
	_ = w.Write([]string{"id", "account_id", "year", "month", "balance_rappen", "updated_at"})
	for _, s := range snapshots {
		_ = w.Write([]string{
			s.ID, s.AccountID,
			strconv.Itoa(s.Year), strconv.Itoa(s.Month),
			strconv.FormatInt(s.Balance, 10),
			s.UpdatedAt.Format(time.RFC3339),
		})
	}
	_ = w.Write([]string{})

	// --- Income Entries ---
	_ = w.Write([]string{"# INCOME ENTRIES"})
	_ = w.Write([]string{"id", "year", "month", "gross_income_rappen", "net_income_rappen", "notes", "created_at"})
	for _, e := range income {
		_ = w.Write([]string{
			e.ID,
			strconv.Itoa(e.Year), strconv.Itoa(e.Month),
			strconv.FormatInt(e.GrossIncome, 10),
			strconv.FormatInt(e.NetIncome, 10),
			e.Notes,
			e.CreatedAt.Format(time.RFC3339),
		})
	}

	w.Flush()
}
