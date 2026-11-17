-- Allow an itinerary editor to opt into money editing from view-only links.
-- Existing itineraries stay editor-only unless explicitly changed.
ALTER TABLE itinerary_money_settings
  ADD COLUMN requires_edit_permission INTEGER NOT NULL DEFAULT 1 CHECK(requires_edit_permission IN (0, 1));
