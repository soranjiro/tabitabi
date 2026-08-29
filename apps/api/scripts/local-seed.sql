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

-- Official examples shown in the public feed. Each source itinerary is kept
-- separate from its immutable public snapshot, matching the production flow.
INSERT OR IGNORE INTO users (
  id, username, email, password_hash, prefecture,
  email_verified_at, created_at, updated_at
) VALUES (
  'official-user', 'tabitabi_official', 'official@tabitabi.jp', '!firebase-managed!', '東京都',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

INSERT OR IGNORE INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-iriya-source', '祖谷の秘境旅', 'map-only', 'dayCard', '{"text":"祖谷渓の清流と吊り橋をめぐる、静かな2日間。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-iriya-public', '祖谷の秘境旅', 'map-only', 'dayCard', '{"text":"祖谷渓の清流と吊り橋をめぐる、静かな2日間。"}', NULL, 'official-iriya-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-source', '京都、春のおでかけ', 'standard-spring', 'dayCard', '{"text":"朝の寺社と春色の甘味を楽しむ、歩きやすい京都旅。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-public', '京都、春のおでかけ', 'standard-spring', 'dayCard', '{"text":"朝の寺社と春色の甘味を楽しむ、歩きやすい京都旅。"}', NULL, 'official-kyoto-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-source', '夏の沖縄3泊4日', 'standard-summer', 'dayCard', '{"text":"海、島の風、沖縄ごはんを無理なく楽しむ3泊4日。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-public', '夏の沖縄3泊4日', 'standard-summer', 'dayCard', '{"text":"海、島の風、沖縄ごはんを無理なく楽しむ3泊4日。"}', NULL, 'official-okinawa-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-tokyo-source', '東京カフェ巡り', 'shopping', 'dayCard', '{"text":"気になる店をつないで歩く、休日の東京カフェ巡り。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-tokyo-public', '東京カフェ巡り', 'shopping', 'dayCard', '{"text":"気になる店をつないで歩く、休日の東京カフェ巡り。"}', NULL, 'official-tokyo-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-pixel-source', 'Pixel風の旅行', 'pixel-quest', 'dayCard', '{"text":"小さな発見を集める、ゲームのような街歩き。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-pixel-public', 'Pixel風の旅行', 'pixel-quest', 'dayCard', '{"text":"小さな発見を集める、ゲームのような街歩き。"}', NULL, 'official-pixel-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-map-source', 'Map中心の旅行', 'mapbox-journey', 'dayCard', '{"text":"地図を眺めながら絶景をつなぐ、山あいのドライブ旅。"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-map-public', 'Map中心の旅行', 'mapbox-journey', 'dayCard', '{"text":"地図を眺めながら絶景をつなぐ、山あいのドライブ旅。"}', NULL, 'official-map-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT OR REPLACE INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
) VALUES
  ('official-iriya-step-1', 'official-iriya-public', 'かずら橋を渡る', 1798588800000, 1798596000000, '祖谷のかずら橋', '{"text":"朝の空いている時間がおすすめ"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-iriya-step-2', 'official-iriya-public', '祖谷そばを味わう', 1798603200000, 1798608600000, '祖谷そば もみじ亭', '{"text":"山菜の天ぷらも一緒に"}', NULL, 'normal:food', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-iriya-step-3', 'official-iriya-public', '大歩危峡を舟で巡る', 1798693200000, 1798704000000, '大歩危峡', '{"text":"渓谷の岩肌を間近に眺める"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-step-1', 'official-kyoto-public', '哲学の道を歩く', 1774656000000, 1774663200000, '哲学の道', '{"text":"桜の朝にゆっくり散歩"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-step-2', 'official-kyoto-public', '南禅寺で水路閣を見る', 1774666800000, 1774674000000, '南禅寺', '{"text":"境内の奥まで足をのばす"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-step-3', 'official-kyoto-public', '抹茶と季節の甘味', 1774681200000, 1774686600000, '祇園四条', '{"text":"ひと休みしてから帰路へ"}', NULL, 'normal:food', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-step-1', 'official-okinawa-public', '那覇の朝市を歩く', 1780358400000, 1780365600000, '第一牧志公設市場', '{"text":"沖縄の朝ごはんを探す"}', NULL, 'normal:food', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-step-2', 'official-okinawa-public', '青の洞窟でシュノーケル', 1780448400000, 1780462800000, '恩納村', '{"text":"水分補給を忘れずに"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-step-3', 'official-okinawa-public', '古宇利島へドライブ', 1780534800000, 1780552800000, '古宇利島', '{"text":"橋の上から海を眺める"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-okinawa-step-4', 'official-okinawa-public', '夕暮れの港で島料理', 1780621200000, 1780632000000, '那覇・泊港', '{"text":"旅の最後は郷土料理で締める"}', NULL, 'normal:food', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-tokyo-step-1', 'official-tokyo-public', '谷中の路地を散策', 1763280000000, 1763289000000, '谷中銀座', '{"text":"焼き菓子を片手に歩く"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-tokyo-step-2', 'official-tokyo-public', '自家焙煎コーヒー', 1763292600000, 1763299800000, '上野・蔵前', '{"text":"気になる豆をおみやげに"}', NULL, 'normal:shopping', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-tokyo-step-3', 'official-tokyo-public', '夕方の本屋と喫茶店', 1763305200000, 1763312400000, '神保町', '{"text":"本を一冊選んで帰る"}', NULL, 'normal:shopping', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-pixel-step-1', 'official-pixel-public', 'スタート地点で地図を開く', 1764576000000, 1764579600000, '浅草駅', '{"text":"今日のクエストを確認"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-pixel-step-2', 'official-pixel-public', '隠れた路地の宝箱を探す', 1764583200000, 1764590400000, '浅草・合羽橋', '{"text":"看板や小さな店を見つける"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-pixel-step-3', 'official-pixel-public', '夜の光る街へ', 1764597600000, 1764604800000, '東京スカイツリー', '{"text":"一日の冒険を振り返る"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-map-step-1', 'official-map-public', '上高地の朝を歩く', 1760860800000, 1760871600000, '河童橋', '{"text":"朝靄の梓川を眺める"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-map-step-2', 'official-map-public', '大正池までハイキング', 1760875200000, 1760893200000, '大正池', '{"text":"歩きやすい靴で出発"}', NULL, 'normal:sightseeing', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-map-step-3', 'official-map-public', '山を眺める温泉', 1760950800000, 1760961600000, '白骨温泉', '{"text":"旅の疲れをゆっくり癒やす"}', NULL, 'normal:hotel', 0, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT OR IGNORE INTO user_bookmarks (
  user_id, itinerary_id, is_visible, created_at, updated_at
) VALUES
  ('official-user', 'official-iriya-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-user', 'official-kyoto-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-user', 'official-okinawa-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-user', 'official-tokyo-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-user', 'official-pixel-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-user', 'official-map-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT OR REPLACE INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
) VALUES
  ('official-iriya-source', 'official-iriya-public', 'official-user', '["tokushima"]', '["祖谷渓","大歩危"]', '["秘境","自然"]', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-kyoto-source', 'official-kyoto-public', 'official-user', '["kyoto"]', '["哲学の道","祇園"]', '["寺社・歴史","カフェ"]', '2026-08-30T00:01:00.000Z', '2026-08-30T00:01:00.000Z'),
  ('official-okinawa-source', 'official-okinawa-public', 'official-user', '["okinawa"]', '["那覇","恩納村","古宇利島"]', '["海","ドライブ"]', '2026-08-30T00:02:00.000Z', '2026-08-30T00:02:00.000Z'),
  ('official-tokyo-source', 'official-tokyo-public', 'official-user', '["tokyo"]', '["谷中","蔵前","神保町"]', '["カフェ","街歩き"]', '2026-08-30T00:03:00.000Z', '2026-08-30T00:03:00.000Z'),
  ('official-pixel-source', 'official-pixel-public', 'official-user', '["tokyo"]', '["浅草","合羽橋"]', '["ゲーム","街歩き"]', '2026-08-30T00:04:00.000Z', '2026-08-30T00:04:00.000Z'),
  ('official-map-source', 'official-map-public', 'official-user', '["nagano"]', '["上高地","白骨温泉"]', '["絶景","ドライブ"]', '2026-08-30T00:05:00.000Z', '2026-08-30T00:05:00.000Z');

INSERT OR REPLACE INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES
  ('official-iriya-public', 12),
  ('official-kyoto-public', 18),
  ('official-okinawa-public', 24),
  ('official-tokyo-public', 15),
  ('official-pixel-public', 9),
  ('official-map-public', 21);
