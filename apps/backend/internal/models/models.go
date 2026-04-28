package models

import "time"

// AccountType represents the category of a financial account.
type AccountType string

const (
	AccountTypeBankAccount     AccountType = "BANK_ACCOUNT"
	AccountTypeSavingsAccount  AccountType = "SAVINGS_ACCOUNT"
	AccountTypePillar3A        AccountType = "PILLAR_3A"
	AccountTypeInvestmentDepot AccountType = "INVESTMENT_DEPOT"
	AccountTypeCrypto          AccountType = "CRYPTO"
	AccountTypeRealEstate      AccountType = "REAL_ESTATE"
	AccountTypeLiability       AccountType = "LIABILITY"
	AccountTypeOther           AccountType = "OTHER"
)

// IsValid reports whether the account type is one of the defined constants.
func (a AccountType) IsValid() bool {
	switch a {
	case AccountTypeBankAccount, AccountTypeSavingsAccount, AccountTypePillar3A,
		AccountTypeInvestmentDepot, AccountTypeCrypto, AccountTypeRealEstate,
		AccountTypeLiability, AccountTypeOther:
		return true
	}
	return false
}

// IsLiability reports whether the account type represents a liability.
// Liabilities are stored as positive values but contribute negatively to net worth.
func (a AccountType) IsLiability() bool {
	return a == AccountTypeLiability
}

// User is a registered application user.
type User struct {
	ID           string    `json:"id"         db:"id"`
	Email        string    `json:"email"      db:"email"`
	PasswordHash string    `json:"-"          db:"password_hash"`
	Name         string    `json:"name"       db:"name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// Account is a financial account owned by a user.
type Account struct {
	ID          string      `json:"id"          db:"id"`
	UserID      string      `json:"user_id"     db:"user_id"`
	Name        string      `json:"name"        db:"name"`
	Type        AccountType `json:"type"        db:"type"`
	Institution string      `json:"institution" db:"institution"`
	Currency    string      `json:"currency"    db:"currency"`
	Color       string      `json:"color"       db:"color"`
	IsActive    bool        `json:"is_active"   db:"is_active"`
	Notes       string      `json:"notes"       db:"notes"`
	CreatedAt   time.Time   `json:"created_at"  db:"created_at"`
}

// BalanceSnapshot captures the balance of an account for a specific month.
// Balance is stored in the smallest currency unit (Rappen for CHF, cents for EUR/USD).
type BalanceSnapshot struct {
	ID        string    `json:"id"         db:"id"`
	AccountID string    `json:"account_id" db:"account_id"`
	Year      int       `json:"year"       db:"year"`
	Month     int       `json:"month"      db:"month"`
	Balance   int64     `json:"balance"    db:"balance"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// IncomeEntry records gross and net income for a specific month.
// All monetary values are in Rappen (CHF * 100).
type IncomeEntry struct {
	ID          string    `json:"id"           db:"id"`
	UserID      string    `json:"user_id"      db:"user_id"`
	Year        int       `json:"year"         db:"year"`
	Month       int       `json:"month"        db:"month"`
	GrossIncome int64     `json:"gross_income" db:"gross_income"`
	NetIncome   int64     `json:"net_income"   db:"net_income"`
	Notes       string    `json:"notes"        db:"notes"`
	CreatedAt   time.Time `json:"created_at"   db:"created_at"`
}
