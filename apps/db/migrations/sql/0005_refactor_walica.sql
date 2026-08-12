-- Migration: Refactor Walica to separate table
-- Date: 2025-11-24

CREATE TABLE itinerary_walica_settings (
  itinerary_id TEXT PRIMARY KEY,
  walica_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- Migrate existing data
INSERT INTO itinerary_walica_settings (itinerary_id, walica_id, created_at, updated_at)
SELECT id, walica_id, created_at, updated_at
FROM itineraries
WHERE walica_id IS NOT NULL;

-- Drop column from itineraries
ALTER TABLE itineraries DROP COLUMN walica_id;
