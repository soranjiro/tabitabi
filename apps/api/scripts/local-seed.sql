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

-- Official seasonal examples shown in the public feed.
-- Generated from the four standard-seasons demo-data.ts files.
-- Re-seeding removes the previous official examples before recreating them.
DELETE FROM users WHERE id = 'official-user';
DELETE FROM itineraries WHERE id LIKE 'official-%-source';
DELETE FROM itineraries WHERE id LIKE 'official-%-public';

INSERT INTO users (
  id, username, email, password_hash, prefecture,
  email_verified_at, created_at, updated_at
) VALUES (
  'official-user', 'tabitabi_official', 'official@tabitabi.jp', '!firebase-managed!', '東京都',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

-- spring: 春休みの京都旅行
INSERT INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-spring-source', '春休みの京都旅行', 'standard-spring', 'dayCard', '{"text":"桜シーズンは混雑するので早めの行動を！\n\n持ち物リスト\n- カメラ\n- 日焼け止め\n- 歩きやすい靴"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public', '春休みの京都旅行', 'standard-spring', 'dayCard', '{"text":"桜シーズンは混雑するので早めの行動を！\n\n持ち物リスト\n- カメラ\n- 日焼け止め\n- 歩きやすい靴"}', NULL, 'official-spring-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
) VALUES
  ('official-spring-source-allday', 'official-spring-source', '祇園白川桜祭り（終日）', '1788015600000', '1788101940000', '祇園白川', '{"text":"一日中桜のイベントが開催。夜桜ライトアップも"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-1', 'official-spring-source', '清水寺参拝', '1788048000000', '1788055200000', '京都市東山区', '{"text":"桜の名所。清水の舞台からの眺めは絶景。"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-2', 'official-spring-source', '祇園で懐石料理', '1788058800000', '1788064200000', '祇園', '{"text":"京料理を堪能"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-2-transport', 'official-spring-source', '祇園から嵐山へ移動', '1788064200000', '1788067800000', '京都市内', '{"text":"移動中：電車での移動を想定"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-3', 'official-spring-source', '嵐山の桜散策', '1788069600000', '1788080400000', '嵐山', '{"text":"竹林の小径と渡月橋を歩く"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-hotel', 'official-spring-source', '京都駅前ホテル宿泊', '1788087600000', '1788134400000', '京都駅前', '{"text":"2日目の朝まで宿泊。朝食バイキング付き", "booking_url":"https://www.jalan.net/yad362380"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-4', 'official-spring-source', '貴船神社の川沿い歩き', '1788138000000', '1788145200000', '貴船', '{"text":"縁結びの神社。新緑と桜のコントラスト"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-transport2', 'official-spring-source', '貴船から哲学の道へ移動', '1788147000000', '1788152400000', '京都市内', '{"text":"バスと徒歩での移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-5', 'official-spring-source', '哲学の道散歩', '1788152400000', '1788157800000', '左京区', '{"text":"桜のトンネルを歩く"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-6', 'official-spring-source', '伏見稲荷大社', '1788220800000', '1788229800000', '伏見区', '{"text":"千本鳥居を散策"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-7', 'official-spring-source', '宇治の平等院鳳凰堂', '1788235200000', '1788242400000', '宇治市', '{"text":"世界遺産を訪問。抹茶スイーツも楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-breakfast', 'official-spring-source', '朝食：和定食（宿泊先）', '1788132600000', '1788135300000', '京都駅前', '{"text":"ホテル宿泊時は朝食バイキング付き"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-concurrent1', 'official-spring-source', '清水焼の絵付け体験', '1788048000000', '1788053400000', '五条坂', '{"text":"陶芸体験。予約推奨"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-concurrent2', 'official-spring-source', 'ガイディングツアー：清水寺', '1788048000000', '1788055200000', '京都市東山区', '{"text":"別ルートでのガイド付き参拝プランも可"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-source-afternoon', 'official-spring-source', '京都駅でお土産購入', '1788244200000', '1788247800000', '京都駅', '{"text":"帰路前に京都限定のお菓子などを購入"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-allday', 'official-spring-public', '祇園白川桜祭り（終日）', '1788015600000', '1788101940000', '祇園白川', '{"text":"一日中桜のイベントが開催。夜桜ライトアップも"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-1', 'official-spring-public', '清水寺参拝', '1788048000000', '1788055200000', '京都市東山区', '{"text":"桜の名所。清水の舞台からの眺めは絶景。"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-2', 'official-spring-public', '祇園で懐石料理', '1788058800000', '1788064200000', '祇園', '{"text":"京料理を堪能"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-2-transport', 'official-spring-public', '祇園から嵐山へ移動', '1788064200000', '1788067800000', '京都市内', '{"text":"移動中：電車での移動を想定"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-3', 'official-spring-public', '嵐山の桜散策', '1788069600000', '1788080400000', '嵐山', '{"text":"竹林の小径と渡月橋を歩く"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-hotel', 'official-spring-public', '京都駅前ホテル宿泊', '1788087600000', '1788134400000', '京都駅前', '{"text":"2日目の朝まで宿泊。朝食バイキング付き", "booking_url":"https://www.jalan.net/yad362380"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-4', 'official-spring-public', '貴船神社の川沿い歩き', '1788138000000', '1788145200000', '貴船', '{"text":"縁結びの神社。新緑と桜のコントラスト"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-transport2', 'official-spring-public', '貴船から哲学の道へ移動', '1788147000000', '1788152400000', '京都市内', '{"text":"バスと徒歩での移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-5', 'official-spring-public', '哲学の道散歩', '1788152400000', '1788157800000', '左京区', '{"text":"桜のトンネルを歩く"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-6', 'official-spring-public', '伏見稲荷大社', '1788220800000', '1788229800000', '伏見区', '{"text":"千本鳥居を散策"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-7', 'official-spring-public', '宇治の平等院鳳凰堂', '1788235200000', '1788242400000', '宇治市', '{"text":"世界遺産を訪問。抹茶スイーツも楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-breakfast', 'official-spring-public', '朝食：和定食（宿泊先）', '1788132600000', '1788135300000', '京都駅前', '{"text":"ホテル宿泊時は朝食バイキング付き"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-concurrent1', 'official-spring-public', '清水焼の絵付け体験', '1788048000000', '1788053400000', '五条坂', '{"text":"陶芸体験。予約推奨"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-concurrent2', 'official-spring-public', 'ガイディングツアー：清水寺', '1788048000000', '1788055200000', '京都市東山区', '{"text":"別ルートでのガイド付き参拝プランも可"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-spring-public-afternoon', 'official-spring-public', '京都駅でお土産購入', '1788244200000', '1788247800000', '京都駅', '{"text":"帰路前に京都限定のお菓子などを購入"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-spring-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'official-spring-source', 'official-spring-public', 'official-user',
  '["kyoto"]', '["清水寺","祇園","嵐山"]', '["寺社・歴史","グルメ"]',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('official-spring-public', 28);

-- summer: 夏休みの沖縄旅行
INSERT INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-summer-source', '夏休みの沖縄旅行', 'standard-summer', 'list', '{"text":"真夏の沖縄！水分補給をこまめに\n\n持ち物リスト\n- 水着\n- 日焼け止め\n- サングラス\n- 帽子"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public', '夏休みの沖縄旅行', 'standard-summer', 'list', '{"text":"真夏の沖縄！水分補給をこまめに\n\n持ち物リスト\n- 水着\n- 日焼け止め\n- サングラス\n- 帽子"}', NULL, 'official-summer-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
) VALUES
  ('official-summer-source-allday', 'official-summer-source', 'エイサー祭り（終日）', '1788015600000', '1788101940000', '那覇市国際通り', '{"text":"一日中沖縄の伝統芸能エイサーを楽しめる"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-1', 'official-summer-source', '那覇空港到着', '1788051600000', '1788055200000', '那覇市', '{"text":"レンタカーを借りて出発！"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-1-transport', 'official-summer-source', '空港からビーチへ移動', '1788056100000', '1788061500000', '恩納村へ移動', '{"text":"レンタカーでの移動を想定"}', NULL, 'transport:car', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-2', 'official-summer-source', 'ビーチでシュノーケリング', '1788066000000', '1788076800000', '恩納村', '{"text":"青い海でカラフルな魚を見る"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-hotel', 'official-summer-source', '恩納村リゾートホテル宿泊', '1788084000000', '1788132600000', '恩納村', '{"text":"オーシャンビューのリゾートホテル。朝食とプール付き"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-3', 'official-summer-source', 'やちむん（陶芸）体験', '1788138000000', '1788145200000', '読谷村', '{"text":"沖縄の伝統陶器を作る"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-lunch', 'official-summer-source', 'タコライス＆ソーキそば', '1788147000000', '1788150600000', '北谷町', '{"text":"沖縄グルメを堪能"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-4', 'official-summer-source', 'グラスボート', '1788152400000', '1788157800000', '恩納村', '{"text":"海底のサンゴ礁を観察"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-transport2', 'official-summer-source', '恩納村から首里城へ移動', '1788220800000', '1788224400000', '那覇市へ移動', '{"text":"最終日の観光スポットへ"}', NULL, 'transport:car', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-5', 'official-summer-source', '首里城見学', '1788224400000', '1788233400000', '那覇市', '{"text":"琉球王国の歴史を学ぶ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-breakfast', 'official-summer-source', 'ホテルの朝食ビュッフェ', '1788132600000', '1788135300000', '恩納村', '{"text":"リゾートホテル宿泊時の朝食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-concurrent1', 'official-summer-source', 'アクティビティ：バナナボート', '1788066000000', '1788071400000', '恩納村', '{"text":"スリル満点のマリンスポーツ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-concurrent2', 'official-summer-source', '別プラン：自由時間・荷物整理', '1788066000000', '1788073200000', '恩納村', '{"text":"ビーチでのんびり過ごす"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-source-exit', 'official-summer-source', '那覇空港から帰路', '1788246000000', '1788253200000', '那覇空港', '{"text":"帰宅便出発"}', NULL, 'transport:plane', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-allday', 'official-summer-public', 'エイサー祭り（終日）', '1788015600000', '1788101940000', '那覇市国際通り', '{"text":"一日中沖縄の伝統芸能エイサーを楽しめる"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-1', 'official-summer-public', '那覇空港到着', '1788051600000', '1788055200000', '那覇市', '{"text":"レンタカーを借りて出発！"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-1-transport', 'official-summer-public', '空港からビーチへ移動', '1788056100000', '1788061500000', '恩納村へ移動', '{"text":"レンタカーでの移動を想定"}', NULL, 'transport:car', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-2', 'official-summer-public', 'ビーチでシュノーケリング', '1788066000000', '1788076800000', '恩納村', '{"text":"青い海でカラフルな魚を見る"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-hotel', 'official-summer-public', '恩納村リゾートホテル宿泊', '1788084000000', '1788132600000', '恩納村', '{"text":"オーシャンビューのリゾートホテル。朝食とプール付き"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-3', 'official-summer-public', 'やちむん（陶芸）体験', '1788138000000', '1788145200000', '読谷村', '{"text":"沖縄の伝統陶器を作る"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-lunch', 'official-summer-public', 'タコライス＆ソーキそば', '1788147000000', '1788150600000', '北谷町', '{"text":"沖縄グルメを堪能"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-4', 'official-summer-public', 'グラスボート', '1788152400000', '1788157800000', '恩納村', '{"text":"海底のサンゴ礁を観察"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-transport2', 'official-summer-public', '恩納村から首里城へ移動', '1788220800000', '1788224400000', '那覇市へ移動', '{"text":"最終日の観光スポットへ"}', NULL, 'transport:car', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-5', 'official-summer-public', '首里城見学', '1788224400000', '1788233400000', '那覇市', '{"text":"琉球王国の歴史を学ぶ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-breakfast', 'official-summer-public', 'ホテルの朝食ビュッフェ', '1788132600000', '1788135300000', '恩納村', '{"text":"リゾートホテル宿泊時の朝食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-concurrent1', 'official-summer-public', 'アクティビティ：バナナボート', '1788066000000', '1788071400000', '恩納村', '{"text":"スリル満点のマリンスポーツ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-concurrent2', 'official-summer-public', '別プラン：自由時間・荷物整理', '1788066000000', '1788073200000', '恩納村', '{"text":"ビーチでのんびり過ごす"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-summer-public-exit', 'official-summer-public', '那覇空港から帰路', '1788246000000', '1788253200000', '那覇空港', '{"text":"帰宅便出発"}', NULL, 'transport:plane', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-summer-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'official-summer-source', 'official-summer-public', 'official-user',
  '["okinawa"]', '["那覇","恩納村","読谷村"]', '["絶景","グルメ"]',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('official-summer-public', 34);

-- autumn: 日光・那須をめぐる秋の5日間
INSERT INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-autumn-source', '日光・那須をめぐる秋の5日間', 'standard-autumn', 'week', '{"text":"紅葉シーズンは混雑するので早めの行動を！\n\n持ち物リスト\n- カメラ\n- 防寒具"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public', '日光・那須をめぐる秋の5日間', 'standard-autumn', 'week', '{"text":"紅葉シーズンは混雑するので早めの行動を！\n\n持ち物リスト\n- カメラ\n- 防寒具"}', NULL, 'official-autumn-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
) VALUES
  ('official-autumn-source-allday', 'official-autumn-source', '紅葉祭り（終日）', '1788015600000', '1788101940000', '日光市内各所', '{"text":"終日イベント開催中"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-1', 'official-autumn-source', '日光東照宮参拝', '1788048000000', '1788057000000', '栃木県日光市', '{"text":"世界遺産。紅葉と歴史的建築の組み合わせが美しい。"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-2', 'official-autumn-source', '湯滝観瀑', '1788058800000', '1788064200000', '奥日光', '{"text":"紅葉に囲まれた滝の絶景"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-2-transport', 'official-autumn-source', '湯滝から華厳滝へ移動', '1788064200000', '1788067800000', '中禅寺湖周辺', '{"text":"バスでの移動を想定"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-3', 'official-autumn-source', '華厳滝', '1788069600000', '1788073200000', '中禅寺湖畔', '{"text":"日本三大名瀑のひとつ"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-multiday', 'official-autumn-source', '温泉旅館宿泊', '1788080400000', '1788138000000', '日光温泉郷', '{"text":"2日目の朝まで温泉宿でゆっくり"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-4', 'official-autumn-source', '中禅寺湖散策', '1788138000000', '1788145200000', '中禅寺湖', '{"text":"遊覧船で紅葉を楽しむ"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-5', 'official-autumn-source', '豆腐懐石料理', '1788148800000', '1788154200000', '日光市内', '{"text":"日光名物の湯波料理を堪能"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-breakfast', 'official-autumn-source', '旅館の朝食', '1788132600000', '1788135300000', '日光温泉郷', '{"text":"温泉宿泊時の朝食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-concurrent1', 'official-autumn-source', '日光自然博物館', '1788048000000', '1788053400000', '奥日光', '{"text":"大人向けの自然史展示"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-concurrent2', 'official-autumn-source', 'ガイドツアー：東照宮', '1788048000000', '1788055200000', '栃木県日光市', '{"text":"別コースのガイド付きツアーオプション"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-ending', 'official-autumn-source', '帰路：日光から東京へ', '1788156000000', '1788163200000', '日光駅～東京駅', '{"text":"電車で帰宅"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day3-checkout', 'official-autumn-source', '旅館をチェックアウト', '1788222600000', '1788224400000', '日光温泉郷', '{"text":"荷物を預けて奥日光へ"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day3-transport', 'official-autumn-source', '那須高原へ移動', '1788226200000', '1788235200000', '日光駅〜那須塩原駅', '{"text":"電車とレンタカーで移動"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day3-lunch', 'official-autumn-source', '高原レストランでランチ', '1788237000000', '1788241500000', '那須高原', '{"text":"地元野菜を使ったランチ"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day3-ropeway', 'official-autumn-source', '那須ロープウェイと紅葉散策', '1788243300000', '1788251400000', '那須岳', '{"text":"山頂駅から姥ヶ平まで散策"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day3-hotel', 'official-autumn-source', '高原ホテルにチェックイン', '1788255000000', '1788309000000', '那須湯本', '{"text":"露天風呂から星空を楽しむ"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day4-morning', 'official-autumn-source', '朝の森を散歩', '1788301800000', '1788304500000', '那須平成の森', '{"text":"静かな森の朝を散歩"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day4-art', 'official-autumn-source', '美術館めぐり', '1788312600000', '1788321600000', '那須高原', '{"text":"企画展と建築を楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day4-cafe', 'official-autumn-source', 'カフェで休憩', '1788323400000', '1788327000000', '那須高原', '{"text":"焼き菓子とコーヒー"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day4-dinner', 'official-autumn-source', '地元食材のコースディナー', '1788339600000', '1788346800000', '那須湯本', '{"text":"旅の終盤をゆっくり楽しむ夕食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day5-checkout', 'official-autumn-source', 'ホテルをチェックアウト', '1788395400000', '1788397200000', '那須湯本', '{"text":"お土産を確認して出発"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day5-market', 'official-autumn-source', '道の駅でお土産選び', '1788399000000', '1788402600000', '那須高原', '{"text":"地元のジャムと焼き菓子を購入"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-source-day5-home', 'official-autumn-source', '東京へ帰宅', '1788408000000', '1788417000000', '那須塩原駅〜東京駅', '{"text":"新幹線で東京へ"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-allday', 'official-autumn-public', '紅葉祭り（終日）', '1788015600000', '1788101940000', '日光市内各所', '{"text":"終日イベント開催中"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-1', 'official-autumn-public', '日光東照宮参拝', '1788048000000', '1788057000000', '栃木県日光市', '{"text":"世界遺産。紅葉と歴史的建築の組み合わせが美しい。"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-2', 'official-autumn-public', '湯滝観瀑', '1788058800000', '1788064200000', '奥日光', '{"text":"紅葉に囲まれた滝の絶景"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-2-transport', 'official-autumn-public', '湯滝から華厳滝へ移動', '1788064200000', '1788067800000', '中禅寺湖周辺', '{"text":"バスでの移動を想定"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-3', 'official-autumn-public', '華厳滝', '1788069600000', '1788073200000', '中禅寺湖畔', '{"text":"日本三大名瀑のひとつ"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-multiday', 'official-autumn-public', '温泉旅館宿泊', '1788080400000', '1788138000000', '日光温泉郷', '{"text":"2日目の朝まで温泉宿でゆっくり"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-4', 'official-autumn-public', '中禅寺湖散策', '1788138000000', '1788145200000', '中禅寺湖', '{"text":"遊覧船で紅葉を楽しむ"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-5', 'official-autumn-public', '豆腐懐石料理', '1788148800000', '1788154200000', '日光市内', '{"text":"日光名物の湯波料理を堪能"}', NULL, 'normal:general', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-breakfast', 'official-autumn-public', '旅館の朝食', '1788132600000', '1788135300000', '日光温泉郷', '{"text":"温泉宿泊時の朝食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-concurrent1', 'official-autumn-public', '日光自然博物館', '1788048000000', '1788053400000', '奥日光', '{"text":"大人向けの自然史展示"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-concurrent2', 'official-autumn-public', 'ガイドツアー：東照宮', '1788048000000', '1788055200000', '栃木県日光市', '{"text":"別コースのガイド付きツアーオプション"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-ending', 'official-autumn-public', '帰路：日光から東京へ', '1788156000000', '1788163200000', '日光駅～東京駅', '{"text":"電車で帰宅"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day3-checkout', 'official-autumn-public', '旅館をチェックアウト', '1788222600000', '1788224400000', '日光温泉郷', '{"text":"荷物を預けて奥日光へ"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day3-transport', 'official-autumn-public', '那須高原へ移動', '1788226200000', '1788235200000', '日光駅〜那須塩原駅', '{"text":"電車とレンタカーで移動"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day3-lunch', 'official-autumn-public', '高原レストランでランチ', '1788237000000', '1788241500000', '那須高原', '{"text":"地元野菜を使ったランチ"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day3-ropeway', 'official-autumn-public', '那須ロープウェイと紅葉散策', '1788243300000', '1788251400000', '那須岳', '{"text":"山頂駅から姥ヶ平まで散策"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day3-hotel', 'official-autumn-public', '高原ホテルにチェックイン', '1788255000000', '1788309000000', '那須湯本', '{"text":"露天風呂から星空を楽しむ"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day4-morning', 'official-autumn-public', '朝の森を散歩', '1788301800000', '1788304500000', '那須平成の森', '{"text":"静かな森の朝を散歩"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day4-art', 'official-autumn-public', '美術館めぐり', '1788312600000', '1788321600000', '那須高原', '{"text":"企画展と建築を楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day4-cafe', 'official-autumn-public', 'カフェで休憩', '1788323400000', '1788327000000', '那須高原', '{"text":"焼き菓子とコーヒー"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day4-dinner', 'official-autumn-public', '地元食材のコースディナー', '1788339600000', '1788346800000', '那須湯本', '{"text":"旅の終盤をゆっくり楽しむ夕食"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day5-checkout', 'official-autumn-public', 'ホテルをチェックアウト', '1788395400000', '1788397200000', '那須湯本', '{"text":"お土産を確認して出発"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day5-market', 'official-autumn-public', '道の駅でお土産選び', '1788399000000', '1788402600000', '那須高原', '{"text":"地元のジャムと焼き菓子を購入"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-autumn-public-day5-home', 'official-autumn-public', '東京へ帰宅', '1788408000000', '1788417000000', '那須塩原駅〜東京駅', '{"text":"新幹線で東京へ"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-autumn-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'official-autumn-source', 'official-autumn-public', 'official-user',
  '["tochigi"]', '["日光","中禅寺湖","那須高原"]', '["絶景","温泉","寺社・歴史"]',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('official-autumn-public', 24);

-- winter: 冬休みのスキー旅行
INSERT INTO itineraries (
  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-winter-source', '冬休みのスキー旅行', 'standard-winter', 'month', '{"text":"冬の8日間旅行プラン。雪山アクティビティと温泉、城下町観光、東京の街歩きを楽しむ。\n\n持ち物リスト\n- スキーウェア\n- 手袋\n- ゴーグル\n- カイロ"}', NULL, NULL, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public', '冬休みのスキー旅行', 'standard-winter', 'month', '{"text":"冬の8日間旅行プラン。雪山アクティビティと温泉、城下町観光、東京の街歩きを楽しむ。\n\n持ち物リスト\n- スキーウェア\n- 手袋\n- ゴーグル\n- カイロ"}', NULL, 'official-winter-source', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
) VALUES
  ('official-winter-source-train-outbound', 'official-winter-source', '東京駅から長野駅へ移動', '1788044400000', '1788053400000', '東京駅', '{"text":"北陸新幹線で冬景色を楽しみながら移動"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-bus-to-hakuba', 'official-winter-source', '長野駅から白馬へバス移動', '1788057000000', '1788062400000', '白馬村', '{"text":"バスで雪山の麓まで移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-ski-rental', 'official-winter-source', 'スキー用具レンタル', '1788064200000', '1788067800000', '白馬スキー場', '{"text":"ウェアと板を借りて準備完了"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-ski-lesson', 'official-winter-source', 'スキー初心者レッスン', '1788068700000', '1788079500000', '白馬スキー場', '{"text":"インストラクターと一緒に基礎を学ぶ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-dinner-izakaya', 'official-winter-source', '地元居酒屋で夕食', '1788085800000', '1788091200000', '白馬村', '{"text":"雪山のあとに温かい郷土料理を味わう"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-hotel-stay', 'official-winter-source', '温泉宿にチェックイン', '1788091200000', '1788224400000', '白馬温泉宿', '{"text":"雪見露天風呂つきの宿でゆっくり過ごす"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-snow-festival', 'official-winter-source', '雪まつり（終日）', '1788102000000', '1788188340000', '白馬村', '{"text":"雪像や花火が楽しめる冬のお祭り"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-snowshoe-hike', 'official-winter-source', 'スノーシューで雪原散策', '1788136200000', '1788145200000', '白馬高原', '{"text":"ふかふかの雪の上を歩く自然体験"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-lunch-soba', 'official-winter-source', '信州そばランチ', '1788147000000', '1788152400000', '白馬村', '{"text":"名物そばと温かい汁でほっと一息"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-onsen-relax', 'official-winter-source', '雪見温泉', '1788156000000', '1788162000000', '白馬温泉宿', '{"text":"湯気と雪景色をながめながら休憩"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-illumination', 'official-winter-source', '冬のイルミネーション', '1788170400000', '1788177600000', '白馬村', '{"text":"光のトンネルを歩いて夜景を楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-breakfast-winter', 'official-winter-source', '温泉宿の朝食', '1788217200000', '1788219900000', '白馬温泉宿', '{"text":"和朝食で翌日のアクティビティに備える"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-snowboard', 'official-winter-source', 'スノーボードチャレンジ', '1788222600000', '1788233400000', '白馬スキー場', '{"text":"初心者から中級者まで楽しめるゲレンデ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-snack-cafe', 'official-winter-source', '雪見カフェで休憩', '1788236100000', '1788240600000', '白馬村', '{"text":"暖炉のそばでホットドリンクを味わう"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-shopping-gear', 'official-winter-source', 'アウトドア用品ショッピング', '1788244200000', '1788249600000', '長野市', '{"text":"防寒小物やお土産を探す"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-bus-matsumoto', 'official-winter-source', '松本へバス移動', '1788251400000', '1788258600000', '松本市', '{"text":"冬の山あいを眺めながら移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-hotel-matsumoto', 'official-winter-source', '松本の旅館に宿泊', '1788264000000', '1788397200000', '松本市', '{"text":"城下町の風情ある宿でのんびり"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-matsumoto-castle', 'official-winter-source', '松本城観光', '1788307200000', '1788314400000', '松本市', '{"text":"国宝の城を見学しながら歴史を感じる"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-soba-making', 'official-winter-source', 'そば打ち体験', '1788318000000', '1788325200000', '松本市', '{"text":"自分で打ったそばを味わう"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-sake-tour', 'official-winter-source', '地酒蔵見学', '1788328800000', '1788334200000', '松本市', '{"text":"酒蔵で冬限定の新酒を試飲"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-zenkoji-prayer', 'official-winter-source', '善光寺お参り', '1788339600000', '1788343200000', '松本市', '{"text":"静かな夜の境内で祈りを捧げる"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-train-to-tokyo', 'official-winter-source', '東京へ新幹線移動', '1788391800000', '1788400800000', '松本駅→東京駅', '{"text":"冬の田園風景を眺めながら帰路へ"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-ginza-shopping', 'official-winter-source', '銀座ショッピング', '1788404400000', '1788415200000', '銀座', '{"text":"冬のセールでお土産と防寒グッズを探す"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-dinner-ginza', 'official-winter-source', '銀座の和食ディナー', '1788426000000', '1788431400000', '銀座', '{"text":"名店で締めの一皿を楽しむ"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-tokyo-hotel', 'official-winter-source', '東京のホテルに宿泊', '1788440400000', '1788656400000', '東京', '{"text":"旅の最終夜をゆっくり過ごす"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-urban-breakfast', 'official-winter-source', 'ホテル朝食', '1788478200000', '1788480900000', '東京', '{"text":"街の景色を見ながらゆったり朝食"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-museum-visit', 'official-winter-source', '美術館で冬の展覧会', '1788487200000', '1788496200000', '東京', '{"text":"芸術作品をゆっくり鑑賞する"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-cooking-class', 'official-winter-source', '和菓子作り体験', '1788501600000', '1788508800000', '東京', '{"text":"季節の和菓子を手作りする"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-farewell-dinner', 'official-winter-source', '旅の締めくくりの夕食', '1788602400000', '1788607800000', '東京', '{"text":"最後のお土産話とともにディナー"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-airport-transfer', 'official-winter-source', '羽田空港へ移動', '1788649200000', '1788654600000', '東京→羽田空港', '{"text":"最終日はゆっくり空港へ向かう"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-source-flight-home', 'official-winter-source', '帰りのフライト', '1788661800000', '1788669000000', '羽田空港', '{"text":"あたたかい場所へ帰路につく"}', NULL, 'transport:plane', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-train-outbound', 'official-winter-public', '東京駅から長野駅へ移動', '1788044400000', '1788053400000', '東京駅', '{"text":"北陸新幹線で冬景色を楽しみながら移動"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-bus-to-hakuba', 'official-winter-public', '長野駅から白馬へバス移動', '1788057000000', '1788062400000', '白馬村', '{"text":"バスで雪山の麓まで移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-ski-rental', 'official-winter-public', 'スキー用具レンタル', '1788064200000', '1788067800000', '白馬スキー場', '{"text":"ウェアと板を借りて準備完了"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-ski-lesson', 'official-winter-public', 'スキー初心者レッスン', '1788068700000', '1788079500000', '白馬スキー場', '{"text":"インストラクターと一緒に基礎を学ぶ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-dinner-izakaya', 'official-winter-public', '地元居酒屋で夕食', '1788085800000', '1788091200000', '白馬村', '{"text":"雪山のあとに温かい郷土料理を味わう"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-hotel-stay', 'official-winter-public', '温泉宿にチェックイン', '1788091200000', '1788224400000', '白馬温泉宿', '{"text":"雪見露天風呂つきの宿でゆっくり過ごす"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-snow-festival', 'official-winter-public', '雪まつり（終日）', '1788102000000', '1788188340000', '白馬村', '{"text":"雪像や花火が楽しめる冬のお祭り"}', NULL, 'normal:general', '1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-snowshoe-hike', 'official-winter-public', 'スノーシューで雪原散策', '1788136200000', '1788145200000', '白馬高原', '{"text":"ふかふかの雪の上を歩く自然体験"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-lunch-soba', 'official-winter-public', '信州そばランチ', '1788147000000', '1788152400000', '白馬村', '{"text":"名物そばと温かい汁でほっと一息"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-onsen-relax', 'official-winter-public', '雪見温泉', '1788156000000', '1788162000000', '白馬温泉宿', '{"text":"湯気と雪景色をながめながら休憩"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-illumination', 'official-winter-public', '冬のイルミネーション', '1788170400000', '1788177600000', '白馬村', '{"text":"光のトンネルを歩いて夜景を楽しむ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-breakfast-winter', 'official-winter-public', '温泉宿の朝食', '1788217200000', '1788219900000', '白馬温泉宿', '{"text":"和朝食で翌日のアクティビティに備える"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-snowboard', 'official-winter-public', 'スノーボードチャレンジ', '1788222600000', '1788233400000', '白馬スキー場', '{"text":"初心者から中級者まで楽しめるゲレンデ"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-snack-cafe', 'official-winter-public', '雪見カフェで休憩', '1788236100000', '1788240600000', '白馬村', '{"text":"暖炉のそばでホットドリンクを味わう"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-shopping-gear', 'official-winter-public', 'アウトドア用品ショッピング', '1788244200000', '1788249600000', '長野市', '{"text":"防寒小物やお土産を探す"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-bus-matsumoto', 'official-winter-public', '松本へバス移動', '1788251400000', '1788258600000', '松本市', '{"text":"冬の山あいを眺めながら移動"}', NULL, 'transport:bus', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-hotel-matsumoto', 'official-winter-public', '松本の旅館に宿泊', '1788264000000', '1788397200000', '松本市', '{"text":"城下町の風情ある宿でのんびり"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-matsumoto-castle', 'official-winter-public', '松本城観光', '1788307200000', '1788314400000', '松本市', '{"text":"国宝の城を見学しながら歴史を感じる"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-soba-making', 'official-winter-public', 'そば打ち体験', '1788318000000', '1788325200000', '松本市', '{"text":"自分で打ったそばを味わう"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-sake-tour', 'official-winter-public', '地酒蔵見学', '1788328800000', '1788334200000', '松本市', '{"text":"酒蔵で冬限定の新酒を試飲"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-zenkoji-prayer', 'official-winter-public', '善光寺お参り', '1788339600000', '1788343200000', '松本市', '{"text":"静かな夜の境内で祈りを捧げる"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-train-to-tokyo', 'official-winter-public', '東京へ新幹線移動', '1788391800000', '1788400800000', '松本駅→東京駅', '{"text":"冬の田園風景を眺めながら帰路へ"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-ginza-shopping', 'official-winter-public', '銀座ショッピング', '1788404400000', '1788415200000', '銀座', '{"text":"冬のセールでお土産と防寒グッズを探す"}', NULL, 'normal:shopping', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-dinner-ginza', 'official-winter-public', '銀座の和食ディナー', '1788426000000', '1788431400000', '銀座', '{"text":"名店で締めの一皿を楽しむ"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-tokyo-hotel', 'official-winter-public', '東京のホテルに宿泊', '1788440400000', '1788656400000', '東京', '{"text":"旅の最終夜をゆっくり過ごす"}', NULL, 'normal:hotel', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-urban-breakfast', 'official-winter-public', 'ホテル朝食', '1788478200000', '1788480900000', '東京', '{"text":"街の景色を見ながらゆったり朝食"}', NULL, 'normal:food', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-museum-visit', 'official-winter-public', '美術館で冬の展覧会', '1788487200000', '1788496200000', '東京', '{"text":"芸術作品をゆっくり鑑賞する"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-cooking-class', 'official-winter-public', '和菓子作り体験', '1788501600000', '1788508800000', '東京', '{"text":"季節の和菓子を手作りする"}', NULL, 'normal:sightseeing', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-farewell-dinner', 'official-winter-public', '旅の締めくくりの夕食', '1788602400000', '1788607800000', '東京', '{"text":"最後のお土産話とともにディナー"}', NULL, 'normal:meal', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-airport-transfer', 'official-winter-public', '羽田空港へ移動', '1788649200000', '1788654600000', '東京→羽田空港', '{"text":"最終日はゆっくり空港へ向かう"}', NULL, 'transport:train', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'),
  ('official-winter-public-flight-home', 'official-winter-public', '帰りのフライト', '1788661800000', '1788669000000', '羽田空港', '{"text":"あたたかい場所へ帰路につく"}', NULL, 'transport:plane', '0', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-winter-source', 1, '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z');

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
) VALUES (
  'official-winter-source', 'official-winter-public', 'official-user',
  '["nagano","tokyo"]', '["白馬","松本","東京"]', '["温泉","絶景","グルメ"]',
  '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z'
);

INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
VALUES ('official-winter-public', 19);
