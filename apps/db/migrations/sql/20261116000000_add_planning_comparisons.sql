-- migrate:up
-- Comparison groups are planning-only data, independent from published itinerary steps.
CREATE TABLE itinerary_comparison_groups (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  kind TEXT NOT NULL CHECK(kind IN ('flight', 'stay', 'transport', 'other')),
  options_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(options_json)),
  selected_option_id TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);
CREATE INDEX idx_itinerary_comparison_groups_itinerary
  ON itinerary_comparison_groups(itinerary_id, created_at);

-- migrate:down
DROP INDEX IF EXISTS idx_itinerary_comparison_groups_itinerary;
DROP TABLE IF EXISTS itinerary_comparison_groups;
