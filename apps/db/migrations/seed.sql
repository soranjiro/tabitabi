-- Official seasonal examples shown in the public feed.
-- Re-seeding replaces the previous official graph so deploys stay deterministic.
DELETE FROM itineraries WHERE id = 'local-kyoto-public';
DELETE FROM itineraries WHERE id GLOB 'official-*-source';
DELETE FROM itineraries WHERE id GLOB 'official-*-public';
DELETE FROM users WHERE id = 'official-user';

INSERT INTO users (
  id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at
) VALUES (
  'official-user', 'tabitabi_official', 'official@tabitabi.jp', '!firebase-managed!', '東京都', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
);

WITH itinerary_seed(season, title, theme_id, palette_id, prefecture_slugs, areas, tags, memo) AS (
  VALUES
    ('spring', '桜の京都・宇治 3日間', 'standard-spring', 'sakura', '["kyoto"]', '["東山","嵐山","宇治","伏見"]', '["桜","寺社・歴史","グルメ"]', '{"text":"4月上旬の京都を3日間でめぐるプラン。朝の混雑が少ない時間を中心に、東山・嵐山・宇治・伏見を無理なく回る。"}'),
    ('summer', '沖縄・やんばる 夏の4日間', 'standard-summer', 'ocean', '["okinawa"]', '["恩納村","本部町","やんばる","那覇"]', '["海","自然","グルメ"]', '{"text":"7月の沖縄本島を4日間でめぐるプラン。海だけに詰め込まず、本部・やんばる・那覇をレンタカーでゆったり回る。昼の暑い時間は休憩を長めに取る。"}'),
    ('autumn', '奥日光・鬼怒川 紅葉の7日間', 'standard-autumn', 'autumn', '["tochigi"]', '["日光","奥日光","中禅寺湖","鬼怒川"]', '["紅葉","温泉","自然"]', '{"text":"10月下旬の日光を1週間かけてめぐるプラン。週ビューで見やすいよう、1日に入れる予定は1〜2件に絞り、移動日と休む時間も残している。"}'),
    ('winter', '冬の北海道をめぐる18日間', 'standard-winter', 'snow', '["hokkaido"]', '["札幌","小樽","ニセコ","洞爺湖","登別","函館"]', '["雪景色","温泉","長期旅行"]', '{"text":"2月の北海道を18日かけて南へ移動する長旅。月の最初の週から始め、2〜4日単位の滞在を中心にして、1日ごとの細かな予定はほとんど入れない。"}')
)
INSERT INTO itineraries (
  id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at
)
SELECT 'official-' || season || '-source', title, theme_id, palette_id, 1, prefecture_slugs, areas, tags, 1, memo, NULL, NULL,
  '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itinerary_seed;

-- Public itinerary copies intentionally mirror the editable sources.
INSERT INTO itineraries (
  id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at
)
SELECT REPLACE(id, '-source', '-public'), title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, NULL, id, created_at, updated_at
FROM itineraries WHERE id GLOB 'official-*-source';

WITH step_seed(season, slug, title, start_iso, end_iso, location, notes, type, is_all_day) AS (
  VALUES
    ('spring', 'train-kyoto', '東京から京都へ', '2027-04-02T08:00:00+09:00', '2027-04-02T10:15:00+09:00', '東京駅→京都駅', '{"text":"朝の新幹線で移動。到着後は駅周辺に荷物を預ける。"}', 'transport:train', 0),
    ('spring', 'kiyomizu', '清水寺と産寧坂を散策', '2027-04-02T11:30:00+09:00', '2027-04-02T14:00:00+09:00', '京都市東山区', '{"text":"清水寺から産寧坂・二寧坂へ。混雑する夕方前に歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'gion', '祇園白川を夕方散歩', '2027-04-02T16:00:00+09:00', '2027-04-02T17:30:00+09:00', '祇園白川', '{"text":"桜を見ながら短めの散歩。夜は周辺で京料理。"}', 'normal:sightseeing', 0),
    ('spring', 'arashiyama', '朝の嵐山・竹林と渡月橋', '2027-04-03T08:00:00+09:00', '2027-04-03T11:00:00+09:00', '嵐山', '{"text":"人が増える前に竹林と渡月橋を歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'uji-train', '嵐山から宇治へ移動', '2027-04-03T11:30:00+09:00', '2027-04-03T13:00:00+09:00', '嵐山→宇治', '{"text":"JRを中心に移動。途中で軽く昼食を取る。"}', 'transport:train', 0),
    ('spring', 'uji', '平等院と宇治茶の街歩き', '2027-04-03T13:30:00+09:00', '2027-04-03T16:30:00+09:00', '宇治', '{"text":"平等院を見学し、宇治川沿いと茶店をゆっくり歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'fushimi', '朝の伏見稲荷大社', '2027-04-04T07:30:00+09:00', '2027-04-04T09:30:00+09:00', '伏見稲荷大社', '{"text":"千本鳥居は朝の静かな時間に。無理に山頂までは行かない。"}', 'normal:sightseeing', 0),
    ('spring', 'nishiki', '錦市場で昼ごはんと買い物', '2027-04-04T10:30:00+09:00', '2027-04-04T12:30:00+09:00', '錦市場', '{"text":"食べ歩きは控えめにし、昼食とお土産探しを中心にする。"}', 'normal:shopping', 0),
    ('spring', 'return', '京都駅から帰路へ', '2027-04-04T14:00:00+09:00', '2027-04-04T16:15:00+09:00', '京都駅→東京駅', '{"text":"駅で荷物を受け取り、新幹線で帰宅。"}', 'transport:train', 0),
    ('summer', 'flight-out', '羽田から那覇へ', '2027-07-16T08:00:00+09:00', '2027-07-16T10:45:00+09:00', '羽田空港→那覇空港', '{"text":"午前便で移動。到着後にレンタカーを受け取る。"}', 'transport:plane', 0),
    ('summer', 'drive-onna', '恩納村へドライブ', '2027-07-16T12:00:00+09:00', '2027-07-16T13:15:00+09:00', '那覇空港→恩納村', '{"text":"高速道路を使い、途中で軽く昼食。"}', 'transport:car', 0),
    ('summer', 'snorkel', '青の洞窟周辺でシュノーケリング', '2027-07-16T15:00:00+09:00', '2027-07-16T17:00:00+09:00', '恩納村', '{"text":"海況が悪い場合はビーチ散策に切り替える。"}', 'normal:sightseeing', 0),
    ('summer', 'aquarium', '沖縄美ら海水族館', '2027-07-17T09:00:00+09:00', '2027-07-17T12:00:00+09:00', '本部町', '{"text":"午前中に館内をゆっくり見学。"}', 'normal:sightseeing', 0),
    ('summer', 'bise', '備瀬のフクギ並木を散歩', '2027-07-17T13:30:00+09:00', '2027-07-17T15:00:00+09:00', '本部町・備瀬', '{"text":"木陰の多い道を中心に歩く。"}', 'normal:sightseeing', 0),
    ('summer', 'kouri', '古宇利島で夕景を見る', '2027-07-17T17:00:00+09:00', '2027-07-17T18:30:00+09:00', '古宇利島', '{"text":"橋を渡って短時間の散策。日没前に宿方面へ戻る。"}', 'normal:sightseeing', 0),
    ('summer', 'yanbaru', 'やんばるの森でカヌー体験', '2027-07-18T09:00:00+09:00', '2027-07-18T12:00:00+09:00', '沖縄本島北部・やんばる', '{"text":"暑さを避けて午前中に自然体験。"}', 'normal:sightseeing', 0),
    ('summer', 'ogimi', '大宜味のカフェで遅めの昼食', '2027-07-18T13:00:00+09:00', '2027-07-18T14:30:00+09:00', '大宜味村', '{"text":"移動を兼ねてしっかり休憩する。"}', 'normal:meal', 0),
    ('summer', 'sunset', '万座毛で夕方散歩', '2027-07-18T17:00:00+09:00', '2027-07-18T18:00:00+09:00', '恩納村・万座毛', '{"text":"日差しが弱まる時間に短めの散策。"}', 'normal:sightseeing', 0),
    ('summer', 'shuri', '首里城公園を見学', '2027-07-19T09:00:00+09:00', '2027-07-19T11:00:00+09:00', '那覇市首里', '{"text":"最終日は那覇市内で移動距離を抑える。"}', 'normal:sightseeing', 0),
    ('summer', 'market', '牧志公設市場周辺で昼ごはん', '2027-07-19T12:00:00+09:00', '2027-07-19T13:30:00+09:00', '那覇市・牧志', '{"text":"沖縄料理を食べて最後のお土産を選ぶ。"}', 'normal:meal', 0),
    ('summer', 'flight-home', '那覇空港から帰路へ', '2027-07-19T16:00:00+09:00', '2027-07-19T18:30:00+09:00', '那覇空港→羽田空港', '{"text":"レンタカー返却後、余裕を持って空港へ。"}', 'transport:plane', 0),
    ('autumn', 'tosho', '日光東照宮をゆっくり参拝', '2026-10-19T10:30:00+09:00', '2026-10-19T13:00:00+09:00', '日光東照宮', '{"text":"到着日は東照宮に絞り、午後に余白を残す。"}', 'normal:sightseeing', 0),
    ('autumn', 'shinkyo', '神橋から西参道を散歩', '2026-10-19T15:00:00+09:00', '2026-10-19T16:30:00+09:00', '神橋・西参道', '{"text":"夕方の紅葉を見ながら短く歩く。"}', 'normal:sightseeing', 0),
    ('autumn', 'senjogahara', '戦場ヶ原をハイキング', '2026-10-20T09:00:00+09:00', '2026-10-20T12:00:00+09:00', '戦場ヶ原', '{"text":"歩きやすい区間を選び、昼前に切り上げる。"}', 'normal:sightseeing', 0),
    ('autumn', 'yudaki', '湯滝を見に行く', '2026-10-20T13:30:00+09:00', '2026-10-20T14:30:00+09:00', '湯滝', '{"text":"ハイキング後は滝だけ見て宿へ戻る。"}', 'normal:sightseeing', 0),
    ('autumn', 'chuzenji', '中禅寺湖を遊覧船で一周', '2026-10-21T10:00:00+09:00', '2026-10-21T12:00:00+09:00', '中禅寺湖', '{"text":"湖上から紅葉を楽しむ日。"}', 'normal:sightseeing', 0),
    ('autumn', 'kegon', '華厳滝を見学', '2026-10-21T14:00:00+09:00', '2026-10-21T15:00:00+09:00', '華厳滝', '{"text":"午後は華厳滝だけにして早めに宿へ。"}', 'normal:sightseeing', 0),
    ('autumn', 'akechidaira', '明智平から紅葉を眺める', '2026-10-22T09:30:00+09:00', '2026-10-22T11:30:00+09:00', '明智平', '{"text":"展望を楽しんだら鬼怒川方面へ移動する。"}', 'normal:sightseeing', 0),
    ('autumn', 'to-kinugawa', '鬼怒川温泉へ移動', '2026-10-22T14:00:00+09:00', '2026-10-22T15:30:00+09:00', '奥日光→鬼怒川温泉', '{"text":"午後は移動中心。チェックイン後は温泉で休む。"}', 'transport:car', 0),
    ('autumn', 'ryuokyo', '龍王峡を散策', '2026-10-23T09:30:00+09:00', '2026-10-23T12:00:00+09:00', '龍王峡', '{"text":"渓谷沿いの無理のないコースを歩く。"}', 'normal:sightseeing', 0),
    ('autumn', 'onsen-town', '鬼怒川温泉街で自由時間', '2026-10-23T15:00:00+09:00', '2026-10-23T16:00:00+09:00', '鬼怒川温泉', '{"text":"カフェや足湯でのんびり過ごす。"}', 'normal:general', 0),
    ('autumn', 'onsen-day', '温泉で何もしない午前', '2026-10-24T10:00:00+09:00', '2026-10-24T12:00:00+09:00', '鬼怒川温泉', '{"text":"旅の後半は予定を詰めず休養日にする。"}', 'normal:general', 0),
    ('autumn', 'dinner', '地元食材の夕食', '2026-10-24T18:00:00+09:00', '2026-10-24T19:30:00+09:00', '温泉旅館の食事処', '{"text":"宿でゆっくり夕食。"}', 'normal:meal', 0),
    ('autumn', 'souvenir', '駅前でお土産を選ぶ', '2026-10-25T09:30:00+09:00', '2026-10-25T10:30:00+09:00', '鬼怒川温泉駅', '{"text":"荷物をまとめてから短時間で買い物。"}', 'normal:shopping', 0),
    ('autumn', 'return', '鬼怒川温泉から東京へ', '2026-10-25T12:00:00+09:00', '2026-10-25T14:15:00+09:00', '鬼怒川温泉駅→浅草駅', '{"text":"昼の特急で帰宅。"}', 'transport:train', 0),
    ('winter', 'sapporo', '札幌に3日滞在', '2027-02-01T00:00:00+09:00', '2027-02-03T23:59:00+09:00', '札幌', '{"text":"到着後は市内を拠点に、雪景色と食事をゆっくり楽しむ。"}', 'normal:hotel', 1),
    ('winter', 'otaru', '小樽・余市に3日滞在', '2027-02-04T00:00:00+09:00', '2027-02-06T23:59:00+09:00', '小樽・余市', '{"text":"運河周辺や港町を歩き、天候が悪い日は屋内中心に過ごす。"}', 'normal:hotel', 1),
    ('winter', 'niseko', 'ニセコで4日間の雪山ステイ', '2027-02-07T00:00:00+09:00', '2027-02-10T23:59:00+09:00', 'ニセコ', '{"text":"滑る日と休む日を決めすぎず、天候に合わせて過ごす。"}', 'normal:hotel', 1),
    ('winter', 'toya', '洞爺湖温泉に3日滞在', '2027-02-11T00:00:00+09:00', '2027-02-13T23:59:00+09:00', '洞爺湖温泉', '{"text":"雪山のあとは温泉と湖畔で休む。"}', 'normal:hotel', 1),
    ('winter', 'noboribetsu', '登別温泉に3日滞在', '2027-02-14T00:00:00+09:00', '2027-02-16T23:59:00+09:00', '登別温泉', '{"text":"地獄谷周辺の散策と温泉を中心に、予定を詰めない。"}', 'normal:hotel', 1),
    ('winter', 'hakodate', '函館で旅を締める2日間', '2027-02-17T00:00:00+09:00', '2027-02-18T23:59:00+09:00', '函館', '{"text":"朝市や元町を気分に合わせて巡り、18日に帰路へ。"}', 'normal:hotel', 1)
)
INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
)
SELECT 'official-' || season || '-source-' || slug, 'official-' || season || '-source', title,
  CAST(strftime('%s', start_iso) AS INTEGER) * 1000, CAST(strftime('%s', end_iso) AS INTEGER) * 1000,
  location, notes, NULL, type, is_all_day, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM step_seed;

INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
)
SELECT REPLACE(id, '-source-', '-public-'), REPLACE(itinerary_id, '-source', '-public'), title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
FROM steps WHERE itinerary_id GLOB 'official-*-source';

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
SELECT 'official-user', id, 1, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z' FROM itineraries WHERE id GLOB 'official-*-source';

INSERT INTO itinerary_publications (
  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at
)
SELECT id, REPLACE(id, '-source', '-public'), 'official-user', prefecture_slugs, areas, tags, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries WHERE id GLOB 'official-*-source';

WITH fork_seed(season, fork_count) AS (VALUES
  ('spring', 31), ('summer', 36), ('autumn', 27), ('winter', 22)
)
INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
SELECT 'official-' || season || '-public', fork_count FROM fork_seed;

-- Keep each official seasonal bookmark aligned with its season.
UPDATE itineraries
SET palette_id = CASE
  WHEN id LIKE 'official-spring-%' THEN 'sakura'
  WHEN id LIKE 'official-summer-%' THEN 'ocean'
  WHEN id LIKE 'official-autumn-%' THEN 'autumn'
  WHEN id LIKE 'official-winter-%' THEN 'snow'
END,
background_display = CASE
  WHEN id LIKE 'official-spring-%' OR id LIKE 'official-summer-%' THEN 'page'
  ELSE background_display
END
WHERE id GLOB 'official-*-source' OR id GLOB 'official-*-public';

-- Include complete sample data in both editable and public itineraries.
INSERT INTO itinerary_members (id, itinerary_id, name, created_at)
SELECT i.id || '-member-' || m.key, i.id, m.name, '2026-09-08T00:00:00.000Z'
FROM itineraries i
CROSS JOIN (SELECT 'a' AS key, 'あおい' AS name UNION ALL SELECT 'b', 'はる' UNION ALL SELECT 'c', 'みなと') m
WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_money_settings (itinerary_id, budget_amount, created_at, updated_at)
SELECT id, CASE
  WHEN id LIKE 'official-spring-%' THEN 90000
  WHEN id LIKE 'official-summer-%' THEN 180000
  WHEN id LIKE 'official-autumn-%' THEN 130000
  WHEN id LIKE 'official-winter-%' THEN 320000
END, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries WHERE id GLOB 'official-*-source' OR id GLOB 'official-*-public';

WITH expense_seed(kind, title, payer, paid_from_fund, status) AS (VALUES
  ('hotel', '宿泊費', 'a', 0, 'paid'),
  ('transport', '交通費', 'b', 0, 'paid'),
  ('food', '食事とカフェ', NULL, 1, 'planned')
)
INSERT INTO itinerary_money_items (
  id, itinerary_id, title, amount, paid_by_member_id, paid_from_fund, status, occurred_on, step_id, is_settled, created_at, updated_at
)
SELECT i.id || '-money-' || e.kind, i.id, e.title,
  CASE
    WHEN i.id LIKE 'official-spring-%' AND e.kind='hotel' THEN 36000
    WHEN i.id LIKE 'official-spring-%' AND e.kind='transport' THEN 24000
    WHEN i.id LIKE 'official-spring-%' THEN 18000
    WHEN i.id LIKE 'official-summer-%' AND e.kind='hotel' THEN 72000
    WHEN i.id LIKE 'official-summer-%' AND e.kind='transport' THEN 45000
    WHEN i.id LIKE 'official-summer-%' THEN 24000
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='hotel' THEN 60000
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='transport' THEN 32000
    WHEN i.id LIKE 'official-autumn-%' THEN 22000
    WHEN i.id LIKE 'official-winter-%' AND e.kind='hotel' THEN 160000
    WHEN i.id LIKE 'official-winter-%' AND e.kind='transport' THEN 85000
    ELSE 55000
  END,
  CASE WHEN e.payer IS NULL THEN NULL ELSE i.id || '-member-' || e.payer END,
  e.paid_from_fund, e.status,
  CASE
    WHEN i.id LIKE 'official-spring-%' AND e.kind='food' THEN '2027-04-03'
    WHEN i.id LIKE 'official-spring-%' THEN '2027-04-02'
    WHEN i.id LIKE 'official-summer-%' AND e.kind='food' THEN '2027-07-18'
    WHEN i.id LIKE 'official-summer-%' THEN '2027-07-16'
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='transport' THEN '2026-10-22'
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='food' THEN '2026-10-23'
    WHEN i.id LIKE 'official-autumn-%' THEN '2026-10-19'
    WHEN i.id LIKE 'official-winter-%' AND e.kind='transport' THEN '2027-02-07'
    WHEN i.id LIKE 'official-winter-%' AND e.kind='food' THEN '2027-02-14'
    ELSE '2027-02-01'
  END,
  NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i CROSS JOIN expense_seed e
WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_money_item_splits (item_id, member_id, itinerary_id, amount)
SELECT expense.id, member.id, expense.itinerary_id, expense.amount / 3
FROM itinerary_money_items expense JOIN itinerary_members member ON member.itinerary_id = expense.itinerary_id
WHERE expense.itinerary_id GLOB 'official-*-source' OR expense.itinerary_id GLOB 'official-*-public';

INSERT INTO itinerary_money_fund_transactions (id, itinerary_id, member_id, kind, amount, note, occurred_on, created_at)
SELECT m.itinerary_id || '-fund-' || m.id, m.itinerary_id, m.id, 'contribution', 10000, '旅行前の共同費',
  CASE
    WHEN m.itinerary_id LIKE 'official-spring-%' THEN '2027-03-28'
    WHEN m.itinerary_id LIKE 'official-summer-%' THEN '2027-07-10'
    WHEN m.itinerary_id LIKE 'official-autumn-%' THEN '2026-10-12'
    ELSE '2027-01-25'
  END,
  '2026-09-08T00:00:00.000Z'
FROM itinerary_members m WHERE m.itinerary_id GLOB 'official-*-source' OR m.itinerary_id GLOB 'official-*-public';

INSERT INTO itinerary_packing_groups (id, itinerary_id, name, sort_order, created_at, updated_at)
SELECT i.id || '-pack-' || g.key, i.id, g.name, g.sort_order, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i
CROSS JOIN (SELECT 'valuables' AS key, '貴重品' AS name, 0 AS sort_order UNION ALL SELECT 'clothes','衣類',1 UNION ALL SELECT 'tools','旅の道具',2) g
WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_packing_items (
  id, itinerary_id, name, quantity, kind, group_id, assignee_member_id, owner_member_id, is_packed, created_at, updated_at
)
SELECT i.id || '-item-wallet', i.id, '財布・身分証', 1, 'personal', i.id || '-pack-valuables', NULL, NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public'
UNION ALL
SELECT i.id || '-item-clothes', i.id, '着替え', CASE
  WHEN i.id LIKE 'official-spring-%' THEN 3 WHEN i.id LIKE 'official-summer-%' THEN 4
  WHEN i.id LIKE 'official-autumn-%' THEN 5 ELSE 7 END,
  'personal', i.id || '-pack-clothes', NULL, NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public'
UNION ALL
SELECT i.id || '-item-camera', i.id, 'カメラ', 1, 'shared', i.id || '-pack-tools', i.id || '-member-a', NULL, 1, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public'
UNION ALL
SELECT i.id || '-item-battery', i.id, 'モバイルバッテリー', 2, 'shared', i.id || '-pack-tools', i.id || '-member-b', NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public'
UNION ALL
SELECT i.id || '-item-medicine', i.id, '常備薬', 1, 'private', i.id || '-pack-valuables', NULL, i.id || '-member-c', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_packing_checks (item_id, member_id, itinerary_id, checked_at)
SELECT i.id || '-item-wallet', i.id || '-member-a', i.id, '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';
