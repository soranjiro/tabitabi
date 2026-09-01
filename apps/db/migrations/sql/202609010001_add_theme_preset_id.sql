-- migrate:up
-- Expand first: keep legacy theme_id untouched so existing itineraries and clients
-- continue to work while new code reads the canonical presentation preset.
ALTER TABLE itineraries ADD COLUMN theme_preset_id TEXT NOT NULL DEFAULT 'planning';

-- Backfill only the new column. Existing theme_id values are deliberately preserved.
UPDATE itineraries
SET theme_preset_id = CASE theme_id
  WHEN 'planning-draft' THEN 'planning'
  WHEN 'standard-spring' THEN 'day-card'
  WHEN 'standard-accordion' THEN 'accordion'
  WHEN 'standard-summer' THEN 'list'
  WHEN 'standard-autumn' THEN 'week'
  WHEN 'standard-winter' THEN 'month'
  ELSE theme_id
END;

-- Keep the canonical value synchronized for legacy clients that continue to write
-- theme_id during the compatibility period.
CREATE TRIGGER sync_itinerary_theme_preset_after_insert
AFTER INSERT ON itineraries
BEGIN
  UPDATE itineraries
  SET theme_preset_id = CASE NEW.theme_id
    WHEN 'planning-draft' THEN 'planning'
    WHEN 'standard-spring' THEN 'day-card'
    WHEN 'standard-accordion' THEN 'accordion'
    WHEN 'standard-summer' THEN 'list'
    WHEN 'standard-autumn' THEN 'week'
    WHEN 'standard-winter' THEN 'month'
    ELSE NEW.theme_id
  END
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_itinerary_theme_preset_after_theme_id_update
AFTER UPDATE OF theme_id ON itineraries
BEGIN
  UPDATE itineraries
  SET theme_preset_id = CASE NEW.theme_id
    WHEN 'planning-draft' THEN 'planning'
    WHEN 'standard-spring' THEN 'day-card'
    WHEN 'standard-accordion' THEN 'accordion'
    WHEN 'standard-summer' THEN 'list'
    WHEN 'standard-autumn' THEN 'week'
    WHEN 'standard-winter' THEN 'month'
    ELSE NEW.theme_id
  END
  WHERE id = NEW.id;
END;

-- migrate:down
DROP TRIGGER IF EXISTS sync_itinerary_theme_preset_after_theme_id_update;
DROP TRIGGER IF EXISTS sync_itinerary_theme_preset_after_insert;
ALTER TABLE itineraries DROP COLUMN theme_preset_id;
