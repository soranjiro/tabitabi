-- Add fork_count to itineraries to track how many times an itinerary has been forked
ALTER TABLE itineraries ADD COLUMN fork_count INTEGER NOT NULL DEFAULT 0;
