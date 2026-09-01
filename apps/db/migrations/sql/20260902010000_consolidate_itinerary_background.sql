ALTER TABLE itineraries ADD COLUMN background_display TEXT NOT NULL DEFAULT 'cover'
  CHECK(background_display IN ('cover', 'page'));

-- Keep one image per itinerary. Existing page-only choices are retained and
-- converted to the new display target; old secondary values are discarded.
UPDATE itineraries
SET background_image = COALESCE(background_image, page_background_image),
    background_display = CASE
      WHEN background_image IS NULL AND page_background_image IS NOT NULL THEN 'page'
      ELSE 'cover'
    END,
    page_background_image = NULL;

DROP TRIGGER sync_public_itinerary_background_after_insert;
DROP TRIGGER sync_public_itinerary_background_after_update;

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

CREATE TRIGGER sync_public_itinerary_background_after_update
AFTER UPDATE OF background_image, background_display ON itineraries
WHEN NEW.source_itinerary_id IS NULL
BEGIN
  UPDATE itineraries
  SET background_image = NEW.background_image,
      background_display = NEW.background_display,
      page_background_image = NULL
  WHERE source_itinerary_id = NEW.id;
END;
