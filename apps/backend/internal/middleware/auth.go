package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/services"
)

const (
	// ContextKeyUserID is the Gin context key for the authenticated user's ID.
	ContextKeyUserID = "userID"
	// ContextKeyEmail is the Gin context key for the authenticated user's email.
	ContextKeyEmail = "email"
)

// Auth returns a Gin middleware that validates the JWT in the Authorization header.
// On success it stores the user ID and email in the request context.
// On failure it aborts with 401 Unauthorized.
func Auth(authSvc *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header must be Bearer <token>"})
			return
		}

		claims, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyEmail, claims.Email)
		c.Next()
	}
}

// UserIDFromContext extracts the authenticated user ID from the Gin context.
// It returns an empty string if the value is not present (should not happen on protected routes).
func UserIDFromContext(c *gin.Context) string {
	id, _ := c.Get(ContextKeyUserID)
	userID, _ := id.(string)
	return userID
}
