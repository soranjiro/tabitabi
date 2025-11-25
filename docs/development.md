# development

## 開発方針

### 軽量なサイトを目指す

パフォーマンスを重視し、軽量なサイトを維持する。

- 画像は適切に圧縮する（WebP推奨、必要に応じてpngquant/optipngを使用）
- 不要な依存パッケージを追加しない
- バンドルサイズを意識する
- 遅延読み込み（lazy loading）を活用する

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
