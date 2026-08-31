CREATE TABLE itinerary_favorites (
  user_id TEXT NOT NULL,
  itinerary_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, itinerary_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_itinerary_favorites_user_id ON itinerary_favorites(user_id);
CREATE INDEX idx_itinerary_favorites_itinerary_id ON itinerary_favorites(itinerary_id);
