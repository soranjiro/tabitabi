ALTER TABLE itineraries ADD COLUMN page_background_image TEXT;

-- A publication is a read-only projection of its source, so both background
-- layers must stay in sync whenever the source changes.
DROP TRIGGER sync_public_itinerary_background_after_insert;
DROP TRIGGER sync_public_itinerary_background_after_update;

CREATE TRIGGER sync_public_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
BEGIN
  UPDATE itineraries
  SET background_image = (SELECT background_image FROM itineraries WHERE id = NEW.source_itinerary_id),
      page_background_image = (SELECT page_background_image FROM itineraries WHERE id = NEW.source_itinerary_id)
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_public_itinerary_background_after_update
AFTER UPDATE OF background_image, page_background_image ON itineraries
WHEN NEW.source_itinerary_id IS NULL
BEGIN
  UPDATE itineraries
  SET background_image = NEW.background_image,
      page_background_image = NEW.page_background_image
  WHERE source_itinerary_id = NEW.id;
END;
