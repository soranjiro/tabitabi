-- migrate:up
-- Additive: existing Firebase UIDs and itinerary ownership remain unchanged.
CREATE TABLE user_passkeys (
  credential_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(transports)),
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_passkeys_user ON user_passkeys(user_id);

CREATE TABLE passkey_challenges (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('register', 'login')),
  user_id TEXT,
  challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_passkey_challenges_expires ON passkey_challenges(expires_at);
CREATE INDEX idx_passkey_challenges_user ON passkey_challenges(user_id, action);

-- migrate:down
DROP TABLE IF EXISTS passkey_challenges;
DROP TABLE IF EXISTS user_passkeys;
