-- migrate:up
-- Expand only: existing JSON, timestamps, rows, and foreign keys remain intact.
-- A later migration will backfill and cut over reads/writes after production
-- verification; this migration is intentionally safe to roll back.
ALTER TABLE steps ADD COLUMN scheduled_start_at INTEGER;
ALTER TABLE steps ADD COLUMN scheduled_end_at INTEGER;
ALTER TABLE steps ADD COLUMN time_unspecified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE steps ADD COLUMN sort_order REAL;
ALTER TABLE steps ADD COLUMN pin_latitude REAL;
ALTER TABLE steps ADD COLUMN pin_longitude REAL;
ALTER TABLE steps ADD COLUMN is_priority INTEGER NOT NULL DEFAULT 0;

ALTER TABLE itineraries ADD COLUMN memo_text TEXT;
ALTER TABLE steps ADD COLUMN notes_text TEXT;

CREATE INDEX idx_steps_scheduled_start_at ON steps(itinerary_id, scheduled_start_at);
CREATE INDEX idx_steps_scheduled_end_at ON steps(itinerary_id, scheduled_end_at);
CREATE INDEX idx_steps_sort_order ON steps(itinerary_id, sort_order);

-- SQLite cannot ADD a table CHECK constraint. These triggers provide the same
-- database-level invariant while leaving the existing table untouched.
CREATE TRIGGER validate_steps_scheduled_state_insert
BEFORE INSERT ON steps
WHEN NOT (
  (NEW.scheduled_start_at IS NULL AND NEW.scheduled_end_at IS NULL)
  OR (
    NEW.scheduled_start_at IS NOT NULL
    AND NEW.scheduled_end_at IS NOT NULL
    AND NEW.scheduled_end_at >= NEW.scheduled_start_at
  )
)
OR NOT (
  (NEW.pin_latitude IS NULL AND NEW.pin_longitude IS NULL)
  OR (NEW.pin_latitude IS NOT NULL AND NEW.pin_longitude IS NOT NULL)
)
OR (NEW.time_unspecified = 1 AND NEW.scheduled_start_at IS NULL)
OR (NEW.time_unspecified = 1 AND NEW.is_all_day = 1)
BEGIN
  SELECT RAISE(ABORT, 'invalid normalized step state');
END;

CREATE TRIGGER validate_steps_scheduled_state_update
BEFORE UPDATE OF scheduled_start_at, scheduled_end_at, time_unspecified,
  pin_latitude, pin_longitude, is_priority, is_all_day ON steps
WHEN NOT (
  (NEW.scheduled_start_at IS NULL AND NEW.scheduled_end_at IS NULL)
  OR (
    NEW.scheduled_start_at IS NOT NULL
    AND NEW.scheduled_end_at IS NOT NULL
    AND NEW.scheduled_end_at >= NEW.scheduled_start_at
  )
)
OR NOT (
  (NEW.pin_latitude IS NULL AND NEW.pin_longitude IS NULL)
  OR (NEW.pin_latitude IS NOT NULL AND NEW.pin_longitude IS NOT NULL)
)
OR (NEW.time_unspecified = 1 AND NEW.scheduled_start_at IS NULL)
OR (NEW.time_unspecified = 1 AND NEW.is_all_day = 1)
BEGIN
  SELECT RAISE(ABORT, 'invalid normalized step state');
END;

-- migrate:down
DROP TRIGGER IF EXISTS validate_steps_scheduled_state_update;
DROP TRIGGER IF EXISTS validate_steps_scheduled_state_insert;
DROP INDEX IF EXISTS idx_steps_sort_order;
DROP INDEX IF EXISTS idx_steps_scheduled_end_at;
DROP INDEX IF EXISTS idx_steps_scheduled_start_at;
