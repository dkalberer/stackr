package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
)

// AccountHandler handles HTTP requests for account resources.
type AccountHandler struct {
	accounts *repository.AccountRepository
}

// NewAccountHandler constructs an AccountHandler.
func NewAccountHandler(accounts *repository.AccountRepository) *AccountHandler {
	return &AccountHandler{accounts: accounts}
}

type createAccountRequest struct {
	Name        string           `json:"name"`
	Type        models.AccountType `json:"type"`
	Institution string           `json:"institution"`
	Currency    string           `json:"currency"`
	Color       string           `json:"color"`
	IsActive    *bool            `json:"is_active"`
	Notes       string           `json:"notes"`
}

type updateAccountRequest struct {
	Name        string           `json:"name"`
	Type        models.AccountType `json:"type"`
	Institution string           `json:"institution"`
	Currency    string           `json:"currency"`
	Color       string           `json:"color"`
	IsActive    *bool            `json:"is_active"`
	Notes       string           `json:"notes"`
}

// List handles GET /accounts.
func (h *AccountHandler) List(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	accounts, err := h.accounts.ListByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list accounts"})
		return
	}
	if accounts == nil {
		accounts = []models.Account{}
	}
	c.JSON(http.StatusOK, accounts)
}

// Create handles POST /accounts.
func (h *AccountHandler) Create(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)

	var req createAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if !req.Type.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account type"})
		return
	}
	if req.Currency == "" {
		req.Currency = "CHF"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	account := &models.Account{
		UserID:      userID,
		Name:        req.Name,
		Type:        req.Type,
		Institution: req.Institution,
		Currency:    req.Currency,
		Color:       req.Color,
		IsActive:    isActive,
		Notes:       req.Notes,
	}

	created, err := h.accounts.Create(c.Request.Context(), account)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, created)
}

// Update handles PUT /accounts/:id.
func (h *AccountHandler) Update(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	accountID := c.Param("id")

	existing, err := h.accounts.GetByID(c.Request.Context(), accountID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch account"})
		return
	}

	var req updateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		req.Name = existing.Name
	}
	if req.Type != "" && !req.Type.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account type"})
		return
	}
	if req.Type == "" {
		req.Type = existing.Type
	}
	if req.Currency == "" {
		req.Currency = existing.Currency
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	account := &models.Account{
		ID:          accountID,
		UserID:      userID,
		Name:        req.Name,
		Type:        req.Type,
		Institution: req.Institution,
		Currency:    req.Currency,
		Color:       req.Color,
		IsActive:    isActive,
		Notes:       req.Notes,
	}

	updated, err := h.accounts.Update(c.Request.Context(), account)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update account"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// Delete handles DELETE /accounts/:id.
// It performs a real delete; the caller can use PUT to soft-delete by setting is_active=false.
func (h *AccountHandler) Delete(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	accountID := c.Param("id")

	if err := h.accounts.Delete(c.Request.Context(), accountID, userID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete account"})
		return
	}

	c.Status(http.StatusNoContent)
}
