package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/dk/stackr/internal/middleware"
	"github.com/dk/stackr/internal/models"
	"github.com/dk/stackr/internal/repository"
)

// DashboardHandler handles HTTP requests for dashboard aggregation endpoints.
type DashboardHandler struct {
	accounts  *repository.AccountRepository
	snapshots *repository.SnapshotRepository
	income    *repository.IncomeRepository
}

// NewDashboardHandler constructs a DashboardHandler.
func NewDashboardHandler(
	accounts *repository.AccountRepository,
	snapshots *repository.SnapshotRepository,
	income *repository.IncomeRepository,
) *DashboardHandler {
	return &DashboardHandler{
		accounts:  accounts,
		snapshots: snapshots,
		income:    income,
	}
}

// netWorthPoint holds net worth for a specific month.
type netWorthPoint struct {
	Year     int   `json:"year"`
	Month    int   `json:"month"`
	NetWorth int64 `json:"net_worth"`
}

// allocationEntry describes the asset allocation for an account type.
type allocationEntry struct {
	Type       models.AccountType `json:"type"`
	Balance    int64              `json:"balance"`
	Percentage float64            `json:"percentage"`
}

// dashboardSummaryResponse is the full dashboard payload.
type dashboardSummaryResponse struct {
	CurrentNetWorth          int64             `json:"current_net_worth"`
	PreviousNetWorth         int64             `json:"previous_net_worth"`
	MoMChangeAbsolute        int64             `json:"mom_change_absolute"`
	MoMChangePercent         float64           `json:"mom_change_percent"`
	CurrentMonthSavingsRate  float64           `json:"current_month_savings_rate"`
	Trailing3MSavingsRate    float64           `json:"trailing_3m_savings_rate"`
	Trailing6MSavingsRate    float64           `json:"trailing_6m_savings_rate"`
	Trailing12MSavingsRate   float64           `json:"trailing_12m_savings_rate"`
	FireNumber               int64             `json:"fire_number"`
	NetWorthHistory          []netWorthPoint   `json:"net_worth_history"`
	Allocation               []allocationEntry `json:"allocation"`
	CurrentYear              int               `json:"current_year"`
	CurrentMonth             int               `json:"current_month"`
	HasCurrentMonthEntry     bool              `json:"has_current_month_entry"`
}

// Summary handles GET /dashboard/summary.
func (h *DashboardHandler) Summary(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	ctx := c.Request.Context()

	now := time.Now()
	currentYear := now.Year()
	currentMonth := int(now.Month())

	prevYear, prevMonth := previousMonth(currentYear, currentMonth)

	// Fetch current and previous net worth.
	currentNW, err := h.snapshots.NetWorthForMonth(ctx, userID, currentYear, currentMonth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute net worth"})
		return
	}
	previousNW, err := h.snapshots.NetWorthForMonth(ctx, userID, prevYear, prevMonth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute previous net worth"})
		return
	}

	momAbsolute := currentNW - previousNW
	var momPercent float64
	if previousNW != 0 {
		momPercent = (float64(momAbsolute) / abs(float64(previousNW))) * 100
	}

	// Savings rates.
	currentSavingsRate := h.savingsRateForMonth(ctx, userID, currentYear, currentMonth)
	trailing3m := h.trailingSavingsRate(ctx, userID, currentYear, currentMonth, 3)
	trailing6m := h.trailingSavingsRate(ctx, userID, currentYear, currentMonth, 6)
	trailing12m := h.trailingSavingsRate(ctx, userID, currentYear, currentMonth, 12)

	// Net worth history: last 12 months.
	history := make([]netWorthPoint, 0, 12)
	for i := 11; i >= 0; i-- {
		y, m := monthsAgo(currentYear, currentMonth, i)
		nw, err := h.snapshots.NetWorthForMonth(ctx, userID, y, m)
		if err != nil {
			continue
		}
		history = append(history, netWorthPoint{Year: y, Month: m, NetWorth: nw})
	}

	// Asset allocation for current month.
	allocation, err := h.computeAllocation(ctx, userID, currentYear, currentMonth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute allocation"})
		return
	}

	// FIRE number estimate: annual expenses = net_income - savings_amount (trailing 12m avg).
	// Simplified: if we can't estimate expenses, use 25 * annual net income as upper bound.
	fireNumber := h.estimateFireNumber(ctx, userID, currentYear, currentMonth)

	// Check if current month has an income entry.
	hasCurrentMonthEntry := false
	_, incErr := h.income.GetByYearMonth(ctx, userID, currentYear, currentMonth)
	if incErr == nil {
		hasCurrentMonthEntry = true
	}

	resp := dashboardSummaryResponse{
		CurrentNetWorth:        currentNW,
		PreviousNetWorth:       previousNW,
		MoMChangeAbsolute:      momAbsolute,
		MoMChangePercent:       round2(momPercent),
		CurrentMonthSavingsRate: round2(currentSavingsRate),
		Trailing3MSavingsRate:  round2(trailing3m),
		Trailing6MSavingsRate:  round2(trailing6m),
		Trailing12MSavingsRate: round2(trailing12m),
		FireNumber:             fireNumber,
		NetWorthHistory:        history,
		Allocation:             allocation,
		CurrentYear:            currentYear,
		CurrentMonth:           currentMonth,
		HasCurrentMonthEntry:   hasCurrentMonthEntry,
	}

	c.JSON(http.StatusOK, resp)
}

// savingsRateForMonth returns the savings rate for a single month.
//
// In Switzerland salaries typically arrive on the 25th and most users record
// their balances on the 1st of the following month. That means the snapshot
// labelled "month M" actually contains the salary that arrived in month M-1.
// To keep numerator and denominator on the same period, the savings rate for
// month M is computed against the income recorded for month M-1:
//
//	savings_amount = net_worth(M) - net_worth(M-1)
//	savings_rate   = (savings_amount / net_income(M-1)) * 100
//
// Returns 0 if income data for the previous month is unavailable.
func (h *DashboardHandler) savingsRateForMonth(ctx context.Context, userID string, year, month int) float64 {
	prevYear, prevMonth := previousMonth(year, month)

	currentNW, err := h.snapshots.NetWorthForMonth(ctx, userID, year, month)
	if err != nil {
		return 0
	}
	previousNW, err := h.snapshots.NetWorthForMonth(ctx, userID, prevYear, prevMonth)
	if err != nil {
		return 0
	}

	incomeEntry, err := h.income.GetByYearMonth(ctx, userID, prevYear, prevMonth)
	if err != nil || incomeEntry.NetIncome == 0 {
		return 0
	}

	savings := currentNW - previousNW
	return (float64(savings) / float64(incomeEntry.NetIncome)) * 100
}

// trailingSavingsRate computes the average savings rate over the last n months.
func (h *DashboardHandler) trailingSavingsRate(ctx context.Context, userID string, year, month, months int) float64 {
	var totalRate float64
	count := 0

	for i := 0; i < months; i++ {
		y, m := monthsAgo(year, month, i)
		rate := h.savingsRateForMonth(ctx, userID, y, m)
		if rate != 0 {
			totalRate += rate
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return totalRate / float64(count)
}

// computeAllocation returns the asset allocation breakdown for the given month.
func (h *DashboardHandler) computeAllocation(ctx context.Context, userID string, year, month int) ([]allocationEntry, error) {
	snapshots, err := h.snapshots.ListByUser(ctx, userID, year, month)
	if err != nil {
		return nil, err
	}

	accounts, err := h.accounts.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build a map of account ID → type for O(1) lookup.
	accountTypeMap := make(map[string]models.AccountType, len(accounts))
	for _, a := range accounts {
		accountTypeMap[a.ID] = a.Type
	}

	// Sum balances per account type, converting each snapshot to CHF via the
	// rate captured at save time. This keeps multi-currency portfolios honest
	// in the allocation breakdown.
	typeBalances := make(map[models.AccountType]int64)
	var totalAbsolute int64
	for _, s := range snapshots {
		aType, ok := accountTypeMap[s.AccountID]
		if !ok {
			continue
		}
		chf := int64(float64(s.Balance)*s.ExchangeRate + 0.5)
		typeBalances[aType] += chf
		totalAbsolute += chf
	}

	result := make([]allocationEntry, 0, len(typeBalances))
	for aType, balance := range typeBalances {
		var pct float64
		if totalAbsolute != 0 {
			pct = (float64(balance) / float64(totalAbsolute)) * 100
		}
		result = append(result, allocationEntry{
			Type:       aType,
			Balance:    balance,
			Percentage: round2(pct),
		})
	}

	return result, nil
}

// estimateFireNumber estimates the FIRE number based on average annual expenses.
// Annual expenses are estimated as: annual_net_income - (net_worth_change_over_year).
// FIRE number = annual_expenses * 25.
// Returns 0 if insufficient data.
func (h *DashboardHandler) estimateFireNumber(ctx context.Context, userID string, year, month int) int64 {
	// Collect up to 12 months of income to estimate annual net income.
	entries, err := h.income.RecentEntries(ctx, userID, 12)
	if err != nil || len(entries) == 0 {
		return 0
	}

	var totalNetIncome int64
	for _, e := range entries {
		totalNetIncome += e.NetIncome
	}

	// Scale to annual if fewer than 12 months.
	annualNetIncome := totalNetIncome * 12 / int64(len(entries))

	// Estimate annual savings as net worth change over the available history.
	oldYear, oldMonth := monthsAgo(year, month, len(entries)-1)
	oldNW, err := h.snapshots.NetWorthForMonth(ctx, userID, oldYear, oldMonth)
	if err != nil {
		return 0
	}
	currentNW, err := h.snapshots.NetWorthForMonth(ctx, userID, year, month)
	if err != nil {
		return 0
	}

	annualSavings := (currentNW - oldNW) * 12 / int64(len(entries))
	annualExpenses := annualNetIncome - annualSavings

	if annualExpenses <= 0 {
		return 0
	}
	return annualExpenses * 25
}

// SavingsRateHistory handles GET /dashboard/savings-rate?months=12
func (h *DashboardHandler) SavingsRateHistory(c *gin.Context) {
	userID := middleware.UserIDFromContext(c)
	ctx := c.Request.Context()

	months := queryInt(c, "months")
	if months <= 0 || months > 120 {
		months = 12
	}

	now := time.Now()
	currentYear := now.Year()
	currentMonth := int(now.Month())

	type savingsRatePoint struct {
		Year        int     `json:"year"`
		Month       int     `json:"month"`
		SavingsRate float64 `json:"savings_rate"`
		HasIncome   bool    `json:"has_income"`
	}

	result := make([]savingsRatePoint, 0, months)
	for i := months - 1; i >= 0; i-- {
		y, m := monthsAgo(currentYear, currentMonth, i)
		rate := h.savingsRateForMonth(ctx, userID, y, m)

		_, incErr := h.income.GetByYearMonth(ctx, userID, y, m)
		hasIncome := incErr == nil

		result = append(result, savingsRatePoint{
			Year:        y,
			Month:       m,
			SavingsRate: round2(rate),
			HasIncome:   hasIncome,
		})
	}

	c.JSON(http.StatusOK, result)
}

// previousMonth returns the year and month immediately before the given one.
func previousMonth(year, month int) (int, int) {
	if month == 1 {
		return year - 1, 12
	}
	return year, month - 1
}

// monthsAgo returns the year and month that is n months before the given one.
func monthsAgo(year, month, n int) (int, int) {
	total := (year*12 + month - 1) - n
	y := total / 12
	m := total%12 + 1
	return y, m
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

func round2(f float64) float64 {
	return float64(int(f*100+0.5)) / 100
}
