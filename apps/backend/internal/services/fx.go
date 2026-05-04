// Package services provides foreign exchange rate lookups against the
// Frankfurter API (frankfurter.dev). Rates are sourced from the European
// Central Bank, free of charge, and cached per (from, to, year, month) so
// that re-saving a month does not re-issue a network call.
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// FXService fetches and caches currency exchange rates.
type FXService struct {
	client *http.Client
	mu     sync.RWMutex
	cache  map[string]float64
}

// NewFXService constructs an FXService with sensible defaults.
func NewFXService() *FXService {
	return &FXService{
		client: &http.Client{Timeout: 5 * time.Second},
		cache:  make(map[string]float64),
	}
}

// GetRate returns the conversion rate for one unit of `from` currency in `to`
// currency, as it was at the end of the given (year, month). If the requested
// month is the current month, the latest available rate is returned.
//
// The function never errors out for same-currency conversions and short-circuits
// to 1.0 in that case. On API failure the caller may choose to fall back to a
// last-known rate or to 1.0 — the service does not enforce that policy.
func (s *FXService) GetRate(ctx context.Context, from, to string, year, month int) (float64, error) {
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))
	if from == "" || to == "" || from == to {
		return 1.0, nil
	}

	key := fmt.Sprintf("%s:%s:%d-%02d", from, to, year, month)

	s.mu.RLock()
	if r, ok := s.cache[key]; ok {
		s.mu.RUnlock()
		return r, nil
	}
	s.mu.RUnlock()

	url := s.buildURL(from, to, year, month)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, fmt.Errorf("build fx request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("fx api request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("fx api returned status %d", resp.StatusCode)
	}

	var body struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, fmt.Errorf("decode fx response: %w", err)
	}

	rate, ok := body.Rates[to]
	if !ok || rate == 0 {
		return 0, fmt.Errorf("rate %s→%s not available", from, to)
	}

	s.mu.Lock()
	s.cache[key] = rate
	s.mu.Unlock()

	return rate, nil
}

// buildURL returns the Frankfurter endpoint for the requested period. For the
// current month we ask for the latest rate; for past months we anchor on the
// last day of that month so different runs of the same save produce stable rates.
func (s *FXService) buildURL(from, to string, year, month int) string {
	now := time.Now().UTC()
	if year == now.Year() && month == int(now.Month()) {
		return fmt.Sprintf("https://api.frankfurter.dev/v1/latest?base=%s&symbols=%s", from, to)
	}
	// First day of next month minus one day = last day of target month.
	endOfMonth := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	return fmt.Sprintf("https://api.frankfurter.dev/v1/%s?base=%s&symbols=%s",
		endOfMonth.Format("2006-01-02"), from, to)
}
