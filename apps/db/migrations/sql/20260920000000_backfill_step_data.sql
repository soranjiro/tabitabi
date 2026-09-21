-- migrate:up
-- Copy legacy JSON/timestamps into the additive columns. The legacy values are
-- deliberately retained so the migration can be re-run or the app rolled back.
UPDATE itineraries
SET memo_text = CASE
  WHEN memo IS NULL THEN ''
  WHEN json_valid(memo) AND json_type(memo, '$.text') = 'text'
    THEN json_extract(memo, '$.text')
  ELSE memo
END
WHERE memo_text IS NULL;

UPDATE steps
SET
  notes_text = CASE
    WHEN notes IS NULL THEN ''
    WHEN json_valid(notes) AND json_type(notes, '$.text') = 'text'
      THEN json_extract(notes, '$.text')
    ELSE notes
  END,
  scheduled_start_at = CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
    WHEN end_at >= start_at THEN start_at
    ELSE NULL
  END,
  scheduled_end_at = CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
    WHEN end_at >= start_at THEN end_at
    ELSE NULL
  END,
  time_unspecified = CASE
    WHEN end_at >= start_at
      AND json_valid(notes)
      AND json_extract(notes, '$.tabitabi_schedule.precision') = 'day'
      AND is_all_day = 0 THEN 1
    ELSE 0
  END,
  sort_order = CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_schedule.order') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_schedule.order')
    ELSE NULL
  END,
  pin_latitude = CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_place.lat') IN ('integer', 'real')
      AND json_type(notes, '$.tabitabi_place.lng') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_place.lat')
    ELSE NULL
  END,
  pin_longitude = CASE
    WHEN json_valid(notes)
      AND json_type(notes, '$.tabitabi_place.lat') IN ('integer', 'real')
      AND json_type(notes, '$.tabitabi_place.lng') IN ('integer', 'real')
      THEN json_extract(notes, '$.tabitabi_place.lng')
    ELSE NULL
  END,
  is_priority = CASE
    WHEN json_valid(notes)
      AND json_extract(notes, '$.tabitabi_place.priority') = 1 THEN 1
    ELSE 0
  END,
  link = CASE
    WHEN link IS NULL
      AND json_valid(notes)
      AND json_type(notes, '$.booking_url') = 'text'
      AND trim(json_extract(notes, '$.booking_url')) <> ''
      THEN json_extract(notes, '$.booking_url')
    ELSE link
  END;

-- Keep the additive columns synchronized while the legacy application is still
-- deployed. These triggers are removed by the application cutover migration.
CREATE TRIGGER sync_itineraries_memo_text_insert
AFTER INSERT ON itineraries
BEGIN
  UPDATE itineraries
  SET memo_text = CASE
    WHEN NEW.memo IS NULL THEN ''
    WHEN json_valid(NEW.memo) AND json_type(NEW.memo, '$.text') = 'text'
      THEN json_extract(NEW.memo, '$.text')
    ELSE NEW.memo
  END
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_itineraries_memo_text_update
AFTER UPDATE OF memo ON itineraries
BEGIN
  UPDATE itineraries
  SET memo_text = CASE
    WHEN NEW.memo IS NULL THEN ''
    WHEN json_valid(NEW.memo) AND json_type(NEW.memo, '$.text') = 'text'
      THEN json_extract(NEW.memo, '$.text')
    ELSE NEW.memo
  END
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_steps_normalized_insert
AFTER INSERT ON steps
BEGIN
  UPDATE steps
  SET
    notes_text = CASE
      WHEN NEW.notes IS NULL THEN ''
      WHEN json_valid(NEW.notes) AND json_type(NEW.notes, '$.text') = 'text'
        THEN json_extract(NEW.notes, '$.text')
      ELSE NEW.notes
    END,
    scheduled_start_at = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
      WHEN NEW.end_at >= NEW.start_at THEN NEW.start_at
      ELSE NULL
    END,
    scheduled_end_at = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
      WHEN NEW.end_at >= NEW.start_at THEN NEW.end_at
      ELSE NULL
    END,
    time_unspecified = CASE
      WHEN NEW.end_at >= NEW.start_at
        AND json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'day'
        AND NEW.is_all_day = 0 THEN 1
      ELSE 0
    END,
    sort_order = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_schedule.order') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_schedule.order')
      ELSE NULL
    END,
    pin_latitude = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_place.lat') IN ('integer', 'real')
        AND json_type(NEW.notes, '$.tabitabi_place.lng') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_place.lat')
      ELSE NULL
    END,
    pin_longitude = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_place.lat') IN ('integer', 'real')
        AND json_type(NEW.notes, '$.tabitabi_place.lng') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_place.lng')
      ELSE NULL
    END,
    is_priority = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_place.priority') = 1 THEN 1
      ELSE 0
    END,
    link = CASE
      WHEN NEW.link IS NULL
        AND json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.booking_url') = 'text'
        AND trim(json_extract(NEW.notes, '$.booking_url')) <> ''
        THEN json_extract(NEW.notes, '$.booking_url')
      ELSE NEW.link
    END
  WHERE id = NEW.id;
END;

CREATE TRIGGER sync_steps_normalized_update
AFTER UPDATE OF start_at, end_at, notes, is_all_day ON steps
BEGIN
  UPDATE steps
  SET
    notes_text = CASE
      WHEN NEW.notes IS NULL THEN ''
      WHEN json_valid(NEW.notes) AND json_type(NEW.notes, '$.text') = 'text'
        THEN json_extract(NEW.notes, '$.text')
      ELSE NEW.notes
    END,
    scheduled_start_at = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
      WHEN NEW.end_at >= NEW.start_at THEN NEW.start_at
      ELSE NULL
    END,
    scheduled_end_at = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'undecided' THEN NULL
      WHEN NEW.end_at >= NEW.start_at THEN NEW.end_at
      ELSE NULL
    END,
    time_unspecified = CASE
      WHEN NEW.end_at >= NEW.start_at
        AND json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_schedule.precision') = 'day'
        AND NEW.is_all_day = 0 THEN 1
      ELSE 0
    END,
    sort_order = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_schedule.order') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_schedule.order')
      ELSE NULL
    END,
    pin_latitude = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_place.lat') IN ('integer', 'real')
        AND json_type(NEW.notes, '$.tabitabi_place.lng') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_place.lat')
      ELSE NULL
    END,
    pin_longitude = CASE
      WHEN json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.tabitabi_place.lat') IN ('integer', 'real')
        AND json_type(NEW.notes, '$.tabitabi_place.lng') IN ('integer', 'real')
        THEN json_extract(NEW.notes, '$.tabitabi_place.lng')
      ELSE NULL
    END,
    is_priority = CASE
      WHEN json_valid(NEW.notes)
        AND json_extract(NEW.notes, '$.tabitabi_place.priority') = 1 THEN 1
      ELSE 0
    END,
    link = CASE
      WHEN NEW.link IS NULL
        AND json_valid(NEW.notes)
        AND json_type(NEW.notes, '$.booking_url') = 'text'
        AND trim(json_extract(NEW.notes, '$.booking_url')) <> ''
        THEN json_extract(NEW.notes, '$.booking_url')
      ELSE NEW.link
    END
  WHERE id = NEW.id;
END;

-- migrate:down
-- Removing the synchronization triggers is reversible. Backfilled values are
-- intentionally retained because clearing them would destroy data written by a
-- newer application during a rollback.
DROP TRIGGER IF EXISTS sync_steps_normalized_update;
DROP TRIGGER IF EXISTS sync_steps_normalized_insert;
DROP TRIGGER IF EXISTS sync_itineraries_memo_text_update;
DROP TRIGGER IF EXISTS sync_itineraries_memo_text_insert;
