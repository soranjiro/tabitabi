ALTER TABLE itineraries ADD COLUMN palette_id TEXT NOT NULL DEFAULT 'sakura';

UPDATE itineraries
SET palette_id = CASE theme_id
  WHEN 'standard-summer' THEN 'ocean'
  WHEN 'standard-autumn' THEN 'autumn'
  WHEN 'standard-winter' THEN 'snow'
  ELSE 'sakura'
END;
