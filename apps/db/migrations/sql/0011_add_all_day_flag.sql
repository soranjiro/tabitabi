-- Add is_all_day flag to steps table
-- This flag indicates whether the step spans the entire day
ALTER TABLE steps ADD COLUMN is_all_day INTEGER NOT NULL DEFAULT 0;
