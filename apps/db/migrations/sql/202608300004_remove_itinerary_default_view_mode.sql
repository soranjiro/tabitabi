-- migrate:up
-- The selected view is a client preference derived from the theme, not itinerary data.
ALTER TABLE itineraries DROP COLUMN default_view_mode;

-- migrate:down
ALTER TABLE itineraries ADD COLUMN default_view_mode TEXT NOT NULL DEFAULT 'dayCard';
