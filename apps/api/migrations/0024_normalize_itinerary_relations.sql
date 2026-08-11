-- Consolidate standard-theme data around itineraries and shared trip members.
PRAGMA defer_foreign_keys = on;

-- Remove the retired external expense-integration settings.
DROP TABLE itinerary_walica_settings;

-- Composite unique keys let dependent rows prove that a referenced record
-- belongs to the same itinerary, not merely that its globally unique id exists.
CREATE UNIQUE INDEX IF NOT EXISTS idx_itinerary_members_id_itinerary
  ON itinerary_members(id, itinerary_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_id_itinerary
  ON steps(id, itinerary_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_packing_groups_id_itinerary
  ON itinerary_packing_groups(id, itinerary_id);

-- Normalize expense participants so every member reference has a real FK.
DROP INDEX IF EXISTS idx_money_items_itinerary;
DROP INDEX IF EXISTS idx_money_items_step;
ALTER TABLE itinerary_money_items RENAME TO itinerary_money_items_legacy;

CREATE TABLE itinerary_money_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  paid_by_member_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('paid', 'planned')),
  occurred_on TEXT,
  step_id TEXT,
  is_settled INTEGER NOT NULL DEFAULT 0 CHECK(is_settled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT,
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE SET NULL
);

INSERT INTO itinerary_money_items (
  id, itinerary_id, title, amount, paid_by_member_id, status,
  occurred_on, step_id, is_settled, created_at, updated_at
)
SELECT
  old.id,
  old.itinerary_id,
  old.title,
  old.amount,
  CASE WHEN member.id IS NOT NULL THEN old.paid_by_member_id ELSE NULL END,
  old.status,
  old.occurred_on,
  CASE WHEN step.id IS NOT NULL THEN old.step_id ELSE NULL END,
  old.is_settled,
  old.created_at,
  old.updated_at
FROM itinerary_money_items_legacy old
LEFT JOIN itinerary_members member
  ON member.id = old.paid_by_member_id
 AND member.itinerary_id = old.itinerary_id
LEFT JOIN steps step
  ON step.id = old.step_id
 AND step.itinerary_id = old.itinerary_id;

CREATE UNIQUE INDEX idx_money_items_id_itinerary
  ON itinerary_money_items(id, itinerary_id);
CREATE INDEX idx_money_items_itinerary
  ON itinerary_money_items(itinerary_id, status);
CREATE INDEX idx_money_items_step
  ON itinerary_money_items(itinerary_id, step_id);

CREATE TABLE itinerary_money_item_splits (
  item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  itinerary_id TEXT NOT NULL,
  PRIMARY KEY (item_id, member_id),
  FOREIGN KEY (item_id, itinerary_id)
    REFERENCES itinerary_money_items(id, itinerary_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT
);

INSERT OR IGNORE INTO itinerary_money_item_splits (item_id, member_id, itinerary_id)
SELECT old.id, value.value, old.itinerary_id
FROM itinerary_money_items_legacy old
JOIN json_each(
  CASE WHEN json_valid(old.split_member_ids) THEN old.split_member_ids ELSE '[]' END
) value
JOIN itinerary_members member
  ON member.id = value.value
 AND member.itinerary_id = old.itinerary_id
WHERE value.type = 'text';

CREATE INDEX idx_money_item_splits_member
  ON itinerary_money_item_splits(itinerary_id, member_id);

DROP TABLE itinerary_money_items_legacy;
DROP TABLE itinerary_money_members;

-- Rebuild packing tables so groups, assignees, owners, and checks are all
-- protected by foreign keys. Private items follow their owner on deletion;
-- shared-item assignments are simply cleared.
DROP INDEX IF EXISTS idx_packing_items_itinerary;
DROP INDEX IF EXISTS idx_packing_items_group;
DROP INDEX IF EXISTS idx_packing_items_owner;
ALTER TABLE itinerary_packing_checks RENAME TO itinerary_packing_checks_legacy;
ALTER TABLE itinerary_packing_items RENAME TO itinerary_packing_items_legacy;

CREATE TABLE itinerary_packing_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('personal', 'private', 'shared')),
  group_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  assignee_member_id TEXT,
  owner_member_id TEXT,
  is_packed INTEGER NOT NULL DEFAULT 0 CHECK(is_packed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id, itinerary_id)
    REFERENCES itinerary_packing_groups(id, itinerary_id) ON DELETE RESTRICT,
  FOREIGN KEY (assignee_member_id) REFERENCES itinerary_members(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE CASCADE,
  CHECK(
    (kind = 'personal' AND assignee_member_id IS NULL AND owner_member_id IS NULL)
    OR (kind = 'private' AND assignee_member_id IS NULL AND owner_member_id IS NOT NULL)
    OR (kind = 'shared' AND owner_member_id IS NULL)
  )
);

INSERT INTO itinerary_packing_items (
  id, itinerary_id, name, kind, group_id, quantity,
  assignee_member_id, owner_member_id, is_packed, created_at, updated_at
)
SELECT
  old.id,
  old.itinerary_id,
  old.name,
  CASE
    WHEN old.kind = 'private' AND owner.id IS NOT NULL THEN 'private'
    WHEN old.kind = 'shared' THEN 'shared'
    ELSE 'personal'
  END,
  old.group_id,
  -- Some local databases applied an earlier 0022 migration before its
  -- quantity column was introduced. Use the safe default while rebuilding.
  1,
  CASE WHEN old.kind = 'shared' THEN assignee.id ELSE NULL END,
  CASE WHEN old.kind = 'private' THEN owner.id ELSE NULL END,
  CASE WHEN old.is_packed = 1 THEN 1 ELSE 0 END,
  old.created_at,
  old.updated_at
FROM itinerary_packing_items_legacy old
JOIN itinerary_packing_groups packing_group
  ON packing_group.id = old.group_id
 AND packing_group.itinerary_id = old.itinerary_id
LEFT JOIN itinerary_members assignee
  ON assignee.id = old.assignee_member_id
 AND assignee.itinerary_id = old.itinerary_id
LEFT JOIN itinerary_members owner
  ON owner.id = old.owner_member_id
 AND owner.itinerary_id = old.itinerary_id;

CREATE UNIQUE INDEX idx_packing_items_id_itinerary
  ON itinerary_packing_items(id, itinerary_id);
CREATE INDEX idx_packing_items_itinerary
  ON itinerary_packing_items(itinerary_id, kind, created_at);
CREATE INDEX idx_packing_items_group
  ON itinerary_packing_items(itinerary_id, group_id, kind, created_at);
CREATE INDEX idx_packing_items_owner
  ON itinerary_packing_items(itinerary_id, owner_member_id, kind);

CREATE TABLE itinerary_packing_checks (
  item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  itinerary_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (item_id, member_id),
  FOREIGN KEY (item_id, itinerary_id)
    REFERENCES itinerary_packing_items(id, itinerary_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO itinerary_packing_checks (
  item_id, member_id, itinerary_id, checked_at
)
SELECT old.item_id, old.member_id, item.itinerary_id, old.checked_at
FROM itinerary_packing_checks_legacy old
JOIN itinerary_packing_items item ON item.id = old.item_id
JOIN itinerary_members member
  ON member.id = old.member_id
 AND member.itinerary_id = item.itinerary_id
WHERE item.kind != 'private' OR item.owner_member_id = old.member_id;

DROP TABLE itinerary_packing_checks_legacy;
DROP TABLE itinerary_packing_items_legacy;

-- Published snapshots are itinerary rows themselves. Triggers provide the
-- self-reference checks without rebuilding the heavily referenced parent table.
CREATE TRIGGER validate_itinerary_snapshot_insert
BEFORE INSERT ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;

CREATE TRIGGER validate_itinerary_snapshot_update
BEFORE UPDATE OF source_itinerary_id ON itineraries
WHEN NEW.source_itinerary_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM itineraries WHERE id = NEW.source_itinerary_id)
BEGIN
  SELECT RAISE(ABORT, 'source itinerary does not exist');
END;

CREATE TRIGGER delete_published_snapshot_with_source
BEFORE DELETE ON itineraries
WHEN OLD.source_itinerary_id IS NULL
BEGIN
  DELETE FROM itineraries WHERE source_itinerary_id = OLD.id;
END;

PRAGMA defer_foreign_keys = off;
