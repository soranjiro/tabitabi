# development

## 開発の進め方

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
