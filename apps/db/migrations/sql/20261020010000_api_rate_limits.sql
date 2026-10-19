-- migrate:up
-- Atomic fixed-window budgets shared by all API Workers and Pages instances.
CREATE TABLE api_rate_limit_counters (
  bucket_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0)
);
CREATE INDEX idx_api_rate_limits_window ON api_rate_limit_counters(window_start);

-- migrate:down
-- Retain counters during rollback to prevent an accidental temporary bypass.
