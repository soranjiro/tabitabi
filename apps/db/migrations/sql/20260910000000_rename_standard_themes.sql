-- migration-rewrite-base-blob: f1a0b3f16f4f696db689d6554796a4100998c2f1
-- migrate:up

-- Theme IDs now represent their layout rather than a seasonal color palette.
-- Keep palette_id untouched: it continues to carry the former seasonal color.
-- Do not recreate itineraries here: child tables reference it with ON DELETE CASCADE.
UPDATE itineraries
SET theme_id = CASE theme_id
  WHEN 'standard-spring' THEN 'daycard'
  WHEN 'standard-accordion' THEN 'accordion'
  WHEN 'standard-summer' THEN 'list'
  WHEN 'standard-autumn' THEN 'week'
  WHEN 'standard-winter' THEN 'month'
  ELSE theme_id
END
WHERE theme_id IN (
  'standard-spring', 'standard-accordion', 'standard-summer',
  'standard-autumn', 'standard-winter'
);

-- migrate:down

UPDATE itineraries
SET theme_id = CASE theme_id
  WHEN 'daycard' THEN 'standard-spring'
  WHEN 'accordion' THEN 'standard-accordion'
  WHEN 'list' THEN 'standard-summer'
  WHEN 'week' THEN 'standard-autumn'
  WHEN 'month' THEN 'standard-winter'
  ELSE theme_id
END
WHERE theme_id IN (
  'daycard', 'accordion', 'list', 'week', 'month'
);
