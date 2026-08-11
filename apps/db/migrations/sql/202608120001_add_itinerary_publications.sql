-- migrate:up
CREATE TABLE IF NOT EXISTS itinerary_publications (
  source_itinerary_id TEXT NOT NULL,
  shared_itinerary_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  prefecture_slugs TEXT NOT NULL CHECK(json_valid(prefecture_slugs)),
  areas TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(areas)),
  tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags)),
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (source_itinerary_id, user_id),
  FOREIGN KEY (source_itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_itinerary_publications_user
  ON itinerary_publications(user_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_itinerary_publications_published
  ON itinerary_publications(published_at DESC);

-- migrate:down
DROP INDEX IF EXISTS idx_itinerary_publications_published;
DROP INDEX IF EXISTS idx_itinerary_publications_user;
DROP TABLE IF EXISTS itinerary_publications;
