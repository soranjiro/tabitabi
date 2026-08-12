# 開発を始める

## 必要な環境

- Node.js 22（CIと同じメジャーバージョンを推奨）
- pnpm 10.16.1
- Git
- Cloudflareアカウント（リモートD1やデプロイを行う場合）
- Firebaseプロジェクト（アカウント画面を実際に動かす場合）

## 初回セットアップ

```bash
git clone https://github.com/soranjiro/tabitabi.git
cd tabitabi
pnpm install
```

### API設定

サンプルをコピーし、ローカル用の `apps/api/wrangler.toml` を作ります。

```bash
cp apps/api/wrangler.toml.example apps/api/wrangler.toml
```

ローカル開発では、少なくとも次を確認してください。

```toml
[[d1_databases]]
binding = "DB"
database_name = "tabitabi"
database_id = "ローカルだけならプレースホルダーでも可"
migrations_dir = "../db/migrations/sql"

[vars]
ALLOWED_ORIGINS = "*"
JWT_SECRET = "ローカル専用の値"
FIREBASE_PROJECT_ID = "Firebaseのproject ID"
ENVIRONMENT = "development"
```

### Web設定

```bash
cp apps/web/.env.example apps/web/.env
```

主な値は次のとおりです。

| 変数 | 用途 |
|---|---|
| `PUBLIC_API_URL` | APIベースURL。ローカルは `http://localhost:8787/api/v1` |
| `PUBLIC_FIREBASE_API_KEY` | Firebase Webアプリの公開API key |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `PUBLIC_FIREBASE_APP_ID` | Firebase Web app ID |
| `GOOGLE_MAPS_API_KEY` | Google Maps用のサーバー側キー |
| `MAPBOX_ACCESS_TOKEN` | Mapbox用のサーバー側トークン |
| `APP_GITHUB_ISSUES_TOKEN` | 要望フォームからIssueを作るサーバー側トークン |
| `APP_GITHUB_ISSUES_REPOSITORY` | Issue作成先。既定は `soranjiro/tabitabi` |
| `VITE_PUBLIC_GA_ID` | 任意のGoogle Analytics ID |

Firebaseの4変数は `dev` と `build` の前に検証されます。アカウント機能を使わない作業でも
空にはできないため、実値を使わない場合はCIと同様の明示的なプレースホルダーを設定してください。
秘密値を `PUBLIC_` / `VITE_PUBLIC_` で始まる変数へ入れてはいけません。

### ローカルD1

```bash
make migrate-up
```

すべてのマイグレーションは `apps/db/migrations/sql/` で管理し、新しいファイルは
dbmate形式（`-- migrate:up` / `-- migrate:down`）で追加します。

## 開発サーバー

```bash
make dev
```

または `pnpm dev` でも同じです。TurborepoがWebとAPIを並行起動します。

- Web: `http://localhost:5173`
- API: `http://localhost:8787`
- Health check: `http://localhost:8787/health`

片方だけ起動する場合はフィルターを使います。

```bash
pnpm --filter api dev
pnpm --filter web dev
```

## よく使うコマンド

| コマンド | 内容 |
|---|---|
| `make dev` | WebとAPIを開発モードで起動 |
| `pnpm build` | docs生成を含む全パッケージのビルド |
| `pnpm test` | APIとWebのVitest／Nodeテスト |
| `pnpm test:api` | APIテスト |
| `pnpm test:web` | WebのVitest |
| `pnpm --filter web test:e2e` | Playwright E2E |
| `pnpm --filter web build:docs` | `docs/` をWeb配信用HTMLへ変換 |
| `make migrate-status` | ローカルD1の適用状態を表示 |
| `make migrate-up` | ローカルD1を最新化 |
| `make migrate-down` | ローカルD1の最新1件を戻す |
| `make lighthouse` | 起動中のWebをLighthouse計測 |

## 実装上のルール

### APIクライアントを経由する

テーマやページからAPI Workerへ直接 `fetch` せず、`apps/web/src/lib/api/` のラッパーを使います。
ここでAPI URL、しおり編集JWT、Firebase ID token、共通エラー形式を揃えます。

```typescript
import { stepApi } from '$lib/api/step';

const steps = await stepApi.list(itineraryId);
```

### 共有型を先に更新する

WebとAPIで共通する入力・レスポンスは `packages/types/src/` に置きます。DB変更を伴う場合は、
マイグレーション、共有型、API実装、テスト、`docs/developer/database.md` を同じ変更に含めます。

### スタイルの置き場所

- 共通ページ: Tailwind CSS
- テーマ: 各テーマの `styles/` にある外部CSS
- ホーム専用の小さな部品: Svelteのscoped `<style>`
- インラインstyle: JavaScriptで計算した動的値だけ

標準の季節テーマは `standard-seasons/shared/` を共有します。ここを変更すると春・夏・秋・冬の
すべてへ影響するため、4テーマで確認してください。その他のテーマは原則として独立しています。

### パフォーマンス

- テーマと印刷画面は必要になるまで遅延ロードする
- 画像を追加する場合は用途に合うサイズへ圧縮する
- 新しい依存を追加する前に、ブラウザ標準APIや既存依存で代替できないか確認する
- ホーム画面、しおり初期表示、モバイル表示へのバンドル影響を確認する

## Preview環境

同一リポジトリ内のPRでは `.github/workflows/preview.yml` が実行されます。PRコメントの
`/deploy-preview`、またはActionsの手動実行でも再デプロイできます。fork元が異なるPRは、
secretsを渡さないためPreviewデプロイ対象外です。

Previewごとに次が作られます。

- Pages Preview
- `tabitabi-api-preview-pr-{PR番号}` Worker
- `tabitabi-preview-pr-{PR番号}` D1データベース

Previewは本番D1を共有しません。データベースはデプロイ時に作り直され、PRを閉じるとWorkerと
D1を削除します。正確なURLはWorkflowがPRへ投稿するコメントで確認してください。

## 本番・リモート操作

```bash
pnpm wrangler login
```

本番用の `JWT_SECRET`、Cloudflare API token、Firebase公開設定、GitHub Issues tokenなどは
GitHub ActionsまたはCloudflareのsecretとして管理し、リポジトリへコミットしません。

手動でAPIを更新する場合は、先にD1をバックアップし、マイグレーション、API、Webの順に進めます。

```bash
make migrate-up-remote
cd apps/api
pnpm wrangler deploy --env production

cd ../web
pnpm deploy
```

通常の本番デプロイは `main` へのpushで `.github/workflows/deploy.yml` が実行します。
