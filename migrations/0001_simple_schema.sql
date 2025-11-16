-- Itineraries table
CREATE TABLE itineraries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Steps table
CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  time TEXT,
  location TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_steps_itinerary ON steps(itinerary_id);
CREATE INDEX idx_steps_order ON steps(itinerary_id, order_num);
