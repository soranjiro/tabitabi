# 開発を始める

## 必要な環境

- Git
- Node.js
- pnpm
- ローカル開発に必要な外部サービスの設定

Node.jsやpnpmの具体的なバージョンは、CI設定とルートの`package.json`を正本として確認してください。

## 初回セットアップ

```bash
git clone https://github.com/soranjiro/tabitabi.git
cd tabitabi
pnpm install
```

環境変数やローカル設定は、各アプリにあるexampleファイルをコピーして作成します。秘密値はリポジトリへコミットしないでください。

## ローカルデータベース

D1のマイグレーションは`apps/db/migrations/sql/`で管理します。

```bash
make migrate-up
```

新しいマイグレーションを追加する場合は、既存ファイルを書き換えず、新しいファイルとして追加してください。

## 開発サーバー

```bash
make dev
```

ルートの`pnpm dev`でも、ワークスペースの開発サーバーを起動できます。個別に起動する場合はpnpmのfilterを利用します。

```bash
pnpm --filter api dev
pnpm --filter web dev
```

## よく使うコマンド

| コマンド | 内容 |
|---|---|
| `make dev` | WebとAPIを開発モードで起動 |
| `pnpm build` | ワークスペースをビルド |
| `pnpm test` | 通常テストを実行 |
| `pnpm test:api` | APIテスト |
| `pnpm test:web` | Webテスト |
| `pnpm --filter web test:e2e` | E2Eテスト |
| `pnpm --filter web build:docs` | `docs/` をWeb配信用HTMLへ変換 |
| `make migrate-up` | ローカルDBへマイグレーションを適用 |

コマンドの正確な一覧は、ルートと各workspaceの`package.json`、`Makefile`を正本として確認してください。

## 実装上の基本ルール

### APIクライアントを経由する

WebからAPIへアクセスするときは`apps/web/src/lib/api/`のラッパーを利用します。URL、認証、エラー処理を各コンポーネントへ重複させないでください。

### 共有型を更新する

WebとAPIで共通する入力・レスポンスは`packages/types/`で管理します。DB変更を伴う場合は、マイグレーション、型、API、テスト、必要なドキュメントを同じ変更で更新します。

### 正本を優先する

テーマ一覧、環境変数、CI、デプロイ先、外部サービスの設定など変化しやすい情報は、対応するソースコードや設定ファイルを正本とします。ドキュメントには判断に必要な原則と参照先を記載します。

### PWAを前提に確認する

WebはPWAとして利用されます。ホーム画面からの起動、standalone表示、Service Workerの更新、モバイルのsafe area、キャッシュの影響を含めて確認してください。

## Previewとデプロイ

Previewや本番デプロイはGitHub ActionsとCloudflareの設定で管理します。環境名、URL、作成されるリソース名などはworkflowを正本として確認してください。

Previewは本番データと分離し、秘密値を安全に扱ってください。手動デプロイが必要な場合も、リポジトリ内のworkflowと設定に沿って実行してください。
