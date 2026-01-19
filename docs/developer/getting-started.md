# 開発ガイド

## 開発方針

### 軽量なサイトを目指す

パフォーマンスを重視し、軽量なサイトを維持する。

- 画像は適切に圧縮する（WebP推奨、必要に応じてpngquant/optipngを使用）
- 不要な依存パッケージを追加しない
- バンドルサイズを意識する
- 遅延読み込み（lazy loading）を活用する

## プレビュー環境

PRで変更内容を確認したい場合、コメントでプレビュー環境をデプロイできます。

### デプロイ方法

PRのコメント欄に以下を投稿：

```
/deploy-preview
```

または、GitHub ActionsのUIから手動実行も可能。

### 仕組み

- コメントトリガーでGitHub Actionsの`.github/workflows/preview.yml`が実行される
- Cloudflare WorkersとPagesに`preview-pr-{番号}`環境が作成される
- PRのコメントにプレビューURLが投稿される

### アクセス

デプロイ後、以下のURLでアクセス可能：

- **Web**: `https://preview-pr-{番号}.tabitabi.pages.dev`
- **API**: `https://tabitabi-api-preview-pr-{番号}.oranda.workers.dev/api/v1`

### 注意事項

- データベースは本番環境と同じものを共有
- PRをクローズすると自動的にクリーンアップされる
- プレビュー環境は開発・検証用途のみ
- 必要な時だけデプロイすることで、リソースを節約できる

## 開発の進め方
### ディレクトリ構成

```
tabitabi/
├── apps/
│   ├── api/                    # バックエンド (Cloudflare Workers + Hono)
│   │   ├── src/
│   │   │   ├── index.ts        # エントリーポイント
│   │   │   ├── routes/         # APIエンドポイント
│   │   │   ├── services/       # ビジネスロジック
│   │   │   ├── middleware/     # 認証・CORSなど
│   │   │   └── utils/          # ユーティリティ
│   │   └── migrations/         # DBマイグレーション
│   │
│   └── web/                    # フロントエンド (SvelteKit)
│       └── src/
│           ├── lib/
│           │   ├── api/        # APIラッパー（バックエンド呼び出し）
│           │   ├── auth/       # 認証関連
│           │   └── themes/     # テーマ（UIコンポーネント）
│           └── routes/         # ページ
│
├── packages/
│   └── types/                  # 共有型定義
│
└── docs/                       # ドキュメント
```

## 開発時の注意点

### スタイリング

用途に応じて手法を使い分け、混在を避ける。

#### 1. Tailwind CSS（推奨: 汎用ページ）

**使用場所**: `+error.svelte`, `+layout.svelte`, `itineraries/` など共通ページ

```svelte
<!-- ✅ OK -->
<div class="min-h-screen bg-gray-50 p-4">
  <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
    送信
  </button>
</div>
```

#### 2. 外部CSSファイル（テーマ専用）

**使用場所**: `lib/themes/*/styles/`

- テーマ固有のスタイルは`styles/`配下にCSSファイルとして分割
- CSS変数を活用（`--ai-primary`, `--autumn-accent`など）
- コンポーネントからは`import "./styles/index.css"`で一括読み込み

```
themes/ai-generated/
├── styles/
│   ├── index.css      # エントリーポイント（@import で他をまとめる）
│   ├── variables.css  # CSS変数
│   ├── base.css
│   ├── header.css
│   └── ...
└── ItineraryView.svelte
```

#### 3. Scoped `<style>`（ホームページ専用）

**使用場所**: `routes/home/` 配下のコンポーネント

- 他で再利用しない単発コンポーネント向け
- 外部CSSを増やさずFCP/LCPを改善

```svelte
<!-- ✅ OK: home/Footer.svelte -->
<footer class="footer">...</footer>

<style>
  .footer {
    background: #1f2937;
    padding: 1.5rem 1rem;
  }
</style>
```

#### 4. インラインスタイル（動的値のみ）

**使用場所**: JavaScriptで計算される値

```svelte
<!-- ✅ OK: 動的な値 -->
<div style="--delay: {index * 0.1}s"></div>
<div style="left: {x}%; top: {y}%"></div>
<div style="width: {progress}%"></div>

<!-- ❌ NG: 静的な値 -->
<div style="margin-top: 1.5rem;"></div>
<div style="padding: 1rem; background: var(--surface);"></div>
```

#### パフォーマンス考慮

- クリティカルCSSは`app.html`にインライン化済み（FCP改善）
- テーマCSSは動的import（`loadTheme()`）と同期してロードされるため、不要なテーマのCSSはバンドルされない
- Scoped CSSはコンポーネント単位でcode-splitされるため、homeページ以外では読み込まれない

### テーマは独立させる

- 各テーマは `apps/web/src/lib/themes/` 配下に作成
- テーマ間でコードを共有しない（コピペOK）
- 共通ロジックはAPIラッパー経由で利用

### APIラッパーを経由する

テーマから直接fetchしない。必ず `lib/api/` のラッパー関数を使う。

```typescript
// ❌ NG
const res = await fetch('/api/v1/steps');

// ✅ OK
import { getSteps } from '$lib/api/step';
const steps = await getSteps(itineraryId);
```

### 機能追加の流れ

複数のテーマを作成するので、重要なもの（認証など）以外はテーマ間で独立して作成できるようにする。

機能追加の場合
1. 対応するテーブルを作成する
  1. migrationファイルを書く
  1. データベースはシンプルに保ち、機能追加の場合は別でitinerariesに依存したテーブルを作成する
  1. 更新されたテーブル構造を`docs/database.md`に記載する
1. テーブルをラップするapiを作成
1. フロントでbackendのapiを叩く処理をラップする関数を作成
1. 各テーマでは、apiを呼び出すのは関数を叩くだけにする

これで、テーマ間で独立しながらDRY原則を守って開発できる

## セットアップ

### 必要な環境
- Node.js (v20以上推奨)
- pnpm (v10.16.1)

### 初回セットアップ手順

1. **依存パッケージのインストール**
   ```bash
   pnpm install
   ```

2. **Cloudflare Wranglerのログイン**
   ```bash
   pnpm wrangler login
   ```

3. **環境設定ファイルの作成**
   - `wrangler.toml.example`を参考に`apps/api/wrangler.toml`を作成
   - D1データベースのIDを設定

4. **データベースマイグレーション（ローカル開発用）**
   ```bash
   make migrate-local
   ```

5. **開発サーバーの起動**
   ```bash
   make dev
   ```
   - API: `http://localhost:8787`
   - Web: `http://localhost:5173`

### 環境変数 / Secrets の設定

JWTベースの認証を利用しているため、`JWT_SECRET` の設定が必要です。ローカルとテストはサンプル値で動作しますが、本番は必ずダッシュボードまたはWranglerのSecretsで設定してください。

- ローカル開発: `apps/api/wrangler.toml` の `[vars]` に開発用値を設定済み
- CI/テスト: `apps/api/wrangler.test.toml` にテスト用値を設定済み
- 本番環境: Cloudflare Workers の Secrets に登録（ソースコードに秘密値は含めない）

本番への設定例（Wrangler経由）

```bash
cd apps/api
pnpm wrangler login
pnpm wrangler secret put JWT_SECRET --env production
```

Cloudflareダッシュボードから設定する場合
- Workers & Queues → 該当Worker（例: `tabitabi-api`）→ Settings → Variables → Secrets に `JWT_SECRET` を追加

デプロイ時に `--env production` を指定していない場合、`[env.production]` の設定が反映されません。必要に応じて以下で明示します。

```bash
cd apps/api
pnpm wrangler deploy --env production
```
