-- Add a general purpose link to every step.
-- Public snapshots use this URL to generate affiliate-ready links when applicable.
ALTER TABLE steps ADD COLUMN link TEXT;

UPDATE steps
SET link = json_extract(notes, '$.booking_url')
WHERE link IS NULL
  AND notes IS NOT NULL
  AND json_valid(notes)
  AND json_extract(notes, '$.booking_url') IS NOT NULL;
