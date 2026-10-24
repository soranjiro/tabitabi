-- migrate:up
-- Account-linked editing is granted only after proving possession of an
-- itinerary edit token (or when the verified user creates/forks the itinerary).
-- Bookmarks alone never confer editing rights.
CREATE TABLE itinerary_editor_grants (
  itinerary_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  PRIMARY KEY (itinerary_id, user_id),
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_itinerary_editor_grants_user ON itinerary_editor_grants(user_id);

-- migrate:down
-- Intentionally retain the table on rollback to avoid deleting user rights.
