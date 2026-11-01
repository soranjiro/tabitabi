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
