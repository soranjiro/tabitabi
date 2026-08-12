-- Add index on itineraries.created_at for public feed pagination performance
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at DESC);
