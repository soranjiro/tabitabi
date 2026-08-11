ALTER TABLE itinerary_packing_items ADD COLUMN owner_member_id TEXT;

CREATE INDEX IF NOT EXISTS idx_packing_items_owner
  ON itinerary_packing_items(itinerary_id, owner_member_id, kind);
