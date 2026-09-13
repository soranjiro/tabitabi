-- migrate:up
CREATE TABLE official_itinerary_aliases (
  alias TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_itinerary_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- migrate:down
DROP TABLE IF EXISTS official_itinerary_aliases;
