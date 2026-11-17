-- New feature settings default to requiring itinerary edit access.
ALTER TABLE itinerary_money_settings
  ADD COLUMN fund_enabled INTEGER NOT NULL DEFAULT 0 CHECK(fund_enabled IN (0, 1));

CREATE TABLE itinerary_packing_settings (
  itinerary_id TEXT PRIMARY KEY,
  requires_edit_permission INTEGER NOT NULL DEFAULT 1 CHECK(requires_edit_permission IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);
