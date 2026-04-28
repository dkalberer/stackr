package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
)

// SnapshotHandler handles HTTP requests for balance snapshot resources.
type SnapshotHandler struct {
	snapshots *repository.SnapshotRepository
}

// NewSnapshotHandler constructs a SnapshotHandler.
func NewSnapshotHandler(snapshots *repository.SnapshotRepository) *SnapshotHandler {
	return &SnapshotHandler{snapshots: snapshots}
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

	snapshot := &models.BalanceSnapshot{
		AccountID: req.AccountID,
		Year:      req.Year,
		Month:     req.Month,
		Balance:   req.Balance,
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

	results := make([]models.BalanceSnapshot, 0, len(req.Snapshots))
	for _, s := range req.Snapshots {
		if s.AccountID == "" || s.Year < 2000 || s.Year > 2100 || s.Month < 1 || s.Month > 12 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid snapshot entry"})
			return
		}
		created, err := h.snapshots.Upsert(c.Request.Context(), &models.BalanceSnapshot{
			AccountID: s.AccountID,
			Year:      s.Year,
			Month:     s.Month,
			Balance:   s.Balance,
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
