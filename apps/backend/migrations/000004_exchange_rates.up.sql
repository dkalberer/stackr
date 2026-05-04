SET search_path = stackr;

-- Add exchange rate to balance snapshots so we can preserve the rate at the
-- moment of capture and convert balances to the base currency (CHF) for
-- aggregate views like the dashboard and allocation breakdown.
--
-- Existing rows default to 1.0, which matches the previous behaviour where
-- all balances were treated as already being in CHF.
ALTER TABLE balance_snapshots
    ADD COLUMN exchange_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0;
