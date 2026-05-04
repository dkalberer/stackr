package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
	"github.com/dk/stackr/internal/services"
)

// SnapshotHandler handles HTTP requests for balance snapshot resources.
type SnapshotHandler struct {
	snapshots *repository.SnapshotRepository
	accounts  *repository.AccountRepository
	fx        *services.FXService
}

// NewSnapshotHandler constructs a SnapshotHandler.
func NewSnapshotHandler(
	snapshots *repository.SnapshotRepository,
	accounts *repository.AccountRepository,
	fx *services.FXService,
) *SnapshotHandler {
	return &SnapshotHandler{snapshots: snapshots, accounts: accounts, fx: fx}
}

// resolveRate returns the exchange rate from the account currency to CHF for
// the given year/month. CHF (or empty) returns 1.0 directly. If the FX lookup
// fails we log the failure and fall back to 1.0 so the save does not block;
// the user can re-save later to capture an accurate rate.
func (h *SnapshotHandler) resolveRate(ctx context.Context, currency string, year, month int) float64 {
	if currency == "" || currency == "CHF" {
		return 1.0
	}
	rate, err := h.fx.GetRate(ctx, currency, "CHF", year, month)
	if err != nil {
		log.Printf("fx lookup %s→CHF for %d-%02d failed: %v", currency, year, month, err)
		return 1.0
	}
	return rate
}

type createSnapshotRequest struct {
	AccountID string `json:"account_id"`
	Year      int    `json:"year"`
	Month     int    `json:"month"`
	Balance   int64  `json:"balance"`
}

type updateSnapshotRequest struct {
	Balance int64 `json:"balance"`
}

// List handles GET /snapshots?year=&month=
func (h *SnapshotHandler) List(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	year := queryInt(c, "year")
	month := queryInt(c, "month")

	snapshots, err := h.snapshots.ListByUser(c.Request.Context(), userID, year, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list snapshots"})
		return
	}
	if snapshots == nil {
		snapshots = []models.BalanceSnapshot{}
	}
	c.JSON(http.StatusOK, snapshots)
}

// Create handles POST /snapshots (upserts).
func (h *SnapshotHandler) Create(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	var req createSnapshotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.AccountID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "account_id is required"})
		return
	}
	if req.Year < 2000 || req.Year > 2100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "year must be between 2000 and 2100"})
		return
	}
	if req.Month < 1 || req.Month > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month must be between 1 and 12"})
		return
	}

	// Look up account so we can capture the FX rate for its currency.
	account, err := h.accounts.GetByID(c.Request.Context(), req.AccountID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch account"})
		return
	}

	snapshot := &models.BalanceSnapshot{
		AccountID:    req.AccountID,
		Year:         req.Year,
		Month:        req.Month,
		Balance:      req.Balance,
		ExchangeRate: h.resolveRate(c.Request.Context(), account.Currency, req.Year, req.Month),
	}

	created, err := h.snapshots.Upsert(c.Request.Context(), snapshot, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create snapshot"})
		return
	}

	c.JSON(http.StatusCreated, created)
}

// Update handles PUT /snapshots/:id.
func (h *SnapshotHandler) Update(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	snapshotID := c.Param("id")

	var req updateSnapshotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updated, err := h.snapshots.UpdateBalance(c.Request.Context(), snapshotID, userID, req.Balance)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "snapshot not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update snapshot"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

type bulkUpsertRequest struct {
	Snapshots []createSnapshotRequest `json:"snapshots"`
}

// BulkUpsert handles POST /snapshots/bulk — upserts multiple snapshots in one call.
func (h *SnapshotHandler) BulkUpsert(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	var req bulkUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if len(req.Snapshots) == 0 {
		c.JSON(http.StatusOK, []models.BalanceSnapshot{})
		return
	}

	// Pre-fetch the user's accounts so we can look up each snapshot's currency
	// and ownership in O(1) without re-querying for every entry.
	accounts, err := h.accounts.ListByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch accounts"})
		return
	}
	accountByID := make(map[string]*models.Account, len(accounts))
	for i := range accounts {
		accountByID[accounts[i].ID] = &accounts[i]
	}

	results := make([]models.BalanceSnapshot, 0, len(req.Snapshots))
	for _, s := range req.Snapshots {
		if s.AccountID == "" || s.Year < 2000 || s.Year > 2100 || s.Month < 1 || s.Month > 12 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid snapshot entry"})
			return
		}
		acc, ok := accountByID[s.AccountID]
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		created, err := h.snapshots.Upsert(c.Request.Context(), &models.BalanceSnapshot{
			AccountID:    s.AccountID,
			Year:         s.Year,
			Month:        s.Month,
			Balance:      s.Balance,
			ExchangeRate: h.resolveRate(c.Request.Context(), acc.Currency, s.Year, s.Month),
		}, userID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upsert snapshot"})
			return
		}
		results = append(results, *created)
	}

	c.JSON(http.StatusOK, results)
}

// History handles GET /snapshots/history?account_id=&from_year=&from_month=&to_year=&to_month=
func (h *SnapshotHandler) History(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	filter := repository.HistoryFilter{
		AccountID: c.Query("account_id"),
		FromYear:  queryInt(c, "from_year"),
		FromMonth: queryInt(c, "from_month"),
		ToYear:    queryInt(c, "to_year"),
		ToMonth:   queryInt(c, "to_month"),
	}

	snapshots, err := h.snapshots.ListHistory(c.Request.Context(), userID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list snapshot history"})
		return
	}
	if snapshots == nil {
		snapshots = []models.BalanceSnapshot{}
	}
	c.JSON(http.StatusOK, snapshots)
}

// queryInt parses an integer query parameter, returning 0 if absent or invalid.
func queryInt(c *gin.Context, key string) int {
	s := c.Query(key)
	if s == "" {
		return 0
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return v
}
