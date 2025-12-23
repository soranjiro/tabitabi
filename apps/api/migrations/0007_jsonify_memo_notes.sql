-- Migrate itineraries.memo to JSON format
UPDATE itineraries
SET memo = CASE
  -- NULL or empty: set to {"text": ""}
  WHEN memo IS NULL OR memo = '' THEN '{"text":""}'
  -- Already valid JSON with text field: keep as-is
  WHEN json_valid(memo) AND json_extract(memo, '$.text') IS NOT NULL THEN memo
  -- Already valid JSON without text field: add text field
  WHEN json_valid(memo) THEN json_insert(memo, '$.text', '')
  -- Plain text: wrap in {"text": "value"}
  ELSE json_object('text', memo)
END;

-- Migrate steps.notes to JSON format
UPDATE steps
SET notes = CASE
  -- NULL or empty: set to {"text": ""}
  WHEN notes IS NULL OR notes = '' THEN '{"text":""}'
  -- PLANB:: format: convert to {"text": "", "planB": [...]}
  WHEN notes LIKE 'PLANB::%' THEN
    json_object('text', '', 'planB', json(SUBSTR(notes, 8)))
  -- Already valid JSON with text field: keep as-is
  WHEN json_valid(notes) AND json_extract(notes, '$.text') IS NOT NULL THEN notes
  -- Already valid JSON without text field: add text field
  WHEN json_valid(notes) THEN json_insert(notes, '$.text', '')
  -- Plain text: wrap in {"text": "value"}
  ELSE json_object('text', notes)
END;
