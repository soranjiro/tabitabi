-- migrate:up
-- Stable source identity lets publish/restore update matching steps without
-- deleting private-only steps. Existing rows and columns remain untouched.
ALTER TABLE steps ADD COLUMN source_step_id TEXT;
CREATE INDEX idx_steps_source_step_id ON steps(itinerary_id, source_step_id);

-- migrate:down
DROP INDEX IF EXISTS idx_steps_source_step_id;
-- The additive column is intentionally retained to avoid losing identities
-- written by a newer application during rollback.
