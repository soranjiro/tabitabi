-- Add source_itinerary_id to track shared snapshots
-- When set, this itinerary is a shared snapshot (view-only) of the source itinerary
ALTER TABLE itineraries ADD COLUMN source_itinerary_id TEXT;
