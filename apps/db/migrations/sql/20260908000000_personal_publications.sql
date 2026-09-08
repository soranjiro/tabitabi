-- migrate:up
-- Existing URLs and engagement stay with the earliest publisher. Additional
-- publishers receive independent copies of the previously shared content.
DROP INDEX idx_itineraries_source_id;
CREATE INDEX idx_itineraries_source_id ON itineraries(source_itinerary_id);
DROP TRIGGER sync_public_itinerary_background_after_update;

CREATE TABLE publication_split AS
SELECT p.source_itinerary_id, p.user_id, p.shared_itinerary_id AS old_id,
       lower(hex(randomblob(16))) AS new_id
FROM itinerary_publications p
WHERE p.user_id <> (
  SELECT first.user_id FROM itinerary_publications first
  WHERE first.shared_itinerary_id = p.shared_itinerary_id
  ORDER BY first.published_at, first.user_id LIMIT 1
);

INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled,
  prefecture_slugs, areas, tags, metadata_initialized, memo, password,
  source_itinerary_id, created_at, updated_at)
SELECT split.new_id, i.title, i.theme_id, i.palette_id, i.packing_enabled,
  i.prefecture_slugs, i.areas, i.tags, i.metadata_initialized, i.memo, NULL,
  i.source_itinerary_id, i.created_at, i.updated_at
FROM publication_split split JOIN itineraries i ON i.id = split.old_id;

UPDATE itineraries SET
  background_image = (SELECT old.background_image FROM publication_split split JOIN itineraries old ON old.id = split.old_id WHERE split.new_id = itineraries.id),
  background_display = (SELECT old.background_display FROM publication_split split JOIN itineraries old ON old.id = split.old_id WHERE split.new_id = itineraries.id)
WHERE id IN (SELECT new_id FROM publication_split);

INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes,
  link, type, is_all_day, created_at, updated_at)
SELECT lower(hex(randomblob(16))), split.new_id, s.title, s.start_at, s.end_at,
  s.location, s.notes, s.link, s.type, s.is_all_day, s.created_at, s.updated_at
FROM publication_split split JOIN steps s ON s.itinerary_id = split.old_id;

UPDATE itinerary_publications SET shared_itinerary_id = (
  SELECT new_id FROM publication_split split
  WHERE split.source_itinerary_id = itinerary_publications.source_itinerary_id
    AND split.user_id = itinerary_publications.user_id
) WHERE EXISTS (
  SELECT 1 FROM publication_split split
  WHERE split.source_itinerary_id = itinerary_publications.source_itinerary_id
    AND split.user_id = itinerary_publications.user_id
);
DROP TABLE publication_split;
CREATE UNIQUE INDEX idx_publications_shared_id ON itinerary_publications(shared_itinerary_id);

-- migrate:down
DROP INDEX idx_publications_shared_id;
DELETE FROM itinerary_publications
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM itinerary_publications GROUP BY source_itinerary_id
);
DELETE FROM itineraries
WHERE source_itinerary_id IS NOT NULL
  AND id NOT IN (SELECT shared_itinerary_id FROM itinerary_publications);
DROP INDEX idx_itineraries_source_id;
CREATE UNIQUE INDEX idx_itineraries_source_id
  ON itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;
CREATE TRIGGER sync_public_itinerary_background_after_update
AFTER UPDATE OF background_image, background_display ON itineraries
WHEN NEW.source_itinerary_id IS NULL
BEGIN
  UPDATE itineraries
  SET background_image = NEW.background_image,
      background_display = NEW.background_display,
      page_background_image = NULL
  WHERE source_itinerary_id = NEW.id;
END;
