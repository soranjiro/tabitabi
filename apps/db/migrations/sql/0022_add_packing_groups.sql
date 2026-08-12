CREATE TABLE IF NOT EXISTS itinerary_packing_groups (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packing_groups_itinerary
  ON itinerary_packing_groups(itinerary_id, sort_order, created_at);

ALTER TABLE itinerary_packing_items ADD COLUMN group_id TEXT;
ALTER TABLE itinerary_packing_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

INSERT OR IGNORE INTO itinerary_packing_groups (id, itinerary_id, name, sort_order, created_at, updated_at)
SELECT id || ':packing-group:valuables', id, '貴重品', 0, created_at, created_at FROM itineraries
UNION ALL SELECT id || ':packing-group:devices', id, 'スマホ・電子機器', 1, created_at, created_at FROM itineraries
UNION ALL SELECT id || ':packing-group:care', id, '洗面・ケアアイテム', 2, created_at, created_at FROM itineraries
UNION ALL SELECT id || ':packing-group:clothes', id, '衣類', 3, created_at, created_at FROM itineraries
UNION ALL SELECT id || ':packing-group:other', id, 'その他', 4, created_at, created_at FROM itineraries;

UPDATE itinerary_packing_items
SET group_id = itinerary_id || ':packing-group:other'
WHERE group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_packing_items_group
  ON itinerary_packing_items(itinerary_id, group_id, kind, created_at);
