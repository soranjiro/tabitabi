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
    ('spring', '桜の京都・宇治', 'standard-spring', 'sakura', '["kyoto"]', '["東山","嵐山","宇治","伏見"]', '["桜","寺社・歴史","グルメ"]', '{"text":"4月2日（金）から2泊3日。朝は早めに出発し、混みやすい名所は午前中へ。宿は京都駅近くなので、到着日と最終日の荷物はホテルに預ける。歩く時間が長いため、履き慣れた靴で集合。"}'),
    ('summer', '夏休みの沖縄旅行', 'standard-summer', 'ocean', '["okinawa"]', '["恩納村","本部町","やんばる","那覇"]', '["海","自然","グルメ"]', '{"text":"7月16日（金）から3泊4日。那覇空港でレンタカーを受け取り、恩納村に3連泊する。海の予定は天候と海況を見て変更し、雨天時は水族館や首里城公園を先に回る。運転は1〜2時間ごとに交代する。"}'),
    ('autumn', '日光・会津 紅葉と温泉', 'standard-autumn', 'autumn', '["tochigi","fukushima"]', '["日光","奥日光","中禅寺湖","鬼怒川","会津若松"]', '["紅葉","温泉","自然","寺社・歴史"]', '{"text":"10月19日（月）から6泊7日。日光駅までは鉄道、その先はバスと会津鬼怒川線で移動する。奥日光は朝晩冷え込むため薄手のダウンを持参。宿は日光1泊、中禅寺温泉2泊、鬼怒川温泉1泊、会津若松2泊。"}'),
    ('winter', '冬の北海道 湯めぐり18日間', 'standard-winter', 'snow', '["hokkaido"]', '["札幌","小樽","余市","ニセコ","洞爺湖","登別","函館"]', '["雪景色","温泉","グルメ","長期旅行"]', '{"text":"2月1日（月）から17泊18日。札幌から函館へ鉄道と送迎バスで南下する。吹雪で移動が遅れる場合に備え、各滞在地に予備時間を確保。防水の滑りにくい靴、防寒手袋、モバイルバッテリーを忘れずに。"}')
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
    ('spring', 'hotel-bag', 'ホテルに荷物を預ける', '2027-04-02T10:30:00+09:00', '2027-04-02T10:50:00+09:00', '京都駅前', '{"text":"改札前で集合し、3人分の荷物をまとめて預ける。"}', 'normal:hotel', 0),
    ('spring', 'kiyomizu', '清水寺と産寧坂を散策', '2027-04-02T11:30:00+09:00', '2027-04-02T13:30:00+09:00', '清水寺・産寧坂', '{"text":"京都駅から市バスで五条坂へ。清水の舞台を見たあと、産寧坂から二寧坂へ下る。"}', 'normal:sightseeing', 0),
    ('spring', 'lunch', '二寧坂で湯豆腐ランチ', '2027-04-02T13:40:00+09:00', '2027-04-02T14:40:00+09:00', '二寧坂周辺', '{"text":"予約名は「あおい」、3名。"}', 'normal:meal', 0),
    ('spring', 'gion', '祇園白川から円山公園へ', '2027-04-02T16:00:00+09:00', '2027-04-02T17:30:00+09:00', '祇園白川・円山公園', '{"text":"花見小路は通り抜けるだけにし、白川沿いと円山公園を歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'dinner', '祇園で京料理', '2027-04-02T18:00:00+09:00', '2027-04-02T20:00:00+09:00', '祇園', '{"text":"予約は18時。食後はタクシーでホテルへ戻る。"}', 'normal:meal', 0),
    ('spring', 'hotel-1', '京都駅前のホテルに宿泊', '2027-04-02T20:30:00+09:00', '2027-04-03T07:15:00+09:00', '京都駅前', '{"text":"朝食なし。7時20分にロビー集合。"}', 'normal:hotel', 0),
    ('spring', 'arashiyama', '朝の嵐山・竹林と渡月橋', '2027-04-03T08:00:00+09:00', '2027-04-03T10:00:00+09:00', '嵐山', '{"text":"JR嵯峨嵐山駅から竹林の小径、天龍寺北門、渡月橋の順に歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'tenryuji', '天龍寺の庭園を拝観', '2027-04-03T10:00:00+09:00', '2027-04-03T11:00:00+09:00', '天龍寺', '{"text":"曹源池庭園を中心に拝観。11時にJR嵯峨嵐山駅へ向かう。"}', 'normal:sightseeing', 0),
    ('spring', 'uji-train', '嵐山から宇治へ移動', '2027-04-03T11:30:00+09:00', '2027-04-03T13:00:00+09:00', '嵐山→宇治', '{"text":"JRを中心に移動。途中で軽く昼食を取る。"}', 'transport:train', 0),
    ('spring', 'uji', '平等院と宇治茶の街歩き', '2027-04-03T13:30:00+09:00', '2027-04-03T16:30:00+09:00', '宇治', '{"text":"平等院を見学し、宇治川沿いと茶店をゆっくり歩く。"}', 'normal:sightseeing', 0),
    ('spring', 'hotel-2', '京都駅前のホテルに宿泊', '2027-04-03T18:30:00+09:00', '2027-04-04T07:00:00+09:00', '京都駅前', '{"text":"夕食は駅ビルで各自。7時10分にロビー集合。"}', 'normal:hotel', 0),
    ('spring', 'fushimi', '朝の伏見稲荷大社', '2027-04-04T07:30:00+09:00', '2027-04-04T09:30:00+09:00', '伏見稲荷大社', '{"text":"千本鳥居は朝の静かな時間に。無理に山頂までは行かない。"}', 'normal:sightseeing', 0),
    ('spring', 'nishiki', '錦市場で昼ごはんと買い物', '2027-04-04T10:30:00+09:00', '2027-04-04T12:15:00+09:00', '錦市場', '{"text":"通行の妨げにならないよう、買ったものは店内か指定場所で食べる。12時15分に四条通側へ集合。"}', 'normal:shopping', 0),
    ('spring', 'return', '京都駅から帰路へ', '2027-04-04T14:00:00+09:00', '2027-04-04T16:15:00+09:00', '京都駅→東京駅', '{"text":"駅で荷物を受け取り、新幹線で帰宅。"}', 'transport:train', 0),
    ('summer', 'flight-out', '羽田から那覇へ', '2027-07-16T08:00:00+09:00', '2027-07-16T10:45:00+09:00', '羽田空港→那覇空港', '{"text":"午前便で移動。到着後にレンタカーを受け取る。"}', 'transport:plane', 0),
    ('summer', 'rental-car', 'レンタカーを受け取る', '2027-07-16T11:00:00+09:00', '2027-07-16T12:00:00+09:00', '那覇空港周辺', '{"text":"代表者が受付。全員分の荷物を積み、傷とガソリン残量を確認する。"}', 'transport:car', 0),
    ('summer', 'drive-onna', '恩納村へドライブ', '2027-07-16T12:00:00+09:00', '2027-07-16T13:15:00+09:00', '那覇空港→恩納村', '{"text":"高速道路を使い、途中で軽く昼食。"}', 'transport:car', 0),
    ('summer', 'snorkel', '青の洞窟周辺でシュノーケリング', '2027-07-16T15:00:00+09:00', '2027-07-16T17:00:00+09:00', '恩納村', '{"text":"海況が悪い場合はビーチ散策に切り替える。"}', 'normal:sightseeing', 0),
    ('summer', 'hotel-1', '恩納村のホテルに宿泊', '2027-07-16T18:00:00+09:00', '2027-07-17T07:30:00+09:00', '恩納村', '{"text":"朝食付き。水着とタオルを部屋で乾かす。"}', 'normal:hotel', 0),
    ('summer', 'aquarium', '沖縄美ら海水族館', '2027-07-17T09:00:00+09:00', '2027-07-17T12:00:00+09:00', '本部町', '{"text":"午前中に館内をゆっくり見学。"}', 'normal:sightseeing', 0),
    ('summer', 'bise', '備瀬のフクギ並木を散歩', '2027-07-17T13:30:00+09:00', '2027-07-17T15:00:00+09:00', '本部町・備瀬', '{"text":"木陰の多い道を中心に歩く。"}', 'normal:sightseeing', 0),
    ('summer', 'kouri', '古宇利島で夕景を見る', '2027-07-17T17:00:00+09:00', '2027-07-17T18:30:00+09:00', '古宇利島', '{"text":"橋を渡って短時間の散策。日没前に宿方面へ戻る。"}', 'normal:sightseeing', 0),
    ('summer', 'hotel-2', '恩納村のホテルに宿泊', '2027-07-17T20:00:00+09:00', '2027-07-18T07:30:00+09:00', '恩納村', '{"text":"夕食は名護で済ませてから戻る。8時に車寄せへ集合。"}', 'normal:hotel', 0),
    ('summer', 'yanbaru', 'やんばるの森でカヌー体験', '2027-07-18T09:00:00+09:00', '2027-07-18T12:00:00+09:00', '沖縄本島北部・やんばる', '{"text":"暑さを避けて午前中に自然体験。"}', 'normal:sightseeing', 0),
    ('summer', 'ogimi', '大宜味のカフェで遅めの昼食', '2027-07-18T13:00:00+09:00', '2027-07-18T14:30:00+09:00', '大宜味村', '{"text":"移動を兼ねてしっかり休憩する。"}', 'normal:meal', 0),
    ('summer', 'sunset', '万座毛で夕方散歩', '2027-07-18T17:00:00+09:00', '2027-07-18T18:00:00+09:00', '恩納村・万座毛', '{"text":"日差しが弱まる時間に短めの散策。"}', 'normal:sightseeing', 0),
    ('summer', 'hotel-3', '恩納村のホテルに宿泊', '2027-07-18T19:00:00+09:00', '2027-07-19T07:30:00+09:00', '恩納村', '{"text":"最後の夜に荷造り。8時までにチェックアウトする。"}', 'normal:hotel', 0),
    ('summer', 'shuri', '首里城公園を見学', '2027-07-19T09:00:00+09:00', '2027-07-19T11:00:00+09:00', '那覇市首里', '{"text":"最終日は那覇市内で移動距離を抑える。"}', 'normal:sightseeing', 0),
    ('summer', 'market', '牧志公設市場周辺で昼ごはん', '2027-07-19T12:00:00+09:00', '2027-07-19T13:30:00+09:00', '那覇市・牧志', '{"text":"沖縄料理を食べて最後のお土産を選ぶ。"}', 'normal:meal', 0),
    ('summer', 'flight-home', '那覇空港から帰路へ', '2027-07-19T16:00:00+09:00', '2027-07-19T18:30:00+09:00', '那覇空港→羽田空港', '{"text":"レンタカー返却後、余裕を持って空港へ。"}', 'transport:plane', 0),
    ('autumn', 'train-nikko', '浅草から東武日光へ', '2026-10-19T07:30:00+09:00', '2026-10-19T09:20:00+09:00', '浅草駅→東武日光駅', '{"text":"7時15分に浅草駅正面改札前へ集合。駅で荷物を預けてからバスに乗る。"}', 'transport:train', 0),
    ('autumn', 'tosho', '日光東照宮をゆっくり参拝', '2026-10-19T10:00:00+09:00', '2026-10-19T12:30:00+09:00', '日光東照宮', '{"text":"表門から陽明門、御本社、眠り猫、奥宮の順に回る。石段が多いので休憩を挟む。"}', 'normal:sightseeing', 0),
    ('autumn', 'lunch-nikko', '西参道で湯波ランチ', '2026-10-19T12:45:00+09:00', '2026-10-19T14:00:00+09:00', '日光西参道', '{"text":"3名で予約済み。"}', 'normal:meal', 0),
    ('autumn', 'shinkyo', '神橋から西参道を散歩', '2026-10-19T15:00:00+09:00', '2026-10-19T16:30:00+09:00', '神橋・西参道', '{"text":"夕方の紅葉を見ながら短く歩く。"}', 'normal:sightseeing', 0),
    ('autumn', 'hotel-nikko', '日光駅近くのホテルに宿泊', '2026-10-19T17:00:00+09:00', '2026-10-20T08:00:00+09:00', '東武日光駅周辺', '{"text":"夕食・朝食付き。8時10分にロビー集合。"}', 'normal:hotel', 0),
    ('autumn', 'bus-chuzenji', 'いろは坂を通って中禅寺温泉へ', '2026-10-20T08:30:00+09:00', '2026-10-20T09:30:00+09:00', '東武日光駅→中禅寺温泉', '{"text":"紅葉期は渋滞しやすいため、到着が遅れたら遊覧船を午後へ回す。"}', 'transport:bus', 0),
    ('autumn', 'kegon', '華厳滝を見学', '2026-10-20T09:45:00+09:00', '2026-10-20T10:45:00+09:00', '華厳滝', '{"text":"エレベーターで観瀑台へ。霧が濃い場合は翌朝に変更する。"}', 'normal:sightseeing', 0),
    ('autumn', 'chuzenji', '中禅寺湖遊覧船', '2026-10-20T11:30:00+09:00', '2026-10-20T12:30:00+09:00', '中禅寺湖', '{"text":"乗船前に当日の運航状況を確認。昼食は船のあと湖畔で取る。"}', 'normal:sightseeing', 0),
    ('autumn', 'embassy', '英国・イタリア大使館別荘記念公園', '2026-10-20T14:00:00+09:00', '2026-10-20T16:00:00+09:00', '中禅寺湖畔', '{"text":"湖畔園地を歩いて2館を見学。閉館時刻の30分前には退出する。"}', 'normal:sightseeing', 0),
    ('autumn', 'hotel-chuzenji-1', '中禅寺温泉に宿泊', '2026-10-20T16:30:00+09:00', '2026-10-21T08:00:00+09:00', '中禅寺温泉', '{"text":"夕食・朝食付き。翌朝のバス時刻をフロントで確認する。"}', 'normal:hotel', 0),
    ('autumn', 'senjogahara', '赤沼から戦場ヶ原を歩く', '2026-10-21T09:00:00+09:00', '2026-10-21T12:30:00+09:00', '赤沼→戦場ヶ原→湯滝', '{"text":"木道を湯滝方面へ歩く。雨天や凍結時は低公害バスと路線バスで移動する。"}', 'normal:sightseeing', 0),
    ('autumn', 'yudaki', '湯滝で昼食と休憩', '2026-10-21T12:30:00+09:00', '2026-10-21T14:00:00+09:00', '湯滝', '{"text":"滝を見たあと、バスで中禅寺温泉へ戻る。"}', 'normal:meal', 0),
    ('autumn', 'hotel-chuzenji-2', '中禅寺温泉にもう1泊', '2026-10-21T16:00:00+09:00', '2026-10-22T08:30:00+09:00', '中禅寺温泉', '{"text":"濡れた上着と靴を乾かし、翌日の移動に備える。"}', 'normal:hotel', 0),
    ('autumn', 'akechidaira', '明智平から紅葉を眺める', '2026-10-22T09:30:00+09:00', '2026-10-22T11:30:00+09:00', '明智平', '{"text":"展望を楽しんだら鬼怒川方面へ移動する。"}', 'normal:sightseeing', 0),
    ('autumn', 'to-kinugawa', '鬼怒川温泉へ移動', '2026-10-22T12:30:00+09:00', '2026-10-22T14:30:00+09:00', '明智平→鬼怒川温泉', '{"text":"日光駅で昼食を買い、東武線で鬼怒川温泉へ。"}', 'transport:train', 0),
    ('autumn', 'onsen-town', '鬼怒川温泉街と楯岩大吊橋', '2026-10-22T15:00:00+09:00', '2026-10-22T16:30:00+09:00', '鬼怒川温泉', '{"text":"荷物を宿に置き、川沿いを短く散歩する。"}', 'normal:sightseeing', 0),
    ('autumn', 'hotel-kinugawa', '鬼怒川温泉の旅館に宿泊', '2026-10-22T17:00:00+09:00', '2026-10-23T08:30:00+09:00', '鬼怒川温泉', '{"text":"夕食・朝食付き。露天風呂は夕食前に入る。"}', 'normal:hotel', 0),
    ('autumn', 'ryuokyo', '龍王峡を散策', '2026-10-23T09:00:00+09:00', '2026-10-23T11:30:00+09:00', '龍王峡', '{"text":"虹見橋までの往復を基本にし、足元が悪ければ散策時間を短くする。"}', 'normal:sightseeing', 0),
    ('autumn', 'aizu-train', '会津鬼怒川線で会津若松へ', '2026-10-23T12:30:00+09:00', '2026-10-23T15:30:00+09:00', '龍王峡駅→会津若松駅', '{"text":"途中駅で昼食を購入。乗り換え時間は余裕を持つ。"}', 'transport:train', 0),
    ('autumn', 'nanukamachi', '七日町通りを散歩', '2026-10-23T16:00:00+09:00', '2026-10-23T17:30:00+09:00', '会津若松・七日町通り', '{"text":"酒蔵と会津木綿の店を見ながらホテルへ向かう。"}', 'normal:shopping', 0),
    ('autumn', 'hotel-aizu-1', '会津若松駅前に宿泊', '2026-10-23T18:00:00+09:00', '2026-10-24T08:30:00+09:00', '会津若松駅前', '{"text":"夕食は市内で会津の郷土料理。"}', 'normal:hotel', 0),
    ('autumn', 'tsurugajo', '鶴ヶ城と茶室麟閣', '2026-10-24T09:00:00+09:00', '2026-10-24T11:30:00+09:00', '鶴ヶ城', '{"text":"天守閣を見学し、茶室で休憩する。"}', 'normal:sightseeing', 0),
    ('autumn', 'sazaedo', '飯盛山とさざえ堂', '2026-10-24T13:30:00+09:00', '2026-10-24T15:30:00+09:00', '会津若松・飯盛山', '{"text":"石段を避ける場合はスロープコンベアを利用する。"}', 'normal:sightseeing', 0),
    ('autumn', 'higashiyama', '東山温泉で日帰り入浴', '2026-10-24T16:00:00+09:00', '2026-10-24T18:00:00+09:00', '会津東山温泉', '{"text":"タオルを持参。入浴後はバスで市街地へ戻る。"}', 'normal:sightseeing', 0),
    ('autumn', 'hotel-aizu-2', '会津若松駅前にもう1泊', '2026-10-24T19:00:00+09:00', '2026-10-25T09:00:00+09:00', '会津若松駅前', '{"text":"朝食後に荷物をまとめ、フロントへ預ける。"}', 'normal:hotel', 0),
    ('autumn', 'market-aizu', '野口英世青春通りで買い物', '2026-10-25T09:30:00+09:00', '2026-10-25T11:00:00+09:00', '会津若松市街', '{"text":"起き上がり小法師と地酒を購入。"}', 'normal:shopping', 0),
    ('autumn', 'return', '会津若松から東京へ', '2026-10-25T12:00:00+09:00', '2026-10-25T15:30:00+09:00', '会津若松駅→東京駅', '{"text":"郡山で東北新幹線に乗り換える。昼食は車内で取る。"}', 'transport:train', 0),
    ('winter', 'flight-sapporo', '羽田から新千歳へ', '2027-02-01T08:00:00+09:00', '2027-02-01T09:35:00+09:00', '羽田空港→新千歳空港', '{"text":"出発の1時間前に保安検査場前へ集合。到着後は快速列車で札幌へ。"}', 'transport:plane', 0),
    ('winter', 'sapporo-stay', '札幌に4泊', '2027-02-01T15:00:00+09:00', '2027-02-05T09:00:00+09:00', '札幌駅周辺', '{"text":"朝食付き。大雪の日は無理に郊外へ出ず、市内の予定へ変更する。"}', 'normal:hotel', 0),
    ('winter', 'odori', '大通公園と札幌市時計台', '2027-02-01T13:00:00+09:00', '2027-02-01T16:30:00+09:00', '札幌・大通', '{"text":"ホテルに荷物を預けてから徒歩で回る。夕食は狸小路周辺。"}', 'normal:sightseeing', 0),
    ('winter', 'market', '二条市場で朝ごはん', '2027-02-02T08:00:00+09:00', '2027-02-02T09:30:00+09:00', '札幌二条市場', '{"text":"海鮮丼を食べ、地下鉄で円山公園へ移動する。"}', 'normal:meal', 0),
    ('winter', 'maruyama', '北海道神宮と円山公園', '2027-02-02T10:30:00+09:00', '2027-02-02T13:00:00+09:00', '北海道神宮', '{"text":"除雪された参道を歩く。足元が悪ければ往復とも地下鉄を使う。"}', 'normal:sightseeing', 0),
    ('winter', 'museum', '北海道博物館', '2027-02-03T10:00:00+09:00', '2027-02-03T13:00:00+09:00', '北海道博物館', '{"text":"屋内で北海道の自然と歴史を見る。昼食後はホテルで休憩。"}', 'normal:sightseeing', 0),
    ('winter', 'sapporo-free', '札幌で予備日', '2027-02-04T10:00:00+09:00', '2027-02-04T16:00:00+09:00', '札幌市内', '{"text":"天候が良ければ藻岩山、荒天なら札幌駅周辺の買い物に変更する。"}', 'normal:general', 0),
    ('winter', 'to-otaru', '札幌から小樽へ', '2027-02-05T09:30:00+09:00', '2027-02-05T10:20:00+09:00', '札幌駅→小樽駅', '{"text":"海側の指定席を予約。ホテルに荷物を預ける。"}', 'transport:train', 0),
    ('winter', 'otaru-stay', '小樽に2泊', '2027-02-05T15:00:00+09:00', '2027-02-07T08:30:00+09:00', '小樽駅周辺', '{"text":"朝食付き。夜の運河散策用に滑り止めを携帯する。"}', 'normal:hotel', 0),
    ('winter', 'otaru-walk', '小樽運河と堺町通り', '2027-02-05T11:00:00+09:00', '2027-02-05T16:00:00+09:00', '小樽運河・堺町通り', '{"text":"運河沿いから堺町通りへ歩き、途中で昼食とカフェ休憩を取る。"}', 'normal:sightseeing', 0),
    ('winter', 'yoichi', '余市へ日帰り', '2027-02-06T09:30:00+09:00', '2027-02-06T15:30:00+09:00', '余市', '{"text":"鉄道で往復。蒸溜所見学は事前予約し、試飲する人は身分証を持参する。"}', 'normal:sightseeing', 0),
    ('winter', 'to-niseko', '小樽からニセコへ', '2027-02-07T09:00:00+09:00', '2027-02-07T12:00:00+09:00', '小樽駅→ニセコ', '{"text":"倶知安で宿の送迎車に乗り換える。昼食は駅周辺で取る。"}', 'transport:train', 0),
    ('winter', 'niseko-stay', 'ニセコに4泊', '2027-02-07T15:00:00+09:00', '2027-02-11T09:00:00+09:00', 'ニセコ', '{"text":"朝夕食付き。レンタル用品は初日にサイズを確認する。"}', 'normal:hotel', 0),
    ('winter', 'ski-1', 'スキー・スノーボード初日', '2027-02-08T09:00:00+09:00', '2027-02-08T15:00:00+09:00', 'ニセコのスキー場', '{"text":"午前はレッスン、午後は無理のないコースへ。15時までに切り上げる。"}', 'normal:sightseeing', 0),
    ('winter', 'snowshoe', '半日スノーシューツアー', '2027-02-09T09:00:00+09:00', '2027-02-09T12:30:00+09:00', 'ニセコ', '{"text":"ガイド付き。午後は温泉と休憩に充てる。"}', 'normal:sightseeing', 0),
    ('winter', 'niseko-free', 'ニセコで予備日', '2027-02-10T09:30:00+09:00', '2027-02-10T15:00:00+09:00', 'ニセコ', '{"text":"晴れればもう一度滑り、荒天なら温泉とカフェで過ごす。"}', 'normal:general', 0),
    ('winter', 'to-toya', 'ニセコから洞爺湖温泉へ', '2027-02-11T10:00:00+09:00', '2027-02-11T13:30:00+09:00', 'ニセコ→洞爺湖温泉', '{"text":"宿の送迎と路線バスを利用。乗り換え前に昼食を取る。"}', 'transport:bus', 0),
    ('winter', 'toya-stay', '洞爺湖温泉に2泊', '2027-02-11T15:00:00+09:00', '2027-02-13T09:30:00+09:00', '洞爺湖温泉', '{"text":"夕食・朝食付き。大浴場は混雑を避けて早めに利用する。"}', 'normal:hotel', 0),
    ('winter', 'toya-walk', '洞爺湖畔と洞爺湖ビジターセンター', '2027-02-12T10:00:00+09:00', '2027-02-12T14:30:00+09:00', '洞爺湖温泉', '{"text":"湖畔は短く歩き、火山科学館と屋内展示を中心に見る。"}', 'normal:sightseeing', 0),
    ('winter', 'to-noboribetsu', '洞爺から登別温泉へ', '2027-02-13T10:00:00+09:00', '2027-02-13T12:30:00+09:00', '洞爺駅→登別温泉', '{"text":"特急と路線バスで移動。登別駅で接続時間を確認する。"}', 'transport:train', 0),
    ('winter', 'noboribetsu-stay', '登別温泉に3泊', '2027-02-13T15:00:00+09:00', '2027-02-16T09:00:00+09:00', '登別温泉', '{"text":"夕食・朝食付き。湯冷めしないよう夜の外出は短めにする。"}', 'normal:hotel', 0),
    ('winter', 'jigokudani', '地獄谷と大湯沼川天然足湯', '2027-02-14T09:30:00+09:00', '2027-02-14T13:00:00+09:00', '登別地獄谷', '{"text":"冬季通行止めの区間を避け、開放中の遊歩道だけを歩く。"}', 'normal:sightseeing', 0),
    ('winter', 'upopoy', 'ウポポイへ日帰り', '2027-02-15T09:30:00+09:00', '2027-02-15T16:00:00+09:00', '白老・ウポポイ', '{"text":"登別から鉄道で往復。入場時刻を予約し、屋内展示と伝統芸能を中心に見る。"}', 'normal:sightseeing', 0),
    ('winter', 'to-hakodate', '登別から函館へ', '2027-02-16T09:30:00+09:00', '2027-02-16T13:00:00+09:00', '登別駅→函館駅', '{"text":"特急の指定席を予約。昼食は車内で取る。"}', 'transport:train', 0),
    ('winter', 'hakodate-stay', '函館に2泊', '2027-02-16T15:00:00+09:00', '2027-02-18T10:00:00+09:00', '函館駅周辺', '{"text":"朝食付き。帰る日の荷物はチェックアウト後も預ける。"}', 'normal:hotel', 0),
    ('winter', 'motomachi', '元町の教会群と函館山', '2027-02-16T14:30:00+09:00', '2027-02-16T19:00:00+09:00', '函館・元町', '{"text":"坂道をゆっくり歩き、運行していればロープウェイで夜景を見る。"}', 'normal:sightseeing', 0),
    ('winter', 'morning-market', '函館朝市で朝ごはん', '2027-02-17T07:30:00+09:00', '2027-02-17T09:00:00+09:00', '函館朝市', '{"text":"食後は市電で五稜郭へ移動する。"}', 'normal:meal', 0),
    ('winter', 'goryokaku', '五稜郭公園とタワー', '2027-02-17T10:00:00+09:00', '2027-02-17T12:30:00+09:00', '五稜郭', '{"text":"タワーから雪の星形を見て、公園は除雪された道だけ歩く。"}', 'normal:sightseeing', 0),
    ('winter', 'bay', '赤レンガ倉庫で買い物', '2027-02-17T14:00:00+09:00', '2027-02-17T16:30:00+09:00', '函館ベイエリア', '{"text":"お土産をまとめて購入し、ホテルへ戻って荷造りする。"}', 'normal:shopping', 0),
    ('winter', 'flight-home', '函館から羽田へ', '2027-02-18T12:30:00+09:00', '2027-02-18T14:00:00+09:00', '函館空港→羽田空港', '{"text":"ホテル前から空港連絡バスを利用し、出発の1時間前までに到着する。"}', 'transport:plane', 0)
)
INSERT INTO steps (
  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
)
SELECT 'official-' || season || '-source-' || slug, 'official-' || season || '-source', title,
  CAST(strftime('%s', start_iso) AS INTEGER) * 1000, CAST(strftime('%s', end_iso) AS INTEGER) * 1000,
  location, notes, NULL, type, is_all_day, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM step_seed;

-- Pin almost every scheduled stop to a concrete OpenStreetMap location.
WITH seasonal_place_seed(season, slug, location, lat, lng) AS (VALUES
  ('spring', 'train-kyoto', '京都駅（京都府京都市下京区東塩小路釜殿町）', 34.985849, 135.758767),
  ('spring', 'hotel-bag', '京都駅（京都府京都市下京区東塩小路釜殿町）', 34.985849, 135.758767),
  ('spring', 'kiyomizu', '清水寺（京都府京都市東山区清水1丁目294）', 34.994303, 135.784439),
  ('spring', 'lunch', '二寧坂（京都府京都市東山区桝屋町）', 34.998190, 135.780730),
  ('spring', 'gion', '祇園白川（京都府京都市東山区元吉町）', 35.005120, 135.775090),
  ('spring', 'dinner', '祇園四条駅（京都府京都市東山区四条大橋東詰）', 35.003770, 135.772250),
  ('spring', 'hotel-1', '京都駅（京都府京都市下京区東塩小路釜殿町）', 34.985849, 135.758767),
  ('spring', 'arashiyama', '竹林の小径（京都府京都市右京区嵯峨小倉山田淵山町）', 35.017040, 135.671300),
  ('spring', 'tenryuji', '天龍寺（京都府京都市右京区嵯峨天龍寺芒ノ馬場町68）', 35.015780, 135.674120),
  ('spring', 'uji-train', '宇治駅（京都府宇治市宇治宇文字）', 34.890330, 135.800740),
  ('spring', 'uji', '平等院（京都府宇治市宇治蓮華116）', 34.889300, 135.807680),
  ('spring', 'hotel-2', '京都駅（京都府京都市下京区東塩小路釜殿町）', 34.985849, 135.758767),
  ('spring', 'fushimi', '伏見稲荷大社（京都府京都市伏見区深草薮之内町68）', 34.967140, 135.772670),
  ('spring', 'nishiki', '錦市場（京都府京都市中京区西大文字町609）', 35.005010, 135.764810),
  ('spring', 'return', '京都駅（京都府京都市下京区東塩小路釜殿町）', 34.985849, 135.758767),
  ('summer', 'flight-out', '那覇空港（沖縄県那覇市鏡水150）', 26.206520, 127.646100),
  ('summer', 'rental-car', '那覇空港（沖縄県那覇市鏡水150）', 26.206520, 127.646100),
  ('summer', 'drive-onna', '恩納村役場（沖縄県国頭郡恩納村恩納2451）', 26.497400, 127.853500),
  ('summer', 'snorkel', '真栄田岬（沖縄県国頭郡恩納村真栄田469-1）', 26.443890, 127.771470),
  ('summer', 'hotel-1', '恩納村海浜公園ナビービーチ（沖縄県国頭郡恩納村恩納419-4）', 26.497600, 127.850800),
  ('summer', 'aquarium', '沖縄美ら海水族館（沖縄県国頭郡本部町石川424）', 26.694370, 127.877920),
  ('summer', 'bise', '備瀬のフクギ並木（沖縄県国頭郡本部町備瀬）', 26.703660, 127.880170),
  ('summer', 'kouri', '古宇利ビーチ（沖縄県国頭郡今帰仁村古宇利）', 26.696870, 128.018650),
  ('summer', 'hotel-2', '恩納村海浜公園ナビービーチ（沖縄県国頭郡恩納村恩納419-4）', 26.497600, 127.850800),
  ('summer', 'yanbaru', '東村ふれあいヒルギ公園（沖縄県国頭郡東村慶佐次54-1）', 26.653680, 128.076420),
  ('summer', 'ogimi', '道の駅おおぎみ やんばるの森ビジターセンター（沖縄県国頭郡大宜味村津波95）', 26.691020, 128.117330),
  ('summer', 'sunset', '万座毛（沖縄県国頭郡恩納村恩納）', 26.505080, 127.850350),
  ('summer', 'hotel-3', '恩納村海浜公園ナビービーチ（沖縄県国頭郡恩納村恩納419-4）', 26.497600, 127.850800),
  ('summer', 'shuri', '首里城公園（沖縄県那覇市首里金城町1丁目2）', 26.217040, 127.719430),
  ('summer', 'market', '第一牧志公設市場（沖縄県那覇市松尾2丁目10-1）', 26.214650, 127.688710),
  ('summer', 'flight-home', '那覇空港（沖縄県那覇市鏡水150）', 26.206520, 127.646100),
  ('autumn', 'train-nikko', '東武日光駅（栃木県日光市松原町4-3）', 36.748200, 139.619430),
  ('autumn', 'tosho', '日光東照宮（栃木県日光市山内2301）', 36.758060, 139.598850),
  ('autumn', 'lunch-nikko', '西参道茶屋（栃木県日光市安川町10-20）', 36.754640, 139.595030),
  ('autumn', 'shinkyo', '神橋（栃木県日光市上鉢石町）', 36.753590, 139.604300),
  ('autumn', 'hotel-nikko', '東武日光駅（栃木県日光市松原町4-3）', 36.748200, 139.619430),
  ('autumn', 'bus-chuzenji', '中禅寺温泉バスターミナル（栃木県日光市中宮祠）', 36.738000, 139.495500),
  ('autumn', 'kegon', '華厳滝（栃木県日光市中宮祠2479-2）', 36.738080, 139.503180),
  ('autumn', 'chuzenji', '中禅寺湖遊覧船 船の駅中禅寺（栃木県日光市中宮祠2478）', 36.737800, 139.493800),
  ('autumn', 'embassy', '英国大使館別荘記念公園（栃木県日光市中宮祠2482）', 36.724900, 139.483700),
  ('autumn', 'hotel-chuzenji-1', '中禅寺温泉バスターミナル（栃木県日光市中宮祠）', 36.738000, 139.495500),
  ('autumn', 'senjogahara', '赤沼自然情報センター（栃木県日光市中宮祠2494）', 36.777000, 139.446000),
  ('autumn', 'yudaki', '湯滝（栃木県日光市湯元）', 36.807300, 139.430400),
  ('autumn', 'hotel-chuzenji-2', '中禅寺温泉バスターミナル（栃木県日光市中宮祠）', 36.738000, 139.495500),
  ('autumn', 'akechidaira', '明智平ロープウェイ（栃木県日光市細尾町）', 36.737500, 139.532500),
  ('autumn', 'to-kinugawa', '鬼怒川温泉駅（栃木県日光市鬼怒川温泉大原1390）', 36.822400, 139.716800),
  ('autumn', 'onsen-town', '鬼怒楯岩大吊橋（栃木県日光市鬼怒川温泉大原）', 36.819200, 139.713600),
  ('autumn', 'hotel-kinugawa', '鬼怒川温泉駅（栃木県日光市鬼怒川温泉大原1390）', 36.822400, 139.716800),
  ('autumn', 'ryuokyo', '龍王峡駅（栃木県日光市藤原）', 36.852000, 139.771000),
  ('autumn', 'aizu-train', '会津若松駅（福島県会津若松市駅前町1-1）', 37.508900, 139.930200),
  ('autumn', 'nanukamachi', '七日町駅（福島県会津若松市七日町）', 37.500800, 139.920600),
  ('autumn', 'hotel-aizu-1', '会津若松駅（福島県会津若松市駅前町1-1）', 37.508900, 139.930200),
  ('autumn', 'tsurugajo', '鶴ヶ城（福島県会津若松市追手町1-1）', 37.487700, 139.929800),
  ('autumn', 'sazaedo', '会津さざえ堂（福島県会津若松市一箕町八幡滝沢155）', 37.504800, 139.948000),
  ('autumn', 'higashiyama', '会津東山温泉観光協会（福島県会津若松市東山町湯本滝ノ湯110）', 37.480400, 139.962500),
  ('autumn', 'hotel-aizu-2', '会津若松駅（福島県会津若松市駅前町1-1）', 37.508900, 139.930200),
  ('autumn', 'market-aizu', '野口英世青春館（福島県会津若松市中町4-18）', 37.495600, 139.926700),
  ('autumn', 'return', '会津若松駅（福島県会津若松市駅前町1-1）', 37.508900, 139.930200),
  ('winter', 'flight-sapporo', '新千歳空港（北海道千歳市美々）', 42.775200, 141.692300),
  ('winter', 'odori', '大通公園（北海道札幌市中央区大通西1丁目）', 43.060500, 141.354400),
  ('winter', 'sapporo-stay', '札幌駅（北海道札幌市北区北6条西4丁目）', 43.068700, 141.350800),
  ('winter', 'market', '二条市場（北海道札幌市中央区南3条東1丁目）', 43.059000, 141.358600),
  ('winter', 'maruyama', '北海道神宮（北海道札幌市中央区宮ケ丘474）', 43.054300, 141.307400),
  ('winter', 'museum', '北海道博物館（北海道札幌市厚別区厚別町小野幌53-2）', 43.053000, 141.497400),
  ('winter', 'sapporo-free', '札幌駅（北海道札幌市北区北6条西4丁目）', 43.068700, 141.350800),
  ('winter', 'to-otaru', '小樽駅（北海道小樽市稲穂2丁目22-15）', 43.197300, 140.993700),
  ('winter', 'otaru-walk', '小樽運河（北海道小樽市港町5）', 43.198500, 141.003100),
  ('winter', 'otaru-stay', '小樽駅（北海道小樽市稲穂2丁目22-15）', 43.197300, 140.993700),
  ('winter', 'yoichi', 'ニッカウヰスキー余市蒸溜所（北海道余市郡余市町黒川町7丁目6）', 43.000300, 140.788400),
  ('winter', 'to-niseko', '倶知安駅（北海道虻田郡倶知安町南3条西4丁目）', 42.901700, 140.745500),
  ('winter', 'niseko-stay', 'ひらふウェルカムセンター（北海道虻田郡倶知安町ニセコひらふ1条3丁目）', 42.862200, 140.704300),
  ('winter', 'ski-1', 'ニセコ東急 グラン・ヒラフ（北海道虻田郡倶知安町ニセコひらふ1条2丁目）', 42.864800, 140.704200),
  ('winter', 'snowshoe', 'ひらふウェルカムセンター（北海道虻田郡倶知安町ニセコひらふ1条3丁目）', 42.862200, 140.704300),
  ('winter', 'niseko-free', 'ひらふウェルカムセンター（北海道虻田郡倶知安町ニセコひらふ1条3丁目）', 42.862200, 140.704300),
  ('winter', 'to-toya', '洞爺湖温泉バスターミナル（北海道虻田郡洞爺湖町洞爺湖温泉）', 42.566600, 140.822500),
  ('winter', 'toya-stay', '洞爺湖温泉バスターミナル（北海道虻田郡洞爺湖町洞爺湖温泉）', 42.566600, 140.822500),
  ('winter', 'toya-walk', '洞爺湖ビジターセンター（北海道虻田郡洞爺湖町洞爺湖温泉142-5）', 42.564900, 140.820600),
  ('winter', 'to-noboribetsu', '登別温泉バスターミナル（北海道登別市登別温泉町）', 42.493200, 141.144200),
  ('winter', 'noboribetsu-stay', '登別温泉バスターミナル（北海道登別市登別温泉町）', 42.493200, 141.144200),
  ('winter', 'jigokudani', '登別地獄谷（北海道登別市登別温泉町）', 42.497000, 141.145000),
  ('winter', 'upopoy', 'ウポポイ（北海道白老郡白老町若草町2丁目3）', 42.553500, 141.362800),
  ('winter', 'to-hakodate', '函館駅（北海道函館市若松町12）', 41.773700, 140.726500),
  ('winter', 'motomachi', '函館山ロープウェイ山麓駅（北海道函館市元町19-7）', 41.759800, 140.711800),
  ('winter', 'hakodate-stay', '函館駅（北海道函館市若松町12）', 41.773700, 140.726500),
  ('winter', 'morning-market', '函館朝市（北海道函館市若松町9-19）', 41.772700, 140.726300),
  ('winter', 'goryokaku', '五稜郭タワー（北海道函館市五稜郭町43-9）', 41.796900, 140.756800),
  ('winter', 'bay', '金森赤レンガ倉庫（北海道函館市末広町14-12）', 41.766900, 140.718600),
  ('winter', 'flight-home', '函館空港（北海道函館市高松町511）', 41.770000, 140.822400)
)
UPDATE steps
SET location = (
      SELECT place.location FROM seasonal_place_seed place
      WHERE steps.id = 'official-' || place.season || '-source-' || place.slug
    ),
    notes = json_set(notes, '$.tabitabi_place', json_object(
      'lat', (SELECT place.lat FROM seasonal_place_seed place WHERE steps.id = 'official-' || place.season || '-source-' || place.slug),
      'lng', (SELECT place.lng FROM seasonal_place_seed place WHERE steps.id = 'official-' || place.season || '-source-' || place.slug)
    ))
WHERE EXISTS (
  SELECT 1 FROM seasonal_place_seed place
  WHERE steps.id = 'official-' || place.season || '-source-' || place.slug
);

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

-- map planning: 秋の金沢の週末
INSERT INTO itineraries (
  id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-map-source', '秋の金沢 王道まち歩き1泊2日', 'planning-map', 'neutral', 1, '["ishikawa"]', '["金沢","近江町市場","兼六園","ひがし茶屋街"]', '["グルメ","街歩き","アート"]', 1, '{"text":"10月17日（土）から1泊2日。金沢駅からバスで近江町市場へ向かい、中心部は徒歩で回る。大きな荷物は駅前ホテルに預け、雨に備えて折りたたみ傘を持参。2日目は茶屋街から駅へ戻るバスが混むため、帰りの30分前には移動を始める。"}', NULL, NULL, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-public', '秋の金沢 王道まち歩き1泊2日', 'planning-map', 'neutral', 1, '["ishikawa"]', '["金沢","近江町市場","兼六園","ひがし茶屋街"]', '["グルメ","街歩き","アート"]', 1, '{"text":"10月17日（土）から1泊2日。金沢駅からバスで近江町市場へ向かい、中心部は徒歩で回る。大きな荷物は駅前ホテルに預け、雨に備えて折りたたみ傘を持参。2日目は茶屋街から駅へ戻るバスが混むため、帰りの30分前には移動を始める。"}', NULL, 'official-map-source', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');

INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at) VALUES
  ('official-map-source-arrival', 'official-map-source', '東京から金沢へ', CAST(strftime('%s', '2026-10-17T07:20:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-17T09:50:00+09:00') AS INTEGER) * 1000, '東京駅→金沢駅', '{"text":"7時に東京駅の新幹線南のりかえ口へ集合。到着後、駅前ホテルに荷物を預ける。","tabitabi_schedule":{"precision":"time","day":1,"order":1},"tabitabi_place":{"lat":36.5781,"lng":136.6486}}', NULL, 'transport:train', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-market', 'official-map-source', '近江町市場で海鮮ランチ', CAST(strftime('%s', '2026-10-17T11:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-17T12:30:00+09:00') AS INTEGER) * 1000, '石川県金沢市上近江町50', '{"text":"市場を一周してから昼食。食後は徒歩で金沢城へ向かう。","tabitabi_schedule":{"precision":"time","day":1,"order":2},"tabitabi_place":{"lat":36.5717,"lng":136.6561,"priority":true}}', NULL, 'normal:food', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-castle', 'official-map-source', '金沢城公園', CAST(strftime('%s', '2026-10-17T13:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-17T14:30:00+09:00') AS INTEGER) * 1000, '石川県金沢市丸の内1-1', '{"text":"河北門、菱櫓、五十間長屋を回り、玉泉院丸庭園へ抜ける。","tabitabi_schedule":{"precision":"time","day":1,"order":3},"tabitabi_place":{"lat":36.564,"lng":136.6596}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-museum', 'official-map-source', '金沢21世紀美術館', CAST(strftime('%s', '2026-10-17T15:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-17T17:00:00+09:00') AS INTEGER) * 1000, '石川県金沢市広坂1-2-1', '{"text":"交流ゾーンと予約済みの展覧会を鑑賞。17時に正面入口へ集合する。","tabitabi_schedule":{"precision":"time","day":1,"order":4},"tabitabi_place":{"lat":36.5609,"lng":136.6581,"priority":true}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-hotel', 'official-map-source', '金沢駅前のホテルに宿泊', CAST(strftime('%s', '2026-10-17T18:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-18T08:00:00+09:00') AS INTEGER) * 1000, '金沢駅前', '{"text":"夕食は香林坊で取ってからチェックイン。朝食付き、8時15分にロビー集合。","tabitabi_schedule":{"precision":"time","day":1,"order":5},"tabitabi_place":{"lat":36.5775,"lng":136.648}}', NULL, 'normal:hotel', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-garden', 'official-map-source', '朝の兼六園', CAST(strftime('%s', '2026-10-18T09:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-18T10:30:00+09:00') AS INTEGER) * 1000, '石川県金沢市兼六町1', '{"text":"桂坂口から入り、徽軫灯籠、霞ヶ池、時雨亭の順に歩く。","tabitabi_schedule":{"precision":"time","day":2,"order":6},"tabitabi_place":{"lat":36.5621,"lng":136.6627,"priority":true}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-chaya', 'official-map-source', 'ひがし茶屋街と主計町', CAST(strftime('%s', '2026-10-18T11:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-18T14:00:00+09:00') AS INTEGER) * 1000, '石川県金沢市東山', '{"text":"茶屋街を散策し、町家で昼食。浅野川を渡って主計町まで歩く。","tabitabi_schedule":{"precision":"time","day":2,"order":7},"tabitabi_place":{"lat":36.5726,"lng":136.666,"priority":true}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-map-source-return', 'official-map-source', '金沢から東京へ', CAST(strftime('%s', '2026-10-18T15:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2026-10-18T18:00:00+09:00') AS INTEGER) * 1000, '金沢駅→東京駅', '{"text":"14時30分に茶屋街を出発。駅で荷物とお土産を受け取って乗車する。","tabitabi_schedule":{"precision":"time","day":2,"order":8},"tabitabi_place":{"lat":36.5781,"lng":136.6486}}', NULL, 'transport:train', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');

INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at)
SELECT replace(id, 'official-map-source-', 'official-map-public-'), 'official-map-public', title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
FROM steps WHERE itinerary_id = 'official-map-source';

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-map-source', 1, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');
INSERT INTO itinerary_publications (source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at)
VALUES ('official-map-source', 'official-map-public', 'official-user', '["ishikawa"]', '["金沢","近江町市場","兼六園","ひがし茶屋街"]', '["グルメ","街歩き","アート"]', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');
INSERT INTO itinerary_fork_stats (itinerary_id, fork_count) VALUES ('official-map-public', 12);

-- simple planning: 紫陽花の鎌倉の週末
INSERT INTO itineraries (
  id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at
) VALUES
  ('official-plan-source', '紫陽花の鎌倉・江の島', 'planning-draft', 'neutral', 1, '["kanagawa"]', '["北鎌倉","鎌倉","長谷","江の島"]', '["紫陽花","寺社・歴史","カフェ","街歩き"]', 1, '{"text":"6月12日（土）から1泊2日。北鎌倉駅に8時集合。寺院は朝から回り、午後は江ノ電で長谷へ移動する。雨天でも実施するので、歩きやすい防水靴と折りたたみ傘を持参。宿は鎌倉駅近く、朝食なし。"}', NULL, NULL, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-public', '紫陽花の鎌倉・江の島', 'planning-draft', 'neutral', 1, '["kanagawa"]', '["北鎌倉","鎌倉","長谷","江の島"]', '["紫陽花","寺社・歴史","カフェ","街歩き"]', 1, '{"text":"6月12日（土）から1泊2日。北鎌倉駅に8時集合。寺院は朝から回り、午後は江ノ電で長谷へ移動する。雨天でも実施するので、歩きやすい防水靴と折りたたみ傘を持参。宿は鎌倉駅近く、朝食なし。"}', NULL, 'official-plan-source', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');

-- Covers are shared by the editable and public copies, and match each trip's character.
UPDATE itineraries
SET background_image = CASE
  WHEN id GLOB 'official-plan-*' THEN '/itinerary-backgrounds/coastal-drive.avif'
  WHEN id GLOB 'official-map-*' THEN '/itinerary-backgrounds/japanese.avif'
END,
background_display = 'cover'
WHERE id GLOB 'official-plan-*' OR id GLOB 'official-map-*';

INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at) VALUES
  ('official-plan-source-meigetsu', 'official-plan-source', '明月院の紫陽花', CAST(strftime('%s', '2027-06-12T08:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-12T10:00:00+09:00') AS INTEGER) * 1000, '鎌倉市山ノ内189', '{"text":"開門後の早い時間に入り、本堂後庭園までゆっくり見る。","tabitabi_schedule":{"precision":"time","day":1,"order":1}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-enkaku', 'official-plan-source', '円覚寺を拝観', CAST(strftime('%s', '2027-06-12T10:15:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-12T11:45:00+09:00') AS INTEGER) * 1000, '鎌倉市山ノ内409', '{"text":"明月院から徒歩で移動。山門、仏殿、舎利殿周辺を歩く。","tabitabi_schedule":{"precision":"time","day":1,"order":2}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-lunch', 'official-plan-source', '北鎌倉で昼食', CAST(strftime('%s', '2027-06-12T12:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-12T13:00:00+09:00') AS INTEGER) * 1000, '北鎌倉駅周辺', '{"text":"3名で予約済み。食後は横須賀線で鎌倉駅へ移動する。","tabitabi_schedule":{"precision":"time","day":1,"order":3}}', NULL, 'normal:meal', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-tsurugaoka', 'official-plan-source', '鶴岡八幡宮を参拝', CAST(strftime('%s', '2027-06-12T13:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-12T15:00:00+09:00') AS INTEGER) * 1000, '鎌倉市雪ノ下2-1-31', '{"text":"若宮大路から入り、本宮を参拝して源平池を回る。","tabitabi_schedule":{"precision":"time","day":1,"order":4}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-komachi', 'official-plan-source', '小町通りで買い物', CAST(strftime('%s', '2027-06-12T15:15:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-12T16:30:00+09:00') AS INTEGER) * 1000, '鎌倉市小町', '{"text":"夕食前にお土産を購入。食べ歩きは店の指定場所で。","tabitabi_schedule":{"precision":"time","day":1,"order":5}}', NULL, 'normal:shopping', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-hotel', 'official-plan-source', '鎌倉駅近くのホテルに宿泊', CAST(strftime('%s', '2027-06-12T18:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T07:30:00+09:00') AS INTEGER) * 1000, '鎌倉駅周辺', '{"text":"夕食後にチェックイン。朝食は長谷へ移動してから取る。","tabitabi_schedule":{"precision":"time","day":1,"order":6}}', NULL, 'normal:hotel', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-hase', 'official-plan-source', '長谷寺の紫陽花路', CAST(strftime('%s', '2027-06-13T08:00:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T10:00:00+09:00') AS INTEGER) * 1000, '鎌倉市長谷3-11-2', '{"text":"拝観受付後、紫陽花路の案内に従う。混雑時は先に本堂と海景色を見る。","tabitabi_schedule":{"precision":"time","day":2,"order":7}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-buddha', 'official-plan-source', '鎌倉大仏を拝観', CAST(strftime('%s', '2027-06-13T10:20:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T11:20:00+09:00') AS INTEGER) * 1000, '鎌倉市長谷4-2-28', '{"text":"長谷寺から徒歩で移動。雨が強ければ大仏拝観後すぐ江ノ電へ。","tabitabi_schedule":{"precision":"time","day":2,"order":8}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-lunch-hase', 'official-plan-source', '長谷でしらすランチ', CAST(strftime('%s', '2027-06-13T11:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T12:30:00+09:00') AS INTEGER) * 1000, '長谷駅周辺', '{"text":"禁漁や入荷状況により釜揚げしらすへ変更する。","tabitabi_schedule":{"precision":"time","day":2,"order":9}}', NULL, 'normal:meal', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-enoshima', 'official-plan-source', '江の島を散策', CAST(strftime('%s', '2027-06-13T13:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T16:00:00+09:00') AS INTEGER) * 1000, '藤沢市江の島', '{"text":"江島神社まで参拝し、天候が良ければシーキャンドルへ。16時に弁天橋へ集合。","tabitabi_schedule":{"precision":"time","day":2,"order":10}}', NULL, 'normal:sightseeing', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'),
  ('official-plan-source-return', 'official-plan-source', '片瀬江ノ島から帰路へ', CAST(strftime('%s', '2027-06-13T16:30:00+09:00') AS INTEGER) * 1000, CAST(strftime('%s', '2027-06-13T17:45:00+09:00') AS INTEGER) * 1000, '片瀬江ノ島駅→新宿駅', '{"text":"小田急線で帰宅。乗車前に飲み物を購入する。","tabitabi_schedule":{"precision":"time","day":2,"order":11}}', NULL, 'transport:train', 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');

WITH plan_place_seed(slug, location, lat, lng) AS (VALUES
  ('meigetsu', '明月院（神奈川県鎌倉市山ノ内189）', 35.334830, 139.551050),
  ('enkaku', '円覚寺（神奈川県鎌倉市山ノ内409）', 35.337190, 139.547960),
  ('lunch', '北鎌倉駅（神奈川県鎌倉市山ノ内501）', 35.337300, 139.545000),
  ('tsurugaoka', '鶴岡八幡宮（神奈川県鎌倉市雪ノ下2丁目1-31）', 35.325800, 139.556400),
  ('komachi', '小町通り（神奈川県鎌倉市小町）', 35.321100, 139.551500),
  ('hotel', '鎌倉駅（神奈川県鎌倉市小町1丁目1）', 35.319000, 139.550300),
  ('hase', '長谷寺（神奈川県鎌倉市長谷3丁目11-2）', 35.312550, 139.533050),
  ('buddha', '高徳院 鎌倉大仏（神奈川県鎌倉市長谷4丁目2-28）', 35.316700, 139.535700),
  ('lunch-hase', '長谷駅（神奈川県鎌倉市長谷2丁目14）', 35.311300, 139.536200),
  ('enoshima', '江島神社 辺津宮（神奈川県藤沢市江の島2丁目3-8）', 35.300000, 139.480900),
  ('return', '片瀬江ノ島駅（神奈川県藤沢市片瀬海岸2丁目15-3）', 35.308000, 139.482500)
)
UPDATE steps
SET location = (
      SELECT place.location FROM plan_place_seed place
      WHERE steps.id = 'official-plan-source-' || place.slug
    ),
    notes = json_set(notes, '$.tabitabi_place', json_object(
      'lat', (SELECT place.lat FROM plan_place_seed place WHERE steps.id = 'official-plan-source-' || place.slug),
      'lng', (SELECT place.lng FROM plan_place_seed place WHERE steps.id = 'official-plan-source-' || place.slug)
    ))
WHERE EXISTS (
  SELECT 1 FROM plan_place_seed place
  WHERE steps.id = 'official-plan-source-' || place.slug
);

INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at)
SELECT replace(id, 'official-plan-source-', 'official-plan-public-'), 'official-plan-public', title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at
FROM steps WHERE itinerary_id = 'official-plan-source';

INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)
VALUES ('official-user', 'official-plan-source', 1, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');
INSERT INTO itinerary_publications (source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at)
VALUES ('official-plan-source', 'official-plan-public', 'official-user', '["kanagawa"]', '["北鎌倉","鎌倉","長谷","江の島"]', '["紫陽花","寺社・歴史","カフェ","街歩き"]', '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z');
INSERT INTO itinerary_fork_stats (itinerary_id, fork_count) VALUES ('official-plan-public', 9);

-- Keep each official seasonal bookmark aligned with its season.
UPDATE itineraries
SET palette_id = CASE
  WHEN id LIKE 'official-spring-%' THEN 'sakura'
  WHEN id LIKE 'official-summer-%' THEN 'ocean'
  WHEN id LIKE 'official-autumn-%' THEN 'autumn'
  WHEN id LIKE 'official-winter-%' THEN 'snow'
  ELSE palette_id
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
  WHEN id LIKE 'official-spring-%' THEN 240000
  WHEN id LIKE 'official-summer-%' THEN 450000
  WHEN id LIKE 'official-autumn-%' THEN 450000
  WHEN id LIKE 'official-winter-%' THEN 1400000
  WHEN id LIKE 'official-map-%' THEN 150000
  WHEN id LIKE 'official-plan-%' THEN 80000
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
    WHEN i.id LIKE 'official-spring-%' AND e.kind='hotel' THEN 72000
    WHEN i.id LIKE 'official-spring-%' AND e.kind='transport' THEN 84000
    WHEN i.id LIKE 'official-spring-%' THEN 60000
    WHEN i.id LIKE 'official-summer-%' AND e.kind='hotel' THEN 150000
    WHEN i.id LIKE 'official-summer-%' AND e.kind='transport' THEN 175000
    WHEN i.id LIKE 'official-summer-%' THEN 90000
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='hotel' THEN 210000
    WHEN i.id LIKE 'official-autumn-%' AND e.kind='transport' THEN 105000
    WHEN i.id LIKE 'official-autumn-%' THEN 105000
    WHEN i.id LIKE 'official-winter-%' AND e.kind='hotel' THEN 650000
    WHEN i.id LIKE 'official-winter-%' AND e.kind='transport' THEN 300000
    WHEN i.id LIKE 'official-winter-%' THEN 360000
    WHEN i.id LIKE 'official-map-%' AND e.kind='hotel' THEN 30000
    WHEN i.id LIKE 'official-map-%' AND e.kind='transport' THEN 75000
    WHEN i.id LIKE 'official-map-%' THEN 30000
    WHEN i.id LIKE 'official-plan-%' AND e.kind='hotel' THEN 27000
    WHEN i.id LIKE 'official-plan-%' AND e.kind='transport' THEN 9000
    ELSE 30000
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
    WHEN i.id LIKE 'official-winter-%' THEN '2027-02-01'
    WHEN i.id LIKE 'official-map-%' AND e.kind='food' THEN '2026-10-18'
    WHEN i.id LIKE 'official-map-%' THEN '2026-10-17'
    WHEN i.id LIKE 'official-plan-%' AND e.kind='food' THEN '2027-06-13'
    ELSE '2027-06-12'
  END,
  NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i CROSS JOIN expense_seed e
WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_money_item_splits (item_id, member_id, itinerary_id, amount)
SELECT expense.id, member.id, expense.itinerary_id, expense.amount / 3
FROM itinerary_money_items expense JOIN itinerary_members member ON member.itinerary_id = expense.itinerary_id
WHERE expense.itinerary_id GLOB 'official-*-source' OR expense.itinerary_id GLOB 'official-*-public';

INSERT INTO itinerary_money_fund_transactions (id, itinerary_id, member_id, kind, amount, note, occurred_on, created_at)
SELECT m.itinerary_id || '-fund-' || m.id, m.itinerary_id, m.id, 'contribution', CASE
    WHEN m.itinerary_id LIKE 'official-spring-%' THEN 20000
    WHEN m.itinerary_id LIKE 'official-summer-%' THEN 30000
    WHEN m.itinerary_id LIKE 'official-autumn-%' THEN 35000
    WHEN m.itinerary_id LIKE 'official-winter-%' THEN 80000
    ELSE 10000
  END, '旅行前の共同費',
  CASE
    WHEN m.itinerary_id LIKE 'official-spring-%' THEN '2027-03-28'
    WHEN m.itinerary_id LIKE 'official-summer-%' THEN '2027-07-10'
    WHEN m.itinerary_id LIKE 'official-autumn-%' THEN '2026-10-12'
    WHEN m.itinerary_id LIKE 'official-winter-%' THEN '2027-01-25'
    WHEN m.itinerary_id LIKE 'official-map-%' THEN '2026-10-10'
    ELSE '2027-06-05'
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
  WHEN i.id LIKE 'official-autumn-%' THEN 7 WHEN i.id LIKE 'official-winter-%' THEN 8
  ELSE 2 END,
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

WITH seasonal_item(kind, name, quantity, assignee) AS (VALUES
  ('spring', '薄手の上着', 1, NULL),
  ('spring', '御朱印帳', 1, 'c'),
  ('summer', '水着とラッシュガード', 1, NULL),
  ('summer', '日焼け止め', 2, 'a'),
  ('autumn', '薄手のダウン', 1, NULL),
  ('autumn', 'ハイキング用レインウェア', 1, NULL),
  ('winter', '防水防寒ブーツ', 1, NULL),
  ('winter', '携帯用滑り止め', 3, 'b'),
  ('map', '折りたたみ傘', 3, 'a'),
  ('map', '美術館の予約画面', 1, 'c'),
  ('plan', '防水の歩きやすい靴', 1, NULL),
  ('plan', '折りたたみ傘', 3, 'b')
)
INSERT INTO itinerary_packing_items (
  id, itinerary_id, name, quantity, kind, group_id, assignee_member_id, owner_member_id, is_packed, created_at, updated_at
)
SELECT i.id || '-item-trip-' || row_number() OVER (PARTITION BY i.id ORDER BY s.name),
  i.id, s.name, s.quantity, CASE WHEN s.assignee IS NULL THEN 'personal' ELSE 'shared' END,
  i.id || CASE WHEN s.name LIKE '%上着%' OR s.name LIKE '%靴%' OR s.name LIKE '%ブーツ%' THEN '-pack-clothes' ELSE '-pack-tools' END,
  CASE WHEN s.assignee IS NULL THEN NULL ELSE i.id || '-member-' || s.assignee END,
  NULL, 0, '2026-09-08T00:00:00.000Z', '2026-09-08T00:00:00.000Z'
FROM itineraries i
JOIN seasonal_item s ON i.id LIKE 'official-' || s.kind || '-%'
WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';

INSERT INTO itinerary_packing_checks (item_id, member_id, itinerary_id, checked_at)
SELECT i.id || '-item-wallet', i.id || '-member-a', i.id, '2026-09-08T00:00:00.000Z'
FROM itineraries i WHERE i.id GLOB 'official-*-source' OR i.id GLOB 'official-*-public';
