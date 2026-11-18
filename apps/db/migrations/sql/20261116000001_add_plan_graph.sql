-- Each itinerary has one revision-controlled branching timeline.
-- Published snapshots receive a sanitized, independent copy.
CREATE TABLE IF NOT EXISTS itinerary_plan_graphs (
  itinerary_id TEXT PRIMARY KEY REFERENCES itineraries(id) ON DELETE CASCADE,
  nodes_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(nodes_json)),
  edges_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(edges_json)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0),
  updated_at TEXT NOT NULL
);
