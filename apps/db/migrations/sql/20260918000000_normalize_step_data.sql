-- migrate:up
-- Move active-theme structure out of memo/notes JSON and allow genuinely
-- unscheduled steps. Rebuild dependent money tables so their foreign keys keep
-- pointing at the new steps table.
-- migration-risk: destructive-approved
-- SQLite cannot remove the existing NOT NULL constraints from start_at/end_at
-- in place. The guard below makes the rebuild fail atomically unless every
-- existing Step and dependent money row survives the copy.
PRAGMA defer_foreign_keys = on;

CREATE TABLE _step_normalization_guard (
  step_count INTEGER NOT NULL,
  money_item_count INTEGER NOT NULL,
  money_split_count INTEGER NOT NULL
);
INSERT INTO _step_normalization_guard
SELECT
  (SELECT COUNT(*) FROM steps),
  (SELECT COUNT(*) FROM itinerary_money_items),
  (SELECT COUNT(*) FROM itinerary_money_item_splits);

UPDATE itineraries
SET memo = CASE
  WHEN memo IS NULL THEN ''
  WHEN json_valid(memo) AND json_type(memo, '$.text') = 'text'
    THEN json_extract(memo, '$.text')
  WHEN json_valid(memo) THEN ''
  ELSE memo
END;

DROP INDEX IF EXISTS idx_money_item_splits_member;
ALTER TABLE itinerary_money_item_splits RENAME TO itinerary_money_item_splits_step_migration;

DROP INDEX IF EXISTS idx_money_items_id_itinerary;
DROP INDEX IF EXISTS idx_money_items_itinerary;
DROP INDEX IF EXISTS idx_money_items_step;
ALTER TABLE itinerary_money_items RENAME TO itinerary_money_items_step_migration;

DROP INDEX IF EXISTS idx_steps_id_itinerary;
DROP INDEX IF EXISTS idx_steps_start_at;
DROP INDEX IF EXISTS idx_steps_end_at;
ALTER TABLE steps RENAME TO steps_json_legacy;

CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_at INTEGER,
  end_at INTEGER,
  time_unspecified INTEGER NOT NULL DEFAULT 0 CHECK(time_unspecified IN (0, 1)),
  location TEXT,
  notes TEXT NOT NULL DEFAULT '',
  link TEXT,
  type TEXT NOT NULL DEFAULT 'normal:general',
  is_all_day INTEGER NOT NULL DEFAULT 0 CHECK(is_all_day IN (0, 1)),
  pin_latitude REAL,
  pin_longitude REAL,
  is_priority INTEGER NOT NULL DEFAULT 0 CHECK(is_priority IN (0, 1)),
  sort_order REAL,
  source_step_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  CHECK (
    (start_at IS NULL AND end_at IS NULL)
    OR (start_at IS NOT NULL AND end_at IS NOT NULL AND end_at >= start_at)
  ),
  CHECK (
    (pin_latitude IS NULL AND pin_longitude IS NULL)
    OR (pin_latitude IS NOT NULL AND pin_longitude IS NOT NULL)
  ),
  CHECK (time_unspecified = 0 OR start_at IS NOT NULL),
  CHECK (NOT (time_unspecified = 1 AND is_all_day = 1)),
  CHECK (pin_latitude IS NULL OR pin_latitude BETWEEN -90 AND 90),
  CHECK (pin_longitude IS NULL OR pin_longitude BETWEEN -180 AND 180)
);

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, time_unspecified, location,
  notes, link, type, is_all_day, pin_latitude, pin_longitude, is_priority,
  sort_order, source_step_id, created_at, updated_at
)
SELECT
  id,
  itinerary_id,
  title,
  CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'undecided'
      THEN NULL
    ELSE start_at
  END,
  CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'undecided'
      THEN NULL
    ELSE MAX(end_at, start_at)
  END,
  CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'day'
      AND is_all_day <> 1
      THEN 1
    ELSE 0
  END,
  location,
  CASE
    WHEN notes IS NULL THEN ''
    WHEN json_valid(notes) AND json_type(notes, '$.text') = 'text'
      THEN json_extract(notes, '$.text')
    WHEN json_valid(notes) THEN ''
    ELSE notes
  END,
  COALESCE(
    link,
    CASE
      WHEN json_valid(notes) AND json_type(notes, '$.booking_url') = 'text'
        THEN json_extract(notes, '$.booking_url')
    END
  ),
  type,
  CASE WHEN is_all_day = 1 THEN 1 ELSE 0 END,
  CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_place.lat') IN ('integer', 'real')
      AND json_type(notes, '$.tabitabi_place.lng') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_place.lat')
  END,
  CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_place.lat') IN ('integer', 'real')
      AND json_type(notes, '$.tabitabi_place.lng') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_place.lng')
  END,
  CASE
    WHEN json_valid(notes) AND json_extract(notes, '$.tabitabi_place.priority') = 1
      THEN 1
    ELSE 0
  END,
  CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_schedule.order') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_schedule.order')
  END,
  NULL,
  created_at,
  updated_at
FROM steps_json_legacy;

CREATE UNIQUE INDEX idx_steps_id_itinerary ON steps(id, itinerary_id);
CREATE INDEX idx_steps_start_at ON steps(itinerary_id, start_at);
CREATE INDEX idx_steps_end_at ON steps(itinerary_id, end_at);
CREATE INDEX idx_steps_sort_order ON steps(itinerary_id, sort_order);
CREATE INDEX idx_steps_source_step ON steps(source_step_id);

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
  paid_from_fund INTEGER NOT NULL DEFAULT 0 CHECK(paid_from_fund IN (0, 1)),
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT,
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE SET NULL
);

INSERT INTO itinerary_money_items
SELECT * FROM itinerary_money_items_step_migration;
CREATE UNIQUE INDEX idx_money_items_id_itinerary ON itinerary_money_items(id, itinerary_id);
CREATE INDEX idx_money_items_itinerary ON itinerary_money_items(itinerary_id, status);
CREATE INDEX idx_money_items_step ON itinerary_money_items(itinerary_id, step_id);

CREATE TABLE itinerary_money_item_splits (
  item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  itinerary_id TEXT NOT NULL,
  amount INTEGER CHECK(amount > 0),
  PRIMARY KEY (item_id, member_id),
  FOREIGN KEY (item_id, itinerary_id)
    REFERENCES itinerary_money_items(id, itinerary_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT
);
INSERT INTO itinerary_money_item_splits
SELECT * FROM itinerary_money_item_splits_step_migration;
CREATE INDEX idx_money_item_splits_member
  ON itinerary_money_item_splits(itinerary_id, member_id);

-- Abort before any legacy table is dropped if a row, identifier, unchanged
-- Step field, money reference, or split failed to survive the rebuild.
CREATE TABLE _step_normalization_assertion (
  ok INTEGER NOT NULL CHECK(ok = 1)
);
INSERT INTO _step_normalization_assertion
SELECT CASE WHEN
  (SELECT COUNT(*) FROM steps) = guard.step_count
  AND (SELECT COUNT(*) FROM itinerary_money_items) = guard.money_item_count
  AND (SELECT COUNT(*) FROM itinerary_money_item_splits) = guard.money_split_count
  AND NOT EXISTS (
    SELECT 1
    FROM steps_json_legacy old
    LEFT JOIN steps next ON next.id = old.id
    WHERE next.id IS NULL
      OR next.itinerary_id <> old.itinerary_id
      OR next.title <> old.title
      OR next.location IS NOT old.location
      OR next.type <> old.type
      OR next.is_all_day <> old.is_all_day
      OR next.created_at <> old.created_at
      OR next.updated_at <> old.updated_at
  )
  AND NOT EXISTS (
    SELECT id, itinerary_id, title, amount, paid_by_member_id, status,
      occurred_on, step_id, is_settled, created_at, updated_at, paid_from_fund
    FROM itinerary_money_items_step_migration
    EXCEPT
    SELECT id, itinerary_id, title, amount, paid_by_member_id, status,
      occurred_on, step_id, is_settled, created_at, updated_at, paid_from_fund
    FROM itinerary_money_items
  )
  AND NOT EXISTS (
    SELECT item_id, member_id, itinerary_id, amount
    FROM itinerary_money_item_splits_step_migration
    EXCEPT
    SELECT item_id, member_id, itinerary_id, amount
    FROM itinerary_money_item_splits
  )
THEN 1 ELSE 0 END
FROM _step_normalization_guard guard;

DROP TABLE _step_normalization_assertion;
DROP TABLE _step_normalization_guard;

DROP TABLE itinerary_money_item_splits_step_migration;
DROP TABLE itinerary_money_items_step_migration;
DROP TABLE steps_json_legacy;

PRAGMA defer_foreign_keys = off;

-- migrate:down
SELECT RAISE(ABORT, 'The normalized step migration is intentionally irreversible');
