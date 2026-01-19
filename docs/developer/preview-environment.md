# プレビュー環境のセットアップ

このプロジェクトでは、Pull Requestでコメントトリガーによりプレビュー環境を作成できます。

## プレビュー環境の仕組み

### API (Workers)

1. PRコメントで `/deploy-preview` をトリガー
2. `tabitabi-api-preview-pr-{番号}` という名前でWorkerをデプロイ
3. URL: `https://tabitabi-api-preview-pr-{番号}.oranda.workers.dev/api/v1`

各PR専用のWorkerが作成されるため、他のPRと干渉しません。

### Web (Pages)

1. ビルド時に環境変数 `VITE_API_URL` でpreview API URLを設定
2. `preview-pr-{番号}` ブランチ名でPagesにデプロイ
3. WebアプリはビルドされたpreviewのAPI URLに自動的にアクセス

**重要**: Webはビルド時にAPI URLが埋め込まれるため、プレビュー環境のWebは常に対応するpreview Workerにアクセスします。

## プレビュー環境の種類

### 1. コメントトリガー型（推奨）

PRコメントで `/deploy-preview` と投稿することで、WebとAPIの両方をデプロイ。

**メリット**:
- 必要な時だけデプロイできる
- リソースの無駄遣いを防ぐ
- デプロイ時にAPIのURLが自動的にWebに設定される

### 2. Cloudflare Pages自動プレビュー（オプション）

Cloudflare PagesはGitHub連携時、PRごとに自動プレビューを作成する機能があります。

**設定方法**:
1. Cloudflare Dashboard > Workers & Pages > tabitabi > Settings > Builds & deployments
2. "Enable automatic preview deployments" を有効化

**注意**: この場合、APIはコメントトリガーで別途デプロイが必要です。

## 必要な設定

### GitHub Secrets

以下のSecretsをリポジトリに設定してください：

1. **CLOUDFLARE_ACCOUNT_ID**
   - Cloudflareのアカウント ID
   - Cloudflare Dashboard > Workers & Pages > Overview から確認可能

2. **CLOUDFLARE_API_TOKEN**
   - CloudflareのAPIトークン
   - 必要な権限：
     - Account: Cloudflare Workers Scripts:Edit
     - Account: Cloudflare Pages:Edit
     - Account: D1:Edit

3. **CLOUDFLARE_DATABASE_ID**
   - D1データベースのID
   - `wrangler d1 list` で確認可能

### Cloudflareプロジェクト

#### 1. Workers (API)

```bash
cd apps/api
pnpm wrangler deploy --env preview
```

初回デプロイ後、以下の名前でWorkerが作成されます：
- 本番: `tabitabi-api`
- プレビュー: `tabitabi-api-preview-pr-{番号}`

#### 2. Pages (Web)

Cloudflare Dashboard > Workers & Pages > Create applicationから`tabitabi`プロジェクトを作成（初回のみ）

その後はGitHub Actionsで自動デプロイされます。

## ワークフロー

### プレビュー環境の作成

1. PRを作成
2. PRのコメント欄に `/deploy-preview` と投稿
3. `.github/workflows/preview.yml`が実行される
4. API WorkerとPages Webがデプロイされる
5. PRコメントにプレビューURLが投稿される

### プレビュー環境の更新

- 再度 `/deploy-preview` コメントを投稿して再デプロイ
- または、GitHub ActionsのUIから手動実行

### プレビュー環境の削除

- PRをクローズすると`.github/workflows/cleanup-preview.yml`が実行される
- API Workerが削除される
- Pages deploymentはCloudflareが自動管理

## 環境別設定

### API (apps/api/wrangler.toml)

```toml
[env.preview]

[env.preview.vars]
ALLOWED_ORIGINS = "*"
JWT_SECRET = "tabitabi-preview-secret"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "tabitabi"
database_id = "your-database-id"
```

### Web (環境変数)

ビルド時に`VITE_API_URL`が設定されます：

- 本番: `https://tabitabi-api.oranda.workers.dev/api/v1`
- プレビュー: `https://tabitabi-api-preview-pr-{番号}.oranda.workers.dev/api/v1`

## トラブルシューティング

### デプロイが失敗する

1. GitHub Secretsが正しく設定されているか確認
2. CloudflareのAPIトークンの権限を確認
3. Workflowのログを確認

### プレビューURLが表示されない

1. GitHub Actionsの実行ログを確認
2. Cloudflare Dashboard > Workers & Pages でデプロイ状況を確認

### データベースの変更をテストしたい

現在、プレビュー環境は本番と同じデータベースを共有しています。
マイグレーションをテストする場合は、ローカル環境を使用してください：

```bash
cd apps/api
pnpm wrangler d1 execute DB --local --file=migrations/your_migration.sql
```
