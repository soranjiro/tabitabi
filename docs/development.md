# development

## ディレクトリ構成

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
