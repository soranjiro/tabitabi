-- Convert start_at and end_at from TEXT (ISO format) to INTEGER (Unix timestamp in milliseconds)
-- Existing data stored as 'YYYY-MM-DDTHH:MM:SS' (UTC) will be converted to Unix ms

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- First, create a new table with the correct schema
CREATE TABLE steps_new (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- Migrate data: convert ISO string to Unix timestamp (milliseconds)
-- The existing format is 'YYYY-MM-DDTHH:MM:SS' without timezone (assumed UTC)
INSERT INTO steps_new (id, itinerary_id, title, start_at, end_at, location, notes, created_at, updated_at)
SELECT
  id,
  itinerary_id,
  title,
  CAST((strftime('%s', replace(start_at, 'T', ' ')) * 1000) AS INTEGER),
  CAST((strftime('%s', replace(end_at, 'T', ' ')) * 1000) AS INTEGER),
  location,
  notes,
  created_at,
  updated_at
FROM steps;

-- Drop old table and rename new one
DROP TABLE steps;
ALTER TABLE steps_new RENAME TO steps;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_steps_start_at ON steps(itinerary_id, start_at);
CREATE INDEX IF NOT EXISTS idx_steps_end_at ON steps(itinerary_id, end_at);
