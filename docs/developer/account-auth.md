# Firebaseアカウント認証

アカウント認証はFirebase Authenticationの無料Sparkプラン、プロフィールとしおりはCloudflare D1で管理します。WorkerにFirebaseの秘密鍵は置かず、Firebase IDトークンをGoogleの公開証明書で検証します。

## 1. Firebaseの初期設定

1. Firebase ConsoleでSparkプロジェクトとWebアプリを作成します。課金設定は不要です。
2. **Authentication > Sign-in method** で「メール/パスワード」を有効化します。
3. **Authentication > Settings > Password policy** で最低8文字に設定します。
4. **Authentication > Settings > Authorized domains** に本番のPagesドメインと`localhost`を追加します。
5. 確認メールとパスワード再設定メールのテンプレートを日本語に整えます。

WebのCloudflare Pages環境変数へ、Firebase Webアプリに表示される次の公開値を設定します。

```text
PUBLIC_FIREBASE_API_KEY
PUBLIC_FIREBASE_AUTH_DOMAIN
PUBLIC_FIREBASE_PROJECT_ID
PUBLIC_FIREBASE_APP_ID
```

GitHub Actionsからデプロイする場合は、Repository Settings > Secrets and variables > Actionsに同じ名前で4つのSecretを登録します。`deploy.yml`（本番）と`preview.yml`（PR Preview）が、WebビルドとAPIのWrangler設定へ自動的に反映します。

Firebase ConsoleのAuthorized domainsには、本番の`tabitabi.pages.dev`に加えて、Previewで使うPagesドメイン（通常は`tabitabi.pages.dev`配下のPreviewホスト）も登録してください。

APIの各Wrangler環境には同じプロジェクトIDを設定します。

```toml
[vars]
FIREBASE_PROJECT_ID = "your-firebase-project-id"
```

Firebase Web設定値はクライアント識別子であり秘密鍵ではありません。Workerでは`JWT_SECRET`を引き続き「しおり用トークン」にだけ使用します。
本番・プレビュー環境の`JWT_SECRET`は設定ファイルへ直書きせず、各環境にWrangler secretとして登録します。

```bash
cd apps/api
pnpm wrangler secret put JWT_SECRET --env production
pnpm wrangler secret put JWT_SECRET --env preview
```

## 2. 既存ユーザーの移行

作業前にD1をバックアップしてください。既存のD1 `users.id`をFirebase UIDとして取り込むため、ブックマークなどの関連データは変更されません。

```bash
cd apps/api
umask 077
mkdir -p .auth-migration
pnpm wrangler d1 execute tabitabi --remote --env production --json \
  --command "SELECT id, email, username, password_hash, created_at FROM users ORDER BY created_at" \
  > .auth-migration/d1-users.json

pnpm auth:migration:prepare .auth-migration/d1-users.json
pnpm dlx firebase-tools login
pnpm dlx firebase-tools auth:import .auth-migration/firebase-users.json \
  --hash-algo=BCRYPT --project your-firebase-project-id
```

生成処理はUID、メール重複、bcrypt形式を検証します。既存アカウントは`emailVerified: false`で取り込まれるため、利用者は以前のパスワードでログインしたあと、一度だけメール確認と都道府県設定を行います。

インポート成功件数がD1件数と一致することをFirebase Consoleで確認し、機密ファイルを削除します。

```bash
rm .auth-migration/d1-users.json .auth-migration/firebase-users.json
```

## 3. デプロイ順序

```bash
cd apps/api
pnpm wrangler d1 migrations apply tabitabi --env production --remote
pnpm deploy -- --env production
cd ../web
pnpm deploy
```

順序は「D1バックアップ → Firebaseインポート → D1マイグレーション → API → Web」です。初回リリースではD1の旧`password_hash`をロールバック用に残しますが、アプリは照合・更新に使用しません。

## セキュリティ仕様

- Firebaseのメール確認が完了するまで非公開APIは利用不可
- IDトークンの署名、期限、issuer、audience、UID、確認済みメールをWorkerで検証
- 新規登録時と既存利用者の初回移行時に都道府県を必須入力
- メール変更は新しいアドレスの確認後に反映
- パスワード変更は現在のパスワードによる再認証が必要
- 都道府県は非公開プロフィール情報

## 認証を含むE2Eテスト

共有しおりのコピー操作をE2Eで確認する場合は、メール確認とプロフィール設定が完了した専用テストアカウントを指定します。未指定の場合、認証が必要なケースだけがスキップされます。

```bash
E2E_FIREBASE_EMAIL=verified-test@example.com \
E2E_FIREBASE_PASSWORD='test-account-password' \
pnpm --filter web test:e2e -- shared-snapshot-flow.spec.ts
```
