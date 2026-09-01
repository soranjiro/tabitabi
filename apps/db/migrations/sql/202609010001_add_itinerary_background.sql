ALTER TABLE itineraries ADD COLUMN background_image TEXT;

-- Published snapshots inherit the source cover on creation and whenever it changes.
CREATE TRIGGER sync_public_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
BEGIN
  UPDATE itineraries
  SET background_image = (
    SELECT background_image FROM itineraries WHERE id = NEW.source_itinerary_id
  )
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_public_itinerary_background_after_update
AFTER UPDATE OF background_image ON itineraries
WHEN NEW.source_itinerary_id IS NULL
BEGIN
  UPDATE itineraries
  SET background_image = NEW.background_image
  WHERE source_itinerary_id = NEW.id;
END;

-- Match the official examples to the seasonal images already shown on the home page.
UPDATE itineraries SET background_image = '/hero/background-spring.avif'
WHERE id IN ('official-spring-source', 'official-spring-public');
UPDATE itineraries SET background_image = '/hero/background-summer.avif'
WHERE id IN ('official-summer-source', 'official-summer-public');
UPDATE itineraries SET background_image = '/hero/background-autumn.avif'
WHERE id IN ('official-autumn-source', 'official-autumn-public');
UPDATE itineraries SET background_image = '/hero/background-winter.avif'
WHERE id IN ('official-winter-source', 'official-winter-public');
