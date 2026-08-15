-- Allow each traveler to owe a different amount for the same expense.
ALTER TABLE itinerary_money_item_splits ADD COLUMN amount INTEGER CHECK(amount > 0);
