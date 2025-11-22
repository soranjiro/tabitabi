# Tabitabi (たびたび)

旅のしおり管理アプリ - テーマで変わるデザイン、あなただけの旅の記録を作りましょう。

## 🌟 特徴

- **テーマ駆動アーキテクチャ**: テーマを切り替えるだけでUI/UXが完全に変わります
- **軽量・高速**: 必要な機能とデータのみを取得する効率的な設計
- **拡張性**: 新機能の追加が容易な疎結合アーキテクチャ
- **モダンな技術スタック**: SvelteKit + Cloudflare Workers + D1

## 🚀 デプロイ済み

- **フロントエンド**: https://tabitabi.pages.dev
- **API**: https://tabitabi-api.soranjiro.workers.dev

## 📦 プロジェクト構成

```
tabitabi/
├── apps/
│   ├── api/          # Cloudflare Workers API
│   └── web/          # SvelteKit Frontend
├── packages/
│   └── types/        # 共有型定義
└── migrations/       # D1 Database migrations
```

## 🛠️ 開発

### 必要なもの

- Node.js 18+
- pnpm
- Cloudflare Account (デプロイ時)

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# データベースマイグレーション
cd apps/api
pnpm wrangler d1 migrations apply tabitabi-db --local

# 開発サーバー起動
pnpm dev
```

### ローカル開発

```bash
# APIサーバー
cd apps/api
pnpm dev

# フロントエンド
cd apps/web
pnpm dev
```

## 🚀 デプロイ

```bash
# API デプロイ
cd apps/api
pnpm deploy

# フロントエンド デプロイ
cd apps/web
pnpm deploy
```

## 📝 API エンドポイント

### しおり管理
- \`GET /api/v1/itineraries\` - しおり一覧
- \`GET /api/v1/itineraries/:id\` - しおり詳細
- \`POST /api/v1/itineraries\` - しおり作成
- \`PUT /api/v1/itineraries/:id\` - しおり更新
- \`DELETE /api/v1/itineraries/:id\` - しおり削除

### タイムライン
- \`GET /api/v1/itineraries/:id/timeline\` - タイムライン取得
- \`POST /api/v1/itineraries/:id/timeline/steps\` - ステップ追加
- \`PUT /api/v1/itineraries/timeline/steps/:stepId\` - ステップ更新
- \`DELETE /api/v1/itineraries/timeline/steps/:stepId\` - ステップ削除

## 🎨 テーマ

現在利用可能なテーマ:

- **Minimal**: シンプルで必要最小限の機能
- **AI Generated**: AI生成デザイン
- **Standard Autumn**: 秋色のやさしい配色で読みやすさ重視

## 📄 ライセンス

MIT

## 🤝 コントリビューション

プルリクエスト、Issue、機能リクエストを歓迎します!

## 📚 ドキュメント

詳細な設計と仕様は [docs/](./docs/) ディレクトリを参照してください。

- [PRD (要件定義書)](./docs/prd.md)
- [詳細設計書](./docs/detailed-design.md)
