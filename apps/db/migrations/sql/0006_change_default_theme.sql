-- Migration: Change default theme to standard-autumn
-- Date: 2025-12-12

PRAGMA foreign_keys=off;

-- 1. Create new table with updated default value
CREATE TABLE itineraries_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  memo TEXT,
  password TEXT
);

-- 2. Copy data from old table
INSERT INTO itineraries_new (id, title, theme_id, created_at, updated_at, memo, password)
SELECT id, title, theme_id, created_at, updated_at, memo, password FROM itineraries;

-- 3. Drop old table
DROP TABLE itineraries;

-- 4. Rename new table to original name
ALTER TABLE itineraries_new RENAME TO itineraries;

PRAGMA foreign_keys=on;
