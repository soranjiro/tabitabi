-- An optional itinerary event associated with a budget item.
ALTER TABLE itinerary_money_items ADD COLUMN step_id TEXT;
CREATE INDEX IF NOT EXISTS idx_money_items_step ON itinerary_money_items(itinerary_id, step_id);
