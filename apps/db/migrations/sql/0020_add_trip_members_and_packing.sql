-- Members belong to the itinerary, not to a single optional feature.
CREATE TABLE IF NOT EXISTS itinerary_members (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_itinerary_members_itinerary
  ON itinerary_members(itinerary_id, created_at);

-- Preserve members created by the money feature before members became shared.
INSERT OR IGNORE INTO itinerary_members (id, itinerary_id, name, created_at)
SELECT id, itinerary_id, name, created_at FROM itinerary_money_members;

CREATE TABLE IF NOT EXISTS itinerary_packing_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'shared')),
  assignee_member_id TEXT,
  is_packed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_member_id) REFERENCES itinerary_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_packing_items_itinerary
  ON itinerary_packing_items(itinerary_id, kind, created_at);

CREATE TABLE IF NOT EXISTS itinerary_packing_checks (
  item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (item_id, member_id),
  FOREIGN KEY (item_id) REFERENCES itinerary_packing_items(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES itinerary_members(id) ON DELETE CASCADE
);
