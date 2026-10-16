# アカウント認証

アカウント認証はFirebase Authenticationを利用し、プロフィールや保存したしおりとの関連はAPIとD1で管理します。

しおりごとの編集パスワード・編集トークンとは別の認証です。

## 構成

- Web: Firebase Web SDKでログイン状態とIDトークンを扱う
- API: Firebase IDトークンを検証してアカウント向けAPIを保護する
- D1: ユーザーのプロフィールやしおりとの関連を保存する
- しおり編集: アカウント認証とは別の仕組みで判定する

同じHTTP認証ヘッダーを利用する場合でも、用途の異なるトークンを曖昧に受け取らないようにしてください。

## Web設定

Webで必要なFirebase公開設定は、`apps/web/.env.example`と環境変数チェック処理を正本として確認してください。

公開設定値はクライアント識別に必要な値です。サーバー専用の秘密値を`PUBLIC_`などクライアントへ公開される変数へ入れないでください。

## 確認メールとカスタムアクション画面

Webには \`/auth/action\` を用意し、Firebase Authentication のメール確認・パスワード再設定・メール変更の確認リンクを、たびたびのデザインで処理できるようにしています。

Firebase側の既定ページから切り替えるには、Firebase Console の **Authentication > Templates** で「アクションURLをカスタマイズ」を開き、本番URLの \`/auth/action\` を指定してください。Firebase Console の設定はリポジトリから変更できないため、デプロイ後に環境ごとに設定します。

アクションURLを変更すると複数の認証メールで同じハンドラが使われるため、\`/auth/action\` は次を処理します。

- メールアドレス確認
- メールアドレス変更の確認・復旧
- パスワード再設定

確認メールはベータ期間中、\`noreply@tabitabi-47ccd.firebaseapp.com\` から届くことを画面上でも案内します。独自ドメインの送信元へ移行した場合は、この表示とFirebase側のメールテンプレートを同時に更新してください。

## API設定

API側では、トークン検証に必要なプロジェクト情報を環境ごとに設定します。

秘密値はローカル設定やデプロイ先のsecretで管理し、リポジトリへコミットしません。

## 認証フロー

1. Webでアカウント認証を行う
2. WebがIDトークンを取得する
3. アカウント向けAPIへIDトークンを送る
4. APIが署名、期限、対象プロジェクトなどを検証する
5. 必要に応じてD1のプロフィールや保存情報を読み書きする

## しおり編集権限との分離

アカウントにログインしていることだけでは、個別のしおりを編集できるとは限りません。

反対に、しおりの編集権限を持っていても、そのしおりが自動的に特定アカウントへ所有されるわけではありません。

新しいAPIを追加するときは、アカウント認証としおり編集認証のどちらを要求するか明確にしてください。

## テスト

認証を伴うテストでは、実利用者のアカウントや本番データを使わないでください。必要なテスト用アカウントや環境変数は、E2E設定とCI設定を正本として確認します。

## ドキュメント方針

アカウント移行の手順、過去の認証方式、特定リリースのデプロイ順序はこのページへ残しません。現行の認証フローと開発時に必要な設定だけを記載します。

## パスキー認証（導入段階）

既存の Firebase Authentication のメール・パスワードログインを残しつつ、アカウントに
WebAuthn（パスキー）を追加登録できます。パスキーでのログイン成功時は、**既存の Firebase UID** に対する
Firebase Custom Token を Workers が発行します。D1 の `users.id` やしおりの紐付けは変更しません。

- Web: `@simplewebauthn/browser`（ユーザー操作でのみ読み込み）
- API: `@simplewebauthn/server` による Origin、RP ID、Challenge、署名、ユーザー検証の検証
- D1: `user_passkeys`（公開鍵、カウンター、Credential ID）、`passkey_challenges`（一回限り、5分）
- パスキー追加・削除には **直近10分以内** の Firebase ログインが必要
- ログインオプションは discoverable credentials を使うためメールアドレス入力不要
- 確認済みメールとプロフィールの存在をログイン許可条件として維持
- 既存のしおり編集パスワードと JWT は一切変更しない

### デプロイ設定（必須）

D1 migration `20261016000000_add_user_passkeys.sql` を **API 公開前に** 適用します。

Workers の環境変数（`[vars]`）:

| 変数 | 設定例 | 注意 |
| --- | --- | --- |
| `PASSKEY_ORIGIN` | `https://tabitabi.pages.dev` | Web の完全一致 Origin（末尾スラッシュなし） |
| `PASSKEY_RP_ID` | `tabitabi.pages.dev` | ドメイン移行時に再登録が必要になる可能性 |
| `FIREBASE_PROJECT_ID` | 既存 Firebase project ID | 既存設定を流用 |

Workers の secret（**絶対にソースや公開環境変数に含めない**）:

| secret | 説明 |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_EMAIL` | Firebase プロジェクトのサービスアカウント email |
| `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` | JWT RS256 署名用 PEM private key |

ローカルでも上記を設定します（`wrangler secret put`、ローカルの `.dev.vars` 等）。
Firebase コンソールでサービスアカウントの運用権限と鍵のローテーションを管理してください。
証明書や公開 Web API Key では Custom Token の署名はできません。

**Cloudflare Pages のプレビュー用ランダムサブドメインを本番 RP ID と共用しないでください。**
`PASSKEY_ORIGIN` が一致しないプレビュー環境ではパスキーを無効化し、
必要なら固定ホスト名の専用テスト環境を用意します。カスタムドメイン導入を予定しているなら、
本番パスキーを配布する前にドメインを確定してください。

`POST /api/v1/passkeys/login/options` は匿名アクセス可能なので、
Cloudflare WAF で発行回数にレート制限を設定してください。ブラウザの認証ダイアログを無視した
自動化で D1 にチャレンジを大量作成できないよう監視します。パスキー追加・削除には
既存 Firebase トークンと直近のログインが必要です。

### 検証項目

- iOS Safari、Android Chrome、Windows Hello/macOS のパスキー登録・ログイン
- キャンセル、未対応端末、鍵削除、別端末への同期、サインアウト直後の再ログイン
- Origin/RP ID 不一致、期限切れ・再利用チャレンジ、異なるアカウントの鍵、古いログイン
- 未確認メールのアカウントがパスキーでログインできないこと
- Cloudflare Workers 上での Firebase Custom Token 発行と既存 UID の維持
- しおり閲覧・共同編集・パスワード付き編集の既存フローへの影響がないこと

パスキーのみの新規登録やメールアドレス必須制約の廃止は **この PR の対象外** です。
