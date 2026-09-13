-- migrate:up
CREATE TABLE official_itinerary_aliases (
  alias TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  FOREIGN KEY (itinerary_id)
    REFERENCES itineraries(id)
    ON DELETE CASCADE
);

-- migrate:down
DROP TABLE IF EXISTS official_itinerary_aliases;
