-- migrate:up
ALTER TABLE itineraries ADD COLUMN packing_enabled INTEGER NOT NULL DEFAULT 1 CHECK(packing_enabled IN (0, 1));
ALTER TABLE itineraries ADD COLUMN prefecture_slugs TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(prefecture_slugs));
ALTER TABLE itineraries ADD COLUMN areas TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(areas));
ALTER TABLE itineraries ADD COLUMN tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags));
ALTER TABLE itineraries ADD COLUMN metadata_initialized INTEGER NOT NULL DEFAULT 1 CHECK(metadata_initialized IN (0, 1));

-- Move the most recently edited account metadata onto the itinerary itself.
UPDATE itineraries
SET
  prefecture_slugs = COALESCE((
    SELECT bookmark.prefecture_slugs FROM user_bookmarks bookmark
    WHERE bookmark.itinerary_id = itineraries.id
    ORDER BY bookmark.updated_at DESC LIMIT 1
  ), '[]'),
  areas = COALESCE((
    SELECT bookmark.areas FROM user_bookmarks bookmark
    WHERE bookmark.itinerary_id = itineraries.id
    ORDER BY bookmark.updated_at DESC LIMIT 1
  ), '[]'),
  tags = COALESCE((
    SELECT bookmark.tags FROM user_bookmarks bookmark
    WHERE bookmark.itinerary_id = itineraries.id
    ORDER BY bookmark.updated_at DESC LIMIT 1
  ), '[]');

-- migrate:down
-- D1/SQLite compatibility: additive columns are retained on rollback.
