-- Show the official spring and summer bookmark backgrounds across the full page.
-- Update both source itineraries and the stable public examples so this also fixes
-- already-seeded environments.
UPDATE itineraries
SET background_display = 'page',
    page_background_image = NULL
WHERE id IN (
  'official-spring-source',
  'official-spring-public',
  'official-summer-source',
  'official-summer-public'
);

-- Re-seeding the official examples should preserve the same display mode.
DROP TRIGGER set_official_itinerary_background_after_insert;

CREATE TRIGGER set_official_itinerary_background_after_insert
AFTER INSERT ON itineraries
WHEN NEW.id IN (
  'official-spring-source',
  'official-summer-source',
  'official-autumn-source',
  'official-winter-source'
)
BEGIN
  UPDATE itineraries
  SET background_image = CASE NEW.id
        WHEN 'official-spring-source' THEN '/hero/background-spring.avif'
        WHEN 'official-summer-source' THEN '/hero/background-summer.avif'
        WHEN 'official-autumn-source' THEN '/hero/background-autumn.avif'
        WHEN 'official-winter-source' THEN '/hero/background-winter.avif'
      END,
      background_display = CASE NEW.id
        WHEN 'official-spring-source' THEN 'page'
        WHEN 'official-summer-source' THEN 'page'
        ELSE 'cover'
      END,
      page_background_image = NULL
  WHERE id = NEW.id;
END;
