-- Local development data using the same source -> public snapshot model as production.
INSERT OR IGNORE INTO users (
  id, username, email, password_hash, prefecture,
  email_verified_at, created_at, updated_at
) VALUES (
  'local-user-aoi', 'aoi_local', 'aoi.local@example.com', '!firebase-managed!', '東京都',
  '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'
);

INSERT OR IGNORE INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password,
  source_itinerary_id, created_at, updated_at
) VALUES (
  'local-kyoto-source', '朝の京都と喫茶店をめぐる2日間', 'standard-spring', 'dayCard',
  '{"text":"朝の静かな時間を中心に、歩きすぎない日程にしました。"}', NULL,
  NULL, '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'
);

INSERT OR IGNORE INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password,
  source_itinerary_id, created_at, updated_at
) VALUES (
  'local-kyoto-public', '朝の京都と喫茶店をめぐる2日間', 'standard-spring', 'dayCard',
  '{"text":"朝の静かな時間を中心に、歩きすぎない日程にしました。"}', NULL,
  'local-kyoto-source', '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'
);

INSERT OR IGNORE INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes,
  link, type, is_all_day, created_at, updated_at
) VALUES
  ('local-public-step-1', 'local-kyoto-public', '清水寺の開門に合わせて散歩', 1791676800000, 1791680400000, '清水寺', '', NULL, 'normal:sightseeing', 0, '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'),
  ('local-public-step-2', 'local-kyoto-public', '東山の喫茶店で朝ごはん', 1791684000000, 1791687600000, '東山', '', NULL, 'normal:food', 0, '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'),
  ('local-public-step-3', 'local-kyoto-public', '鴨川沿いを歩いて宿へ', 1791712800000, 1791718200000, '鴨川', '', NULL, 'normal:sightseeing', 0, '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z');

INSERT OR IGNORE INTO user_bookmarks (
  user_id, itinerary_id, is_visible, created_at, updated_at
) VALUES (
  'local-user-aoi', 'local-kyoto-source', 1,
  '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'
);

INSERT OR REPLACE INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id,
  prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'local-kyoto-source', 'local-kyoto-public', 'local-user-aoi',
  '["kyoto"]', '["東山","鴨川"]', '["寺社・歴史","カフェ"]',
  '2026-08-12T00:00:00.000Z', '2026-08-12T00:00:00.000Z'
);

INSERT OR REPLACE INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('local-kyoto-public', 3);
