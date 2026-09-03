# 開発者ガイド

「たびたび」の開発に参加するためのガイドです。

## クイックスタート

```bash
git clone https://github.com/soranjiro/tabitabi.git
cd tabitabi
pnpm install
pnpm dev
```

詳しくは[開発を始める](getting-started.md)を参照してください。

## ガイド

### 環境構築と全体像

| ガイド | 内容 |
|---|---|
| [開発を始める](getting-started.md) | セットアップ、起動、開発時の基本ルール |
| [アーキテクチャ](architecture.md) | Web、API、DB、PWAの構成 |
| [データベース](database.md) | スキーマの正本と設計方針 |
| [アカウント認証](account-auth.md) | 認証の構成と環境設定 |

### 実装

| ガイド | 内容 |
<<<<<<< HEAD
|---|---|
| [機能開発](feature-development.md) | データ、API、Webをまたぐ機能追加 |
| [テーマ開発](theme-development.md) | テーマや表示の追加・変更 |
| [テスト](testing.md) | テスト方針と実行方法 |
| [ドキュメントデザイン](docs-design-guidelines.md) | `/docs` の情報設計と表現ルール |
| [Google POI サジェスト計画](google-poi-place-data-plan.md) | Google Places を使った場所入力・構造化データ保存の実装計画 |
=======
|--------|------|
| [機能開発](feature-development.md) | 新機能の追加方法・API連携 |
| [テーマ開発](theme-development.md) | 新しいテーマの作り方 |
| [テスト](testing.md) | テストの書き方・実行方法 |
| [Google POI サジェスト計画](google-poi-place-data-plan.md) | Google Places を使った場所入力・構造化データ保存の実装計画 |
>>>>>>> 292e9c1 (docs: plan Google POI place suggestions)

## ドキュメント更新の原則

ドキュメントには、現行仕様として必要な内容を記載します。移行履歴、過去の不具合、特定PRで修正した経緯などは原則として残しません。

実装の一覧やバージョンなど変化しやすい情報は、ソースコードや設定ファイルを正本として参照し、ドキュメントへ重複して固定しすぎないようにします。

## コントリビューション

変更はIssueやPull Requestで提案できます。実装変更では、必要なテストとドキュメント更新も同じ変更に含めてください。

詳しくは[CONTRIBUTING.md](https://github.com/soranjiro/tabitabi/blob/main/CONTRIBUTING.md)を参照してください。
