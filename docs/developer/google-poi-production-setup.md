# Google POI（Google Places API）本番設定手順

このプロジェクトの「Google POI」は、ブラウザから Google を直接呼ばず、`apps/web` の SvelteKit サーバー側 API が Google Places API (New) を呼ぶ構成です。

- Places Autocomplete: `apps/web/src/routes/api/places/autocomplete/+server.ts`
- Place Details: `apps/web/src/routes/api/places/details/+server.ts`
- 上流呼び出し/正規化: `apps/web/src/lib/server/googlePlaces.ts`

## 全体像（本番でやること）

1. Google Cloud 側で課金（Billing）を有効化
2. Google Cloud 側で `Places API (New)` を有効化
3. server-side 用の API キーを作成し、API 制限をかける
4. Cloudflare Pages（または Workers）側に secret として登録する
5. 本番ではモック用の `GOOGLE_PLACES_API_BASE_URL` を設定しない

## 環境変数（この repo で使うもの）

`apps/web/src/lib/server/googlePlaces.ts` の `getGooglePlacesConfig()` が参照します。

- `GOOGLE_PLACES_API_KEY`
  - 推奨: 本番で必ずこれを設定（server-side 専用）
- `GOOGLE_MAPS_API_KEY`
  - フォールバックとして使われますが、`apps/web/src/routes/api/google-maps/token/+server.ts` がクライアントへ返す実装のため、Places 用の server-side key を兼用しないことを推奨します
- `GOOGLE_PLACES_API_BASE_URL`
  - 未設定なら `https://places.googleapis.com/v1`（デフォルト）
  - 開発時モックを使う場合にだけ `http://localhost:8789/v1` を設定

## Google Cloud 側の設定（Places API のキー作成）

1. Google Cloud Console でプロジェクトを作成/選択
2. Billing を有効化
3. APIs & Services → Library で `Places API (New)` を Enable
4. APIs & Services → Credentials → Create credentials → API key
5. 作った API key に制限（Restrictions）を付ける

### 推奨: API 制限（最低限）

- API restrictions:
  - `Places API (New)` のみに制限
- Application restrictions:
  - server-side key なので、実行環境に応じた制限を検討
  - Cloudflare Workers/Pages からの発信 IP を固定できないことが多く、IP 制限が難しいケースがあります
  - その場合は API 制限（上記）を必須にし、必要に応じて予算/アラートを設定します

## Cloudflare 側の設定（secret の登録）

### Cloudflare Pages を使う場合（推奨）

この repo は `wrangler.toml` に `pages_build_output_dir` があるため、Pages デプロイを想定しています。

Wrangler で secret を登録します（Production 環境）:

```bash
pnpm wrangler pages secret put GOOGLE_PLACES_API_KEY --project-name tabitabi --env production
```

プロンプトが出たら Google Cloud で作成した API key を入力します。

### Cloudflare ダッシュボードから登録する場合

1. Cloudflare Dashboard → Workers & Pages
2. Pages プロジェクト `tabitabi`
3. Settings → Variables and Secrets
4. `GOOGLE_PLACES_API_KEY` を Production に追加（Encrypt を有効化）

## wrangler.toml の注意点

- 本番では `GOOGLE_PLACES_API_BASE_URL=http://localhost:8789/v1` を設定しない（モック向け）
- `GOOGLE_PLACES_API_KEY` は `wrangler.toml` に直書きせず secret として登録する

例（本番 env は URL だけでよい）:

```toml
[env.production]
VITE_API_URL = "https://tabitabi-api.example.workers.dev/api/v1"
```

## Google Maps（地図表示）も本番で使う場合

`GOOGLE_MAPS_API_KEY` を別キーとして用意し、クライアント向け制限を付けます。

推奨:

- `GOOGLE_PLACES_API_KEY`: server-side（Places API (New) 専用）
- `GOOGLE_MAPS_API_KEY`: browser-side（Maps JavaScript API 等）

`GOOGLE_MAPS_API_KEY` はアプリ側でクライアントに渡す実装です:

- `apps/web/src/routes/api/google-maps/token/+server.ts`

そのため、Google Cloud 側で HTTP referrer 制限（利用ドメインのみに限定）を付けます。

## 動作確認（本番）

1. デプロイ後、場所入力 UI で 2 文字以上入力
2. 候補が出る（`/api/places/autocomplete`）
3. 候補を選ぶと詳細が取れる（`/api/places/details`）

失敗時は Cloudflare のログで `/api/places/*` のステータスを確認します。

## よくある原因（チェックリスト）

- `GOOGLE_PLACES_API_KEY` が Production に入っていない
- Google Cloud 側で `Places API (New)` を Enable していない
- Billing が未設定/無効
- API restrictions が別 API に絞られている（`Places API (New)` になっていない）
- 本番に `GOOGLE_PLACES_API_BASE_URL=http://localhost:8789/v1` が残っている

