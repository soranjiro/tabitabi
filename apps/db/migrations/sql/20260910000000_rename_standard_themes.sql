-- migrate:up

-- Theme IDs now represent their layout rather than a seasonal color palette.
-- Keep palette_id untouched: it continues to carry the former seasonal color.
UPDATE itineraries
SET theme_id = CASE theme_id
  WHEN 'standard-spring' THEN 'daycard'
  WHEN 'standard-accordion' THEN 'accordion'
  WHEN 'standard-summer' THEN 'list'
  WHEN 'standard-autumn' THEN 'week'
  WHEN 'standard-winter' THEN 'month'
  ELSE theme_id
END
WHERE theme_id IN (
  'standard-spring', 'standard-accordion', 'standard-summer',
  'standard-autumn', 'standard-winter'
);

-- SQLite requires recreating the table to change a column default.
CREATE TABLE itineraries_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'daycard',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  memo TEXT,
  password TEXT,
  source_itinerary_id TEXT,
  packing_enabled INTEGER NOT NULL DEFAULT 1 CHECK(packing_enabled IN (0, 1)),
  prefecture_slugs TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(prefecture_slugs)),
  areas TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(areas)),
  tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags)),
  metadata_initialized INTEGER NOT NULL DEFAULT 1 CHECK(metadata_initialized IN (0, 1)),
  palette_id TEXT NOT NULL DEFAULT 'sakura',
  background_image TEXT,
  page_background_image TEXT,
  background_display TEXT NOT NULL DEFAULT 'cover' CHECK(background_display IN ('cover', 'page'))
);

INSERT INTO itineraries_new
SELECT * FROM itineraries;
DROP TABLE itineraries;
ALTER TABLE itineraries_new RENAME TO itineraries;
CREATE INDEX idx_itineraries_created_at ON itineraries(created_at DESC);
CREATE INDEX idx_itineraries_source_id ON itineraries(source_itinerary_id);
CREATE TRIGGER validate_itinerary_snapshot_insert
BEFORE INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;
CREATE TRIGGER validate_itinerary_snapshot_update
BEFORE UPDATE OF source_itinerary_id ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;
CREATE TRIGGER delete_published_snapshot_with_source
BEFORE DELETE ON itineraries
WHEN OLD.source_itinerary_id IS NULL
BEGIN
  DELETE FROM itineraries WHERE source_itinerary_id = OLD.id;
END;
CREATE TRIGGER set_official_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.id IN ('official-spring-source', 'official-summer-source', 'official-autumn-source', 'official-winter-source')
BEGIN
  UPDATE itineraries
  SET background_image = CASE NEW.id
    WHEN 'official-spring-source' THEN '/hero/background-spring.avif'
    WHEN 'official-summer-source' THEN '/hero/background-summer.avif'
    WHEN 'official-autumn-source' THEN '/hero/background-autumn.avif'
    WHEN 'official-winter-source' THEN '/hero/background-winter.avif'
  END
  WHERE id = NEW.id;
END;
CREATE TRIGGER sync_public_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
BEGIN
  UPDATE itineraries
  SET background_image = (SELECT background_image FROM itineraries WHERE id = NEW.source_itinerary_id),
      background_display = (SELECT background_display FROM itineraries WHERE id = NEW.source_itinerary_id),
      page_background_image = NULL
  WHERE id = NEW.id;
END;

-- migrate:down

CREATE TABLE itineraries_old (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  memo TEXT,
  password TEXT,
  source_itinerary_id TEXT,
  packing_enabled INTEGER NOT NULL DEFAULT 1 CHECK(packing_enabled IN (0, 1)),
  prefecture_slugs TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(prefecture_slugs)),
  areas TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(areas)),
  tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags)),
  metadata_initialized INTEGER NOT NULL DEFAULT 1 CHECK(metadata_initialized IN (0, 1)),
  palette_id TEXT NOT NULL DEFAULT 'sakura',
  background_image TEXT,
  page_background_image TEXT,
  background_display TEXT NOT NULL DEFAULT 'cover' CHECK(background_display IN ('cover', 'page'))
);

INSERT INTO itineraries_old
SELECT id, title,
  CASE theme_id
    WHEN 'daycard' THEN 'standard-spring'
    WHEN 'accordion' THEN 'standard-accordion'
    WHEN 'list' THEN 'standard-summer'
    WHEN 'week' THEN 'standard-autumn'
    WHEN 'month' THEN 'standard-winter'
    ELSE theme_id
  END,
  created_at, updated_at, memo, password, source_itinerary_id, packing_enabled,
  prefecture_slugs, areas, tags, metadata_initialized, palette_id, background_image,
  page_background_image, background_display
FROM itineraries;
DROP TABLE itineraries;
ALTER TABLE itineraries_old RENAME TO itineraries;
CREATE INDEX idx_itineraries_created_at ON itineraries(created_at DESC);
CREATE INDEX idx_itineraries_source_id ON itineraries(source_itinerary_id);
CREATE TRIGGER validate_itinerary_snapshot_insert
BEFORE INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;
CREATE TRIGGER validate_itinerary_snapshot_update
BEFORE UPDATE OF source_itinerary_id ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;
CREATE TRIGGER delete_published_snapshot_with_source
BEFORE DELETE ON itineraries
WHEN OLD.source_itinerary_id IS NULL
BEGIN
  DELETE FROM itineraries WHERE source_itinerary_id = OLD.id;
END;
CREATE TRIGGER set_official_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.id IN ('official-spring-source', 'official-summer-source', 'official-autumn-source', 'official-winter-source')
BEGIN
  UPDATE itineraries
  SET background_image = CASE NEW.id
    WHEN 'official-spring-source' THEN '/hero/background-spring.avif'
    WHEN 'official-summer-source' THEN '/hero/background-summer.avif'
    WHEN 'official-autumn-source' THEN '/hero/background-autumn.avif'
    WHEN 'official-winter-source' THEN '/hero/background-winter.avif'
  END
  WHERE id = NEW.id;
END;
CREATE TRIGGER sync_public_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
BEGIN
  UPDATE itineraries
  SET background_image = (SELECT background_image FROM itineraries WHERE id = NEW.source_itinerary_id),
      background_display = (SELECT background_display FROM itineraries WHERE id = NEW.source_itinerary_id),
      page_background_image = NULL
  WHERE id = NEW.id;
END;
