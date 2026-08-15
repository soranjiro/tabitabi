-- migrate:up


-- migrate:down
-- Track money collected into a shared trip fund and expenses paid from it.
ALTER TABLE itinerary_money_items
  ADD COLUMN paid_from_fund INTEGER NOT NULL DEFAULT 0 CHECK(paid_from_fund IN (0, 1));

CREATE TABLE itinerary_money_fund_transactions (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('contribution', 'refund')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  note TEXT,
  occurred_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id, itinerary_id)
    REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT
);

CREATE INDEX idx_money_fund_transactions_itinerary
  ON itinerary_money_fund_transactions(itinerary_id, occurred_on, created_at);
CREATE INDEX idx_money_fund_transactions_member
  ON itinerary_money_fund_transactions(itinerary_id, member_id);
