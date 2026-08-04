-- Money management for standard themes: members, paid/planned expenses, and budget.
CREATE TABLE IF NOT EXISTS itinerary_money_settings (
  itinerary_id TEXT PRIMARY KEY,
  budget_amount INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itinerary_money_members (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_money_members_itinerary ON itinerary_money_members(itinerary_id);

CREATE TABLE IF NOT EXISTS itinerary_money_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  paid_by_member_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('paid', 'planned')),
  occurred_on TEXT,
  split_member_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_member_id) REFERENCES itinerary_money_members(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_money_items_itinerary ON itinerary_money_items(itinerary_id, status);
