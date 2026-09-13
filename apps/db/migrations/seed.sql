-- Minimal preview-only seed.
-- IMPORTANT:
--   - Production must never execute this file.
--   - Preview D1 is recreated before this runs, so DELETE/cleanup statements are intentionally omitted.
--   - One editable itinerary + one published copy.
--   - One scheduled step, while money/fund/packing/publication features remain represented.

INSERT INTO users (
  id, username, email, password_hash, prefecture,
  email_verified_at, created_at, updated_at
) VALUES (
  'preview-user',
  'preview_user',
  'preview@example.com',
  '!firebase-managed!',
  '京都府',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO itineraries (
  id, title, theme_id, palette_id, packing_enabled,
  prefecture_slugs, areas, tags, metadata_initialized,
  memo, password, source_itinerary_id,
  background_image, background_display,
  created_at, updated_at
) VALUES
(
  'preview-trip-source',
  '京都ミニ旅行',
  'daycard',
  'sakura',
  1,
  '["kyoto"]',
  '["清水寺"]',
  '["寺社・歴史"]',
  1,
  '{"text":"Preview環境用の最小サンプルです。"}',
  NULL,
  NULL,
  '/itinerary-backgrounds/japanese.avif',
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public',
  '京都ミニ旅行',
  'daycard',
  'sakura',
  1,
  '["kyoto"]',
  '["清水寺"]',
  '["寺社・歴史"]',
  1,
  '{"text":"Preview環境用の最小サンプルです。"}',
  NULL,
  'preview-trip-source',
  '/itinerary-backgrounds/japanese.avif',
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public-summer',
  '夏休みの沖縄旅行',
  'daycard',
  'sakura',
  1,
  '[]',
  '[]',
  '[]',
  1,
  '{"text":"Preview環境用の公式しおりです。"}',
  NULL,
  'preview-trip-source',
  NULL,
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public-autumn',
  '日光・会津 紅葉と温泉',
  'daycard',
  'sakura',
  1,
  '[]',
  '[]',
  '[]',
  1,
  '{"text":"Preview環境用の公式しおりです。"}',
  NULL,
  'preview-trip-source',
  NULL,
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public-winter',
  '冬の北海道 湯めぐり18日間',
  'daycard',
  'sakura',
  1,
  '[]',
  '[]',
  '[]',
  1,
  '{"text":"Preview環境用の公式しおりです。"}',
  NULL,
  'preview-trip-source',
  NULL,
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public-plan',
  '紫陽花の鎌倉・江の島',
  'daycard',
  'sakura',
  1,
  '[]',
  '[]',
  '[]',
  1,
  '{"text":"Preview環境用の公式しおりです。"}',
  NULL,
  'preview-trip-source',
  NULL,
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-trip-public-map',
  '秋の金沢 王道まち歩き',
  'daycard',
  'sakura',
  1,
  '[]',
  '[]',
  '[]',
  1,
  '{"text":"Preview環境用の公式しおりです。"}',
  NULL,
  'preview-trip-source',
  NULL,
  'cover',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

-- A single step covers date/time, place/map coordinates, notes, type/icon and external link.
INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location,
  notes, link, type, is_all_day, created_at, updated_at
) VALUES (
  'preview-trip-source-step',
  'preview-trip-source',
  '清水寺へ',
  CAST(strftime('%s', '2026-10-10T10:00:00+09:00') AS INTEGER) * 1000,
  CAST(strftime('%s', '2026-10-10T12:00:00+09:00') AS INTEGER) * 1000,
  'Kiyomizudera Japan · Osaka Prefecture · Osaka · Tennōji Ward · Kiyomizuzaka',
  '{"text":"境内を散策する。","tabitabi_schedule":{"precision":"time","day":1,"order":1},"tabitabi_place":{"lat":34.994303,"lng":135.784439,"priority":true}}',
  'https://www.kiyomizudera.or.jp/',
  'normal:sightseeing',
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location,
  notes, link, type, is_all_day, created_at, updated_at
)
SELECT
  'preview-trip-public-step',
  'preview-trip-public',
  title, start_at, end_at, location, notes, link, type, is_all_day,
  created_at, updated_at
FROM steps
WHERE id = 'preview-trip-source-step';

INSERT INTO user_bookmarks (
  user_id, itinerary_id, is_visible, created_at, updated_at
) VALUES (
  'preview-user',
  'preview-trip-source',
  1,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id,
  prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'preview-trip-source',
  'preview-trip-public',
  'preview-user',
  '["kyoto"]',
  '["清水寺"]',
  '["寺社・歴史"]',
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

-- These aliases are preview-local. Production aliases are configured against the
-- real official account outside of migrations and seed data.
INSERT INTO official_itinerary_aliases (alias, itinerary_id) VALUES
  ('official-spring-public', 'preview-trip-public'),
  ('official-summer-public', 'preview-trip-public-summer'),
  ('official-autumn-public', 'preview-trip-public-autumn'),
  ('official-winter-public', 'preview-trip-public-winter'),
  ('official-plan-public', 'preview-trip-public-plan'),
  ('official-map-public', 'preview-trip-public-map');

INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('preview-trip-public', 1);

-- Two members are the minimum useful shape for split/settlement behavior.
INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES
  ('preview-trip-member-a', 'preview-trip-source', 'あおい', '2026-09-13T00:00:00.000Z'),
  ('preview-trip-member-b', 'preview-trip-source', 'はる',   '2026-09-13T00:00:00.000Z');

INSERT INTO itinerary_money_settings (
  itinerary_id, budget_amount, created_at, updated_at
) VALUES (
  'preview-trip-source',
  50000,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

-- One personal advance + one fund payment.
INSERT INTO itinerary_money_items (
  id, itinerary_id, title, amount, paid_by_member_id,
  paid_from_fund, status, occurred_on, step_id,
  is_settled, created_at, updated_at
) VALUES
(
  'preview-money-hotel',
  'preview-trip-source',
  '宿泊費',
  20000,
  'preview-trip-member-a',
  0,
  'paid',
  '2026-10-10',
  NULL,
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-money-food',
  'preview-trip-source',
  '夕食',
  6000,
  NULL,
  1,
  'paid',
  '2026-10-10',
  'preview-trip-source-step',
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO itinerary_money_item_splits (
  item_id, member_id, itinerary_id, amount
) VALUES
  ('preview-money-hotel', 'preview-trip-member-a', 'preview-trip-source', 10000),
  ('preview-money-hotel', 'preview-trip-member-b', 'preview-trip-source', 10000),
  ('preview-money-food',  'preview-trip-member-a', 'preview-trip-source', 3000),
  ('preview-money-food',  'preview-trip-member-b', 'preview-trip-source', 3000);

-- A single contribution is enough to exercise the fund balance and fund-payment path.
INSERT INTO itinerary_money_fund_transactions (
  id, itinerary_id, member_id, kind, amount, note, occurred_on, created_at
) VALUES (
  'preview-fund',
  'preview-trip-source',
  'preview-trip-member-b',
  'contribution',
  10000,
  '共同基金',
  '2026-10-01',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO itinerary_packing_groups (
  id, itinerary_id, name, sort_order, created_at, updated_at
) VALUES (
  'preview-pack',
  'preview-trip-source',
  '持ち物',
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

-- Three rows are needed to cover personal/shared/private packing behavior.
INSERT INTO itinerary_packing_items (
  id, itinerary_id, name, quantity, kind, group_id,
  assignee_member_id, owner_member_id, is_packed,
  created_at, updated_at
) VALUES
(
  'preview-item-wallet',
  'preview-trip-source',
  '財布',
  1,
  'personal',
  'preview-pack',
  NULL,
  NULL,
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-item-camera',
  'preview-trip-source',
  'カメラ',
  1,
  'shared',
  'preview-pack',
  'preview-trip-member-a',
  NULL,
  1,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
),
(
  'preview-item-medicine',
  'preview-trip-source',
  '常備薬',
  1,
  'private',
  'preview-pack',
  NULL,
  'preview-trip-member-b',
  0,
  '2026-09-13T00:00:00.000Z',
  '2026-09-13T00:00:00.000Z'
);

INSERT INTO itinerary_packing_checks (
  item_id, member_id, itinerary_id, checked_at
) VALUES (
  'preview-item-wallet',
  'preview-trip-member-a',
  'preview-trip-source',
  '2026-09-13T00:00:00.000Z'
);
