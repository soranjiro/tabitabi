# テスト

APIとWebの通常テストはVitest、ブラウザ操作を含むE2EはPlaywrightを使用します。

## コマンド

```bash
# APIとWebの通常テスト
pnpm test

# ワークスペース別
pnpm test:api
pnpm test:web

# watch mode
pnpm --filter api test
pnpm --filter web test

# E2E
pnpm --filter web test:e2e
pnpm --filter web test:e2e:ui
```

特定ファイルだけを実行する例です。

```bash
pnpm --filter api exec vitest run test/money.test.ts
pnpm --filter web exec vitest run src/lib/print/model.test.ts
pnpm --filter web test:e2e -- shared-snapshot-flow.spec.ts
```

## テストの配置

| 種類 | 場所 | 実行環境 |
|---|---|---|
| API integration | `apps/api/test/*.test.ts` | `@cloudflare/vitest-pool-workers` + ローカルD1 |
| API script | `apps/api/scripts/*.node-test.mjs` | Node test runner |
| Web unit | `apps/web/src/**/*.test.ts` | Vitest + jsdom |
| Web component / view | `apps/web/src/**/*.spec.ts` | Vitest + jsdom |
| E2E | `apps/web/tests/e2e/*.spec.ts` | Playwright / Chromium |

APIの `test:run` はVitestのあとに `node --test scripts/*.node-test.mjs` も実行します。

## APIテスト

`apps/api/vitest.config.ts` は `apps/api/wrangler.test.toml` とD1マイグレーションを読み込みます。
各テストはWorkerへリクエストし、必要に応じてD1へfixtureを投入します。ルートだけでなく、
認証、入力検証、DB制約、レスポンスからの秘密情報除外まで確認してください。

最低限確認する観点:

- 正常系のstatus codeと `{ success, data }`
- Zodまたはルート固有検証による400
- 存在しないIDの404
- 鍵付きしおりでJWTなし／別しおりJWTを使った場合の403
- 公開スナップショットへの書き込み拒否
- 外部キー、CASCADE、複合主キー、機能固有の整合性

マイグレーションを追加したら、テスト環境では先頭から全ファイルが適用されます。既存migrationを
書き換えて通すのではなく、新しいmigrationを追加してください。

## Webテスト

純粋な計算や状態遷移はSvelteコンポーネントから分離し、近くの `.test.ts` で検証します。
現在の例には次があります。

- APIクライアントの認証ヘッダー: `src/lib/api/client.test.ts`
- しおり編集トークン: `src/lib/auth/auth.test.ts`
- Markdownサニタイズ: `standard-seasons/shared/utils/markdown.test.ts`
- 週表示の配置: `standard-seasons/shared/views/WeekView.test.ts`
- 印刷ページ分割: `src/lib/print/model.test.ts`
- 要望フォーム: `src/lib/feedback/feedback.test.ts`

日時テストではローカルタイムゾーンによる差を避け、入力と期待値のタイムゾーンを明示します。

## E2E

Playwright設定は `apps/web/playwright.config.ts`、テストは `apps/web/tests/e2e/` にあります。
開発サーバーを自動起動する設定に従って実行してください。テーマ別のE2Eは時間がかかるため、
修正対象のspecを先に実行し、最後に必要な範囲を広げます。

Firebaseログインが必要な共有コピーのE2Eでは、メール確認とプロフィール設定が済んだ専用
アカウントを環境変数で指定します。未指定の場合、認証必須部分はskipされます。

```bash
E2E_FIREBASE_EMAIL=verified-test@example.com \
E2E_FIREBASE_PASSWORD='test-account-password' \
pnpm --filter web test:e2e -- shared-snapshot-flow.spec.ts
```

本番利用者のアカウントや実データをE2Eに使わないでください。

## ドキュメントとビルドの確認

docsだけの変更でも、変換が通ることを確認します。

```bash
pnpm --filter web build:docs
```

Web全体のビルドにはFirebase公開設定が必要です。

```bash
pnpm build
```

## CI

`.github/workflows/ci.yml` は `main` 向けPull Requestで次を実行します。

1. Node.js 22とpnpmをセットアップ
2. `pnpm install --frozen-lockfile`
3. APIテスト
4. Webテスト
5. Webを含む全体ビルド

Markdownと `docs/**` だけの変更は現在CIのpaths-ignore対象です。そのため、docs生成確認は
ローカルで実行してから提出してください。

## カバレッジ

APIには `@vitest/coverage-v8` が入っていますが、リポジトリ共通のカバレッジscriptや固定の
合格率はまだ定義していません。数値だけを目的にせず、権限境界、公開変換、金額計算、日時計算、
マイグレーションのような壊れたときの影響が大きい箇所を優先します。
