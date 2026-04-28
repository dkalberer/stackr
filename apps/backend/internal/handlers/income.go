package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
)

// IncomeHandler handles HTTP requests for income entry resources.
type IncomeHandler struct {
	income *repository.IncomeRepository
}

// NewIncomeHandler constructs an IncomeHandler.
func NewIncomeHandler(income *repository.IncomeRepository) *IncomeHandler {
	return &IncomeHandler{income: income}
}

type createIncomeRequest struct {
	Year        int    `json:"year"`
	Month       int    `json:"month"`
	GrossIncome int64  `json:"gross_income"`
	NetIncome   int64  `json:"net_income"`
	Notes       string `json:"notes"`
}

type updateIncomeRequest struct {
	GrossIncome int64  `json:"gross_income"`
	NetIncome   int64  `json:"net_income"`
	Notes       string `json:"notes"`
}

// List handles GET /income?year=&month=
func (h *IncomeHandler) List(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	year := queryInt(c, "year")
	month := queryInt(c, "month")

	entries, err := h.income.ListByUser(c.Request.Context(), userID, year, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list income entries"})
		return
	}
	if entries == nil {
		entries = []models.IncomeEntry{}
	}
	c.JSON(http.StatusOK, entries)
}

// Create handles POST /income.
func (h *IncomeHandler) Create(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	var req createIncomeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
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
	if req.GrossIncome < 0 || req.NetIncome < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "income values must be non-negative"})
		return
	}

	entry := &models.IncomeEntry{
		UserID:      userID,
		Year:        req.Year,
		Month:       req.Month,
		GrossIncome: req.GrossIncome,
		NetIncome:   req.NetIncome,
		Notes:       req.Notes,
	}

	created, err := h.income.Upsert(c.Request.Context(), entry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save income entry"})
		return
	}

	c.JSON(http.StatusOK, created)
}

// Update handles PUT /income/:id.
func (h *IncomeHandler) Update(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	entryID := c.Param("id")

	existing, err := h.income.GetByID(c.Request.Context(), entryID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "income entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch income entry"})
		return
	}

	var req updateIncomeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.GrossIncome < 0 || req.NetIncome < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "income values must be non-negative"})
		return
	}

	entry := &models.IncomeEntry{
		ID:          existing.ID,
		UserID:      userID,
		GrossIncome: req.GrossIncome,
		NetIncome:   req.NetIncome,
		Notes:       req.Notes,
	}

	updated, err := h.income.Update(c.Request.Context(), entry)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "income entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update income entry"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
