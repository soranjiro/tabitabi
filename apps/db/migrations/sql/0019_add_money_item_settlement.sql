-- Track whether a confirmed expense has already been settled between members.
ALTER TABLE itinerary_money_items ADD COLUMN is_settled INTEGER NOT NULL DEFAULT 0;
