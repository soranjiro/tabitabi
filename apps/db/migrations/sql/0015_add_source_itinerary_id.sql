-- Add source_itinerary_id to track shared snapshots
-- When set, this itinerary is a shared snapshot (view-only) of the source itinerary
ALTER TABLE itineraries ADD COLUMN source_itinerary_id TEXT;

-- Unique partial index: at most one shared snapshot per source itinerary
CREATE UNIQUE INDEX idx_itineraries_source_id ON itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;
