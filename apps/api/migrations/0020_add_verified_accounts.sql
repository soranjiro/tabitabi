-- Firebase Authentication is the identity source. Existing D1 ids are imported as Firebase UIDs.
ALTER TABLE users ADD COLUMN prefecture TEXT;
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

CREATE INDEX idx_users_verified ON users(email_verified_at);
