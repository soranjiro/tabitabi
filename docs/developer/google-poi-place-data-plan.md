# Google POI サジェストと場所データ構造化 実装計画

## 目的

場所入力欄に Google Places の POI サジェストを追加し、ユーザーが候補を選択して予定を登録した場合に、今後の機械学習・データ分析へ使いやすい形で場所情報を構造化して保存する。従来どおり、Google Places に存在しない場所や、ユーザーが自由入力した場所も登録できる状態を維持する。

## 現状整理

- `Step` は `location?: string | null` のみを持つため、住所・緯度経度・Google Place ID・カテゴリ・選択元などの区別ができない。
- `CreateStepInput` / `UpdateStepInput` も `location` は文字列のみで、API はそのまま `steps.location` に保存している。
- 既存 DB は `steps` テーブルに `location TEXT` を持つだけで、場所用の正規化テーブルや JSON カラムがない。
- 予定追加フォームはテーマごとに実装されており、Minimal では「場所 (任意)」、Map Only では「場所 (Google Mapsで検索されます)」という通常のテキスト入力になっている。
- Map Only テーマは現在の `location` 文字列を Google Maps 側で検索・表示する前提のため、構造化データが追加されても文字列互換を保つ必要がある。

## 調査した既存手法・前提

### Google Places / Maps Platform

- Web UI では **Places UI Kit / Place Autocomplete Element** または **Places API (New) の Autocomplete + Place Details** を使うのが現在の推奨候補。Tabitabi は Svelte のカスタム UI が多いため、初期実装は Places API (New) を backend proxy で呼び、独自の候補リスト UI を作る方がテーマ横断の再利用性が高い。
- Autocomplete は session token を使って、入力中の候補取得と選択後の Place Details を 1 セッションとして扱う。Google は UUID v4 などの一意な token を推奨している。
- Place Details / Text Search / Nearby Search は field mask が必須で、取得フィールドは課金 SKU に影響する。初期実装では ML・地図表示に必要な最小限だけを取得する。
- Google の Places API ポリシー上、Google Maps Content の保存・キャッシュには制限がある一方、Place ID はキャッシュ制限の例外として保存できる。名称・住所・カテゴリ等を永続保存する設計は、利用規約・表示要件・キャッシュ期間を法務/運用で確認したうえで、保存根拠を「ユーザーが旅程の一部として登録した情報」と「Google 由来メタデータ」に分離する。
- Google データを画面に出す箇所では、必要に応じて Google attribution / 「Powered by Google」を表示する。

### データモデリング

- 分析・ML では、自由入力文字列だけでなく、`source`、`provider`、`provider_place_id`、緯度経度、住所コンポーネント、カテゴリ、信頼度、入力時の raw query、ユーザー編集済みフラグを分けるのが有効。
- 標準語彙としては Schema.org `Place` / `PostalAddress` / `GeoCoordinates` に寄せると、後で外部連携や JSON-LD 変換をしやすい。
- Google 以外の場所も登録できるよう、場所は「canonical place」と「step への埋め込み/関連付け」を分け、`provider = 'google' | 'manual' | 'future_provider'` と `match_status = 'selected' | 'manual' | 'unresolved' | 'edited'` を持たせる。

### Tabitabi での実装方針

- API key をブラウザに直接置くと制限設定や濫用対策が難しくなるため、Autocomplete / Details は Cloudflare Worker API の proxy route として実装する。
- 既存テーマのフォームを一気に改修しないため、共通の `PlaceInput.svelte` を作り、各テーマの `location` 入力を段階的に置き換える。
- 既存 API 互換のため `steps.location` は残す。表示用の短い場所名として使い続け、構造化データは新カラム/新テーブルで追加する。

## UX / UI 設計

### 入力体験

1. 場所欄に 2 文字以上入力すると 200〜300ms debounce で候補を取得する。
2. 候補リストには以下を表示する。
   - メイン名: 例「東京タワー」
   - 補助情報: 例「日本、東京都港区」
   - 種別チップ: 例「観光地」「駅」「レストラン」など、Google types をユーザー向けに変換
   - Google attribution
3. キーボード操作に対応する。
   - ↑/↓ で候補移動
   - Enter で選択
   - Esc で閉じる
   - Tab / blur で入力値を保持
4. 候補選択時は Place Details を取得し、`location` 表示値にはユーザーが理解しやすい `displayName.text` または編集後の文字列を入れる。
5. 自由入力の場合は、候補を選ばなくてもそのまま登録できる。候補リストの末尾に「候補を選ばず “{入力値}” として登録」を常に出す。
6. 選択後にユーザーが文字列を編集した場合は `match_status = 'edited'` とし、Google Place ID は残すが、表示名はユーザー編集値を優先する。
7. Google API エラー・ネットワークエラー時は通常のテキスト入力として動作し、「候補を取得できません。自由入力で登録できます。」を控えめに表示する。

### モバイル UX

- 候補リストは入力欄直下に full-width で表示し、44px 以上のタップ領域を確保する。
- 旅先での低速回線を想定し、loading skeleton ではなく小さな spinner と「検索中...」表示にする。
- 端末位置情報は MVP では使わない。将来、ユーザーが許可した場合のみ location bias に利用する。

### テーマ別適用

| テーマ/画面 | MVP 対応 | 補足 |
|---|---:|---|
| Minimal | 必須 | もっとも標準的な予定追加フォーム。 |
| Map Only | 必須 | 選択済み緯度経度を map marker に優先利用し、文字列 geocoding 依存を減らす。 |
| Standard / Autumn / Mapbox / Walica 系 | 段階対応 | 共通 `PlaceInput` を組み込む。 |
| Shopping | 任意 | 「店舗」入力に流用できるが、商品名と店舗名の UX が異なるため第 2 フェーズ。 |
| Pixel Quest | 任意 | RPG 風 UI に合わせた skin を後で作る。 |

## データ設計

### 基本方針

- `steps.location` は既存互換の display string として維持する。
- 構造化場所データは `places` と `step_places` に分離する。
- Google 由来で永続保存してよい/してはいけない可能性がある項目を分けるため、`provider_metadata` は最小限にする。
- 分析用には provider 固有値よりも、正規化済みの `normalized_name`、`country_code`、`lat/lng`、`primary_type`、`source` を優先する。

### 追加テーブル案

```sql
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- google, manual, future_provider
  provider_place_id TEXT, -- Google Place ID; manual は NULL
  display_name TEXT NOT NULL,
  normalized_name TEXT,
  formatted_address TEXT,
  address_country TEXT,
  address_region TEXT,
  address_locality TEXT,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  google_primary_type TEXT,
  google_types_json TEXT,
  data_quality TEXT NOT NULL DEFAULT 'unknown', -- verified, user_entered, inferred, stale, unknown
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_places_provider_place
  ON places(provider, provider_place_id)
  WHERE provider_place_id IS NOT NULL;

CREATE INDEX idx_places_geo ON places(latitude, longitude);
CREATE INDEX idx_places_country_region ON places(address_country, address_region, address_locality);
```

```sql
CREATE TABLE step_places (
  step_id TEXT PRIMARY KEY,
  place_id TEXT,
  input_text TEXT NOT NULL,
  selected_display_name TEXT,
  source TEXT NOT NULL, -- google_autocomplete, manual, imported, ai_generated
  match_status TEXT NOT NULL, -- selected, manual, unresolved, edited
  confidence REAL,
  raw_autocomplete_query TEXT,
  provider_session_token_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
);

CREATE INDEX idx_step_places_place ON step_places(place_id);
CREATE INDEX idx_step_places_source ON step_places(source, match_status);
```

### API 型定義案

```ts
export interface PlaceStructuredData {
  id?: string;
  provider: 'google' | 'manual';
  provider_place_id?: string | null;
  display_name: string;
  formatted_address?: string | null;
  address_components?: {
    country?: string;
    region?: string;
    locality?: string;
    postal_code?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  } | null;
  primary_type?: string | null;
  types?: string[];
  data_quality?: 'verified' | 'user_entered' | 'inferred' | 'stale' | 'unknown';
}

export interface StepPlaceLink {
  input_text: string;
  source: 'google_autocomplete' | 'manual' | 'imported' | 'ai_generated';
  match_status: 'selected' | 'manual' | 'unresolved' | 'edited';
  confidence?: number | null;
  place?: PlaceStructuredData | null;
}

export interface Step {
  // existing fields...
  location?: string | null;
  place?: StepPlaceLink | null;
}
```

`CreateStepInput` / `UpdateStepInput` は後方互換のため `location?: string` を維持し、追加で `place?: StepPlaceLink` を受け取る。`place` がない場合は `location` から manual place を作るか、`step_places` を作らず従来動作にする。

### Google Place Details field mask MVP

初期 field mask は以下を候補にする。

```text
id,displayName,formattedAddress,addressComponents,location,primaryType,types,businessStatus
```

- 必須: `id`, `displayName`, `location`
- 分析向け: `addressComponents`, `primaryType`, `types`
- 表示向け: `formattedAddress`
- 営業終了地点の扱いを後で判断するため: `businessStatus`

コストと規約確認後、`businessStatus` は MVP から外してもよい。写真・レビュー・営業時間・電話番号は MVP では取得しない。

## API / Backend 設計

### 環境変数

- `GOOGLE_MAPS_API_KEY`: Places API (New) 用 server-side key。
- `GOOGLE_PLACES_ENABLED`: 機能フラグ。未設定または false の場合は候補 API が 503/disabled を返し、UI は自由入力にフォールバックする。
- `GOOGLE_PLACES_COUNTRY_BIAS`: `JP` など任意。初期は未指定または `JP` を候補。

### 新規 endpoint 案

#### `POST /api/places/autocomplete`

Request:

```json
{
  "input": "東京タ",
  "session_token": "uuid-v4",
  "language_code": "ja",
  "region_code": "JP",
  "included_primary_types": ["restaurant", "tourist_attraction", "lodging", "train_station"],
  "location_bias": {
    "latitude": 35.6812,
    "longitude": 139.7671,
    "radius_meters": 50000
  }
}
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "provider": "google",
      "provider_place_id": "ChIJ...",
      "main_text": "東京タワー",
      "secondary_text": "日本、東京都港区",
      "types": ["tourist_attraction", "point_of_interest", "establishment"],
      "structured_format": {
        "main_text": "東京タワー",
        "secondary_text": "日本、東京都港区"
      }
    }
  ],
  "attribution": "Powered by Google"
}
```

Backend では以下を行う。

- 入力長・rate limit・CORS を検証する。
- session token はリクエスト単位では保存しない。保存する場合も hash 化し、分析で billing token を復元できないようにする。
- Google API response をそのまま返さず、UI に必要な最小 schema に変換する。

#### `POST /api/places/details`

Request:

```json
{
  "provider_place_id": "ChIJ...",
  "session_token": "uuid-v4",
  "language_code": "ja"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "provider": "google",
    "provider_place_id": "ChIJ...",
    "display_name": "東京タワー",
    "formatted_address": "日本、〒105-0011 東京都港区芝公園４丁目２−８",
    "address_components": {
      "country": "JP",
      "region": "東京都",
      "locality": "港区",
      "postal_code": "105-0011"
    },
    "geo": {
      "latitude": 35.6586,
      "longitude": 139.7454
    },
    "primary_type": "tourist_attraction",
    "types": ["tourist_attraction", "point_of_interest", "establishment"],
    "data_quality": "verified"
  }
}
```

### Step create/update flow

1. UI が Google 候補を選択した場合、Details を取得して `place` payload を作る。
2. `POST /steps` は `location` と `place` の両方を受け取る。
3. Transaction で以下を行う。
   - `steps` を作成/更新。
   - `provider + provider_place_id` で `places` を upsert。
   - `step_places` を upsert。
4. 自由入力の場合は以下のどちらかを選ぶ。
   - MVP: `steps.location` のみ保存し、`step_places` に manual record を作る。
   - 分析優先: `places(provider='manual')` も作り、同名重複は許容する。

推奨は「分析優先」。manual place にも `display_name` と `input_text` を保存しておくと、後でバッチ geocoding / entity resolution をしやすい。

## Frontend 設計

### 共通コンポーネント

`apps/web/src/lib/components/place/PlaceInput.svelte` を追加する。

Props 案:

```ts
interface PlaceInputValue {
  text: string;
  place?: StepPlaceLink | null;
}

interface Props {
  value: PlaceInputValue;
  placeholder?: string;
  disabled?: boolean;
  languageCode?: string;
  regionCode?: string;
  countryBias?: string;
  locationBias?: { latitude: number; longitude: number; radiusMeters?: number } | null;
  onChange: (value: PlaceInputValue) => void;
}
```

内部状態:

- `query`
- `suggestions`
- `selectedIndex`
- `isLoading`
- `errorMessage`
- `sessionToken`
- `lastSelectedProviderPlaceId`

挙動:

- focus 時または query 変更時に session token を生成。
- select 完了または form submit 後に token を破棄。
- query が選択後に編集されたら `match_status = 'edited'`。
- API disabled なら suggestions を出さず通常 input として動作。

### API client

`apps/web/src/lib/api/place.ts` を追加する。

- `autocomplete(input, options)`
- `details(providerPlaceId, sessionToken, options)`

### テーマ統合

1. Minimal の場所入力を `PlaceInput` に置換。
2. Map Only の場所入力を `PlaceInput` に置換し、地図描画は `step.place.place.geo` があれば geocoding より優先。
3. 既存 props の `location?: string` は残しつつ、各 `onCreateStep` / `onUpdateStep` に `place?: StepPlaceLink` を追加。
4. 他テーマは Step form の location input を順次置換する。置換前でも API が `place` optional のため壊れない。

## ML / データ分析で使える形

### 収集できる特徴量

- 旅程単位: 訪問都市数、国/地域、都市間移動距離、POI 密度。
- 予定単位: place category、lat/lng、滞在時間、前後の移動距離、時間帯、曜日。
- ユーザー行動: Google 候補選択率、自由入力率、候補選択後の編集率。
- 品質: `data_quality`, `match_status`, `confidence`, `last_verified_at`。

### 分析 view 案

```sql
CREATE VIEW step_place_features AS
SELECT
  s.id AS step_id,
  s.itinerary_id,
  s.start_at,
  s.end_at,
  s.type AS step_type,
  sp.source,
  sp.match_status,
  p.provider,
  p.provider_place_id IS NOT NULL AS has_provider_id,
  p.address_country,
  p.address_region,
  p.address_locality,
  p.latitude,
  p.longitude,
  p.google_primary_type,
  p.data_quality
FROM steps s
LEFT JOIN step_places sp ON sp.step_id = s.id
LEFT JOIN places p ON p.id = sp.place_id;
```

### 将来の ML 用バッチ

- `manual` / `unresolved` の場所を Google Text Search などで候補化し、人間確認または confidence 閾値で補完する。
- 古い Google Place ID は Place ID refresh flow で検証する。
- 同じ `provider_place_id` の再利用率から人気スポットランキングを生成する。
- category と時間帯から旅程テンプレート推薦を作る。

## プライバシー / 規約 / セキュリティ

- Google API key は server-side に保持し、HTTP referrer/IP/API restriction を Google Cloud 側で設定する。
- Places API の結果をどこまで永続化できるかは、Google Maps Platform Terms と Places API policies を実装前に再確認する。特に Google 由来の名称・住所・カテゴリを永続 DB に保存する範囲は要注意。
- `provider_place_id` は保存可能な主キーとして扱う。その他の Google 由来情報は `last_verified_at` を持ち、必要なら再取得・削除できるようにする。
- ユーザーが自由入力した場所はユーザーコンテンツとして扱い、Google 由来情報とは `source` で区別する。
- session token は生値を DB に保存しない。保存する場合は hash 化し、短期 debugging 用に限定する。
- rate limit を user/IP/itinerary 単位で設け、Autocomplete proxy の濫用を防ぐ。

## 段階的実装ロードマップ

### Phase 0: 規約・プロダクト判断

- [ ] Google Maps Platform の Places API (New) を有効化し、billing / quota / API restrictions を設定。
- [ ] Google 由来データの保存範囲と attribution 表示要件を確認。
- [ ] MVP の対象テーマを Minimal + Map Only に確定。

### Phase 1: 型・DB・API 基盤

- [ ] `packages/types/src/place.ts` を追加し、`StepPlaceLink` / `PlaceStructuredData` を定義。
- [ ] `Step`, `CreateStepInput`, `UpdateStepInput` に optional `place` を追加。
- [ ] D1 migration で `places` / `step_places` を追加。
- [ ] `PlaceService` を追加し、upsert / map row / validation を実装。
- [ ] `StepService.create/update/get/list` を place join 対応にする。
- [ ] 既存 `location` だけのリクエストが壊れないテストを追加。

### Phase 2: Google Places proxy

- [ ] `apps/api/src/routes/places.ts` を追加。
- [ ] Autocomplete endpoint を実装。
- [ ] Details endpoint を実装。
- [ ] field mask を最小化し、language/region を request から受ける。
- [ ] disabled / quota exceeded / Google error の正規化エラーを定義。
- [ ] API tests は Google を mock し、実 API key を CI で要求しない。

### Phase 3: UI コンポーネント

- [ ] `PlaceInput.svelte` と `placeApi` client を追加。
- [ ] debounce, keyboard navigation, mobile-friendly list, loading/error/fallback を実装。
- [ ] Google attribution を候補リスト内に表示。
- [ ] Story/demo または docs に UX 例を追加。

### Phase 4: テーマ統合

- [ ] Minimal の追加/編集フォームに `PlaceInput` を導入。
- [ ] Map Only の追加/編集フォームに `PlaceInput` を導入。
- [ ] Map Only の地図描画で構造化 geo を優先する。
- [ ] 他テーマは既存 location input のままでも動くことを確認し、順次置換。

### Phase 5: 分析基盤

- [ ] `step_place_features` view または analytics query helper を追加。
- [ ] 選択率・自由入力率・編集率のイベント/ログ設計を追加。
- [ ] Place ID refresh / manual matching の運用バッチを設計。

## テスト計画

- Unit: `PlaceService` の upsert、manual place、Google place、edited place、null place。
- API: `/places/autocomplete` と `/places/details` の request validation、Google mock、error normalization。
- API: `/steps` create/update/list が `place` を保存・返却すること、既存 `location` のみでも成功すること。
- Frontend: `PlaceInput` の debounce、候補選択、自由入力、キーボード操作、API disabled fallback。
- E2E: Minimal で Google 候補選択→登録→再表示、自由入力→登録→再表示。
- Regression: secret mode で hidden step の `place` も隠すこと。
- Map: `geo` がある step は geocoding なしで marker 表示できること。

## リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Google Places の保存規約違反 | 高 | Place ID とユーザー入力を中心に保存し、Google 由来フィールドは最小化・再検証可能にする。実装前に規約確認。 |
| API コスト増 | 中〜高 | session token、debounce、min length、field mask、rate limit、feature flag。 |
| テーマごとのフォーム差分 | 中 | 共通 `PlaceInput` と optional `place` payload で段階移行。 |
| 既存データとの互換性 | 中 | `steps.location` 維持、`place` optional、migration は additive。 |
| Google にない場所の登録体験悪化 | 中 | 「候補を選ばず登録」を常時表示し、API failure 時も通常 input にする。 |
| Secret mode の情報漏洩 | 高 | hidden step では `location` だけでなく `place` も null/masked にする。 |

## 実装時に参照する公式ドキュメント

- Google Maps Platform: Places API (New) overview — https://developers.google.com/maps/documentation/places/web-service/op-overview
- Google Maps Platform: Place Autocomplete / session pricing — https://developers.google.com/maps/documentation/javascript/session-pricing
- Google Maps Platform: Places API session tokens — https://developers.google.com/maps/documentation/places/web-service/place-session-tokens
- Google Maps Platform: Place data fields — https://developers.google.com/maps/documentation/places/web-service/data-fields
- Google Maps Platform: Places API policies — https://developers.google.com/maps/documentation/places/web-service/policies
- Google Maps Platform: Place IDs — https://developers.google.com/places/place-id
- Schema.org Place — https://schema.org/Place
