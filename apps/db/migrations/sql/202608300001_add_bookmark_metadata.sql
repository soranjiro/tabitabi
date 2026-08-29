-- migrate:up
ALTER TABLE user_bookmarks ADD COLUMN prefecture_slugs TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(prefecture_slugs));
ALTER TABLE user_bookmarks ADD COLUMN areas TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(areas));
ALTER TABLE user_bookmarks ADD COLUMN tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags));

-- Preserve the metadata that was previously stored only for published itineraries.
UPDATE user_bookmarks
SET
  prefecture_slugs = COALESCE((
    SELECT prefecture_slugs FROM itinerary_publications publication
    WHERE publication.user_id = user_bookmarks.user_id
      AND publication.source_itinerary_id = user_bookmarks.itinerary_id
  ), '[]'),
  areas = COALESCE((
    SELECT areas FROM itinerary_publications publication
    WHERE publication.user_id = user_bookmarks.user_id
      AND publication.source_itinerary_id = user_bookmarks.itinerary_id
  ), '[]'),
  tags = COALESCE((
    SELECT tags FROM itinerary_publications publication
    WHERE publication.user_id = user_bookmarks.user_id
      AND publication.source_itinerary_id = user_bookmarks.itinerary_id
  ), '[]');

-- migrate:down
-- SQLite does not support DROP COLUMN on all supported D1 versions. These columns
-- are intentionally retained when rolling back this migration.
