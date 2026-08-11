-- Track fork count in a separate table per database convention
-- (itineraries table stays minimal; derived metrics go in dedicated tables)
CREATE TABLE IF NOT EXISTS itinerary_fork_stats (
  itinerary_id TEXT PRIMARY KEY,
  fork_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);
