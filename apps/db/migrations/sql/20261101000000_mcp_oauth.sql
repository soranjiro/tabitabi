-- migrate:up

CREATE TABLE mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE mcp_oauth_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  state TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (client_id) REFERENCES mcp_oauth_clients(client_id)
);
CREATE INDEX idx_mcp_oauth_requests_exp ON mcp_oauth_requests(expires_at);
CREATE TABLE mcp_oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_mcp_oauth_codes_exp ON mcp_oauth_codes(expires_at);
CREATE TABLE mcp_oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('access', 'refresh')),
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_mcp_oauth_tokens_exp ON mcp_oauth_tokens(expires_at);

-- migrate:down
-- Keep authorization records during rollback to avoid invalidating existing connections unexpectedly.
