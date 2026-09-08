-- migrate:up
CREATE TABLE itinerary_publications_next (
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
INSERT INTO itinerary_publications_next (
  source_itinerary_id, shared_itinerary_id, user_id,
  prefecture_slugs, areas, tags, published_at, updated_at
)
SELECT source_itinerary_id, shared_itinerary_id, user_id,
  prefecture_slugs, areas, tags, published_at, updated_at
FROM itinerary_publications;
DROP TABLE itinerary_publications;
ALTER TABLE itinerary_publications_next RENAME TO itinerary_publications;
CREATE INDEX idx_itinerary_publications_user ON itinerary_publications(user_id, published_at DESC);
CREATE INDEX idx_itinerary_publications_published ON itinerary_publications(published_at DESC);
CREATE UNIQUE INDEX idx_publications_shared_id ON itinerary_publications(shared_itinerary_id);


-- migrate:down
