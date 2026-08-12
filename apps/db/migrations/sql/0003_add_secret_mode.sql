-- Migration: Create itinerary_secrets table
-- Date: 2025-11-24

CREATE TABLE IF NOT EXISTS itinerary_secrets (
  itinerary_id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  offset_minutes INTEGER DEFAULT 60,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);
