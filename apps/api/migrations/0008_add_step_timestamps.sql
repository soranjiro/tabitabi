-- Add start_at and end_at columns to steps table
-- Migrate existing date/time data to new timestamp columns

-- Add new columns (nullable initially for migration)
ALTER TABLE steps ADD COLUMN start_at TEXT;
ALTER TABLE steps ADD COLUMN end_at TEXT;

-- Migrate existing data: combine date and time into ISO 8601 timestamp
-- end_at defaults to 1 hour after start_at
-- Assume existing `date`/`time` values are in JST (UTC+9).
-- Convert to UTC and store as an ISO-like timestamp without timezone suffix
-- Format stored: YYYY-MM-DDTHH:MM:SS (UTC time, no trailing Z) to remain compatible with existing queries
UPDATE steps
SET
  start_at = replace(substr(datetime(date || ' ' || time, '-9 hours'), 1, 19), ' ', 'T'),
  end_at = replace(substr(datetime(date || ' ' || time, '+1 hour', '-9 hours'), 1, 19), ' ', 'T');

-- Create index on new timestamp columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_steps_start_at ON steps(itinerary_id, start_at);
CREATE INDEX IF NOT EXISTS idx_steps_end_at ON steps(itinerary_id, end_at);
