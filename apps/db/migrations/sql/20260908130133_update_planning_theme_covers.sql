-- migrate:up

-- Dedicated covers for the official planning examples. These are intentionally
-- distinct from the four seasonal hero images.
UPDATE itineraries
SET background_image = '/itinerary-backgrounds/coastal-drive.avif',
    background_display = 'cover'
WHERE id IN ('official-plan-source', 'official-plan-public');

UPDATE itineraries
SET background_image = '/itinerary-backgrounds/japanese.avif',
    background_display = 'cover'
WHERE id IN ('official-map-source', 'official-map-public');


-- migrate:down

UPDATE itineraries
SET background_image = NULL,
    background_display = 'cover'
WHERE id IN (
  'official-plan-source', 'official-plan-public',
  'official-map-source', 'official-map-public'
);
