# ChatGPTで考える / MCP連携

## 方針

- ChatGPTは旅行プランの相談・比較・提案に用い、tabitabiは予定・地図・共有・完成版の表示を担当する。
- 「ChatGPTで考える」は独立ページではなく、個々のしおりのメニュー内の機能。しおりを開き、メニューの「ChatGPTで考える」を選ぶと、テーマに合わせたダイアログで今のしおりを編集対象にできる。メニュー非対応の旧テーマはしおりの上部に操作を表示する。トップ画面からは直接起動しない。
- 現在のしおりのIDとURL、およびユーザーが選んだ既存予定（名称・日時・場所）を渡す。メモ・JWT・パスワード・シークレット予定は渡さない。編集権限が確認できない場合は転記しやすい変更案として応答する。
- ChatGPTの「下書きを開く」は \`https://chatgpt.com/?q=...\` のベストエフォート。公式のアプリ用ドラフトDeep Linkは保証されていない。ChatGPTアプリの起動もOSのHTTPS関連付け次第。表示されなければ「プロンプトをコピー」で貼り付ける。自動送信はしない。
- 既存しおりのMCP編集は任意の別接続で、MCP未接続でも相談だけなら使える。
- MCPのしおり一覧は、ログインしたアカウントに保存されたしおり（`user_bookmarks`）と、編集権限が付与されたしおり（`itinerary_editor_grants`）を統合して表示する。`can_edit` で編集可否を明示し、保存しただけのしおりに編集権限を付与しない。保護付きしおりは編集権限がないと予定を出さない。

## MCP接続（ChatGPTプラグインから）

Cloudflare WorkersのAPIホストに実装済み。MCP URLは **\`https://tabitabi-api.oranda.workers.dev/mcp\`**（本番ホストを確認・更新すること）。テスト用は各PRの \`https://tabitabi-api-preview-pr-<PR>.oranda.workers.dev/mcp\`。

1. ChatGPTのプラグイン設定からカスタムMCPサーバーを追加し、URLに上記の \`/mcp\` を指定する。
2. ChatGPTがOAuth登録・PKCE認可を開始すると、tabitabiの同意画面に遷移する。
3. 本人がtabitabiにログイン・プロフィール設定を完了して「許可」を選ぶ。Firebase認証IDトークンはChatGPTに渡さない。
4. ChatGPTに戻り、\`list_itineraries\`、\`get_itinerary\`、\`add_step\`、\`update_step\` を利用する。

OAuthリソースメタデータは \`/.well-known/oauth-protected-resource\`、認可サーバーメタデータは \`/.well-known/oauth-authorization-server\`。DCRはChatGPTのHTTPS OAuthコールバックだけに限定。認可コードは5分、アクセストークンは1時間、リフレッシュトークンは30日、有効期限内でも一回限りでローテーション。永続保存するのはトークンのSHA-256ハッシュのみ。

閲覧・変更対象は \`itinerary_editor_grants\` を持つ本人のしおりに限定。単なるブックマークでは編集できない。ログイン後にしおりを開き、編集権限の紐付けを済ませる必要がある。ユーザーが明示的に接続を許可しない限り、ChatGPTから編集できない。

## デプロイ・注意点

- \`apps/db/migrations/sql/20261101000000_mcp_oauth.sql\` を本番に適用してからデプロイする。PR Previewは \`apps/db/schema.sql\` により初期化される。
- Workersの \`APP_ORIGIN\` は本番 \`https://tabitabi.pages.dev\`、Previewは \`https://preview-pr-<PR>.tabitabi.pages.dev\`。認可画面が別ドメインへ遷移しないことを確認する。
- プレビューの認証にはPreview側のFirebase認証ドメイン許可が必要。未承認のPreviewドメインではログインに進めない。
- ChatGPT側でカスタムMCPプラグイン追加・OAuth連携は別途必要。PRをデプロイしただけではChatGPTの接続一覧には自動登録されない。
- 本実装はしおりの削除・変更履歴や連携解除のUIを提供しない。正式公開前にOAuth連携の管理・失効UI、監査ログ、セキュリティレビューを追加する。

## URLからの操作と認可

- `get_itinerary`、`add_step`、`update_step` の `itinerary_id` は UUID または tabitabi のしおりURL（例: `https://tabitabi.pages.dev/s/<UUID>#money`）を受け付ける。
- URLはサーバーから取得しない。許可ホストとパスを検査してUUIDに変換し、`itinerary_editor_grants` と現在のOAuthユーザーを照合する。URLを知っているだけではMCPで編集できない。任意の外部URLは拒否する。
- 読み取り専用の場合は `/s/<UUID>`、編集権限がある場合は `/<UUID>` を返す。共有URL内のフラグメントは編集権限に影響しない。
- 書き込み操作はMCP側で毎回権限を確認し、入力値と対象予定の所属しおりを検証する。変更系の操作を追加する際は、必ず同様の検証を実装する。

## トークン失効・セキュリティ

- OAuth認可コード・リフレッシュトークンは、クライアントID・リダイレクトURI・PKCE・対象リソースの検証**後**に単回消費する。不正な交換要求では有効なコードを破棄しない。
- `POST /oauth/revoke` はOAuth 2.0のトークン失効を行う。フォームの `client_id` と `token` を検査し、該当クライアントのトークンだけを失効させる。
- `POST /oauth/revoke-all` は、本人の有効なFirebase IDトークン（Authorization Bearer）が必要な緊急失効API。連携済みChatGPTのアクセストークン・リフレッシュトークン・未使用の認可コードを一括失効させる。ブラウザーUIは本PRでは追加しない。
- ブラウザーからの `POST /mcp` について予期しないOriginを拒否する。サーバー間のOriginなしリクエストは許可し、OAuth Bearerの対象リソースと有効期限を都度確認する。
- 認証トークンや編集トークンをChatGPTへのプロンプトやMCP応答に含めない。MCP操作時にURLから認証トークンを取得しない。

## 本番マージ前の必須受け入れテスト

1. プレビューに専用の検証用アカウント・しおりを用意し、ChatGPTの利用可能なプランでカスタムMCP `/mcp` を接続・OAuth認証する。
2. **ChatGPTのチャットに `/s/<UUID>` の完全なURLを貼るだけで** `get_itinerary` → `add_step` → `update_step` を呼び、プレビューUIの再読み込みとDBの両方で保存結果を確認する。
3. 未接続、閲覧専用ブックマーク、別アカウント、別のしおりのstep_id、偽ホストのURL、期限切れ/失効したOAuthトークンを使った更新をすべて拒否する。
4. OAuthトークンの失効を実行し、同じチャットからの追加入力が401になることを確認する。
5. CIとPreview CIが最新コミットで成功し、baseブランチとのコンフリクトがないことを確認する。

**実際のChatGPT連携での書き込みが確認できるまで、マージしない。** テストコードによる疑似MCP呼び出しは本物のChatGPT接続の代わりにならない。OpenAIの現行案内では書き込み可能なカスタムMCPはBusiness・Enterprise/Eduで利用でき、Plusでの実機書き込み試験は提供範囲外。
