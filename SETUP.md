# 環境設定ガイド

## GitHub Secrets の設定

リポジトリの `Settings → Secrets and variables → Actions → New repository secret` から以下を追加してください:

### 必須 Secrets

| Secret 名 | 説明 | 取得方法 |
|-----------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token → 「Edit Cloudflare Workers」テンプレート + D1 Databases:Edit 権限を追加 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | Cloudflare Dashboard → 左下アカウントメニュー → Account ID をコピー |
| `CLOUDFLARE_DATABASE_ID` | D1 データベース ID | `wrangler d1 list` で確認、または Cloudflare Dashboard → Workers & Pages → D1 → データベース選択 → Database ID |

### API トークンの権限設定

以下の権限が必要です:
- ✅ Account: Workers Scripts — Edit
- ✅ Account: D1 Databases — Edit
- ✅ Zone: Workers Routes — Edit（カスタムドメイン使用時のみ）

## ローカル開発環境の設定

1. `wrangler.toml.example` をコピーして `wrangler.toml` を作成:
   ```bash
   cp wrangler.toml.example wrangler.toml
   cp apps/api/wrangler.toml.example apps/api/wrangler.toml
   ```

2. 環境変数を設定（`.env` ファイルまたはシェル環境変数）:
   ```bash
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_API_TOKEN="your-api-token"
   export CLOUDFLARE_DATABASE_ID="807d36d2-1be9-4dea-a3ab-bf0637a91a27"
   ```

3. Wrangler にログイン:
   ```bash
   pnpm wrangler login
   ```

## デプロイフロー

1. `main` ブランチに push/merge
2. GitHub Actions が自動実行
3. D1 migrations 適用
4. API と Web を Cloudflare Workers にデプロイ

## トラブルシューティング

### デプロイ失敗時の確認項目
- ✅ GitHub Secrets が正しく設定されているか
- ✅ API トークンの権限が十分か
- ✅ アカウント ID とデータベース ID が正しいか
- ✅ `wrangler.toml` が `.gitignore` に含まれているか（機密情報保護のため）

### ローカルでのデプロイテスト
```bash
# 環境変数を設定してからデプロイ
make deploy
```
