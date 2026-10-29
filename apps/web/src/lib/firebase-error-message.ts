/**
 * Convert Firebase failures into user-facing guidance without exposing SDK
 * error.message, which may contain details unsuitable for the page.
 */
export function firebaseMessage(value: unknown): string {
  const raw = value && typeof value === "object" ? (value as { code?: unknown }).code : undefined;
  const code = typeof raw === "string" ? raw : value instanceof Error ? value.message : "";
  if (code.includes("unauthorized-continue-uri") || code.includes("unauthorized-domain")) {
    return "このサイトが認証の承認済みドメインに含まれていません。管理者は Firebase Authentication の「設定 → 承認済みドメイン」を確認してください。";
  }
  if (code.includes("invalid-continue-uri") || code.includes("missing-continue-uri")) {
    return "認証メールの戻り先URLが正しくありません。管理者にお問い合わせください。";
  }
  if (code.includes("operation-not-allowed")) {
    return "メールリンク認証が未設定です。管理者は Firebase Authentication のログイン方法を確認してください。";
  }
  if (code.includes("network-request-failed") || code === "auth/timeout") {
    return "認証サーバーに接続できません。通信環境を確認して、もう一度お試しください。";
  }
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) {
    return "認証の利用回数が上限に達しました。しばらく待ってからお試しください。";
  }
  if (code.includes("invalid-action-code") || code.includes("expired-action-code") || code === "INVALID_EMAIL_LINK") {
    return "リンクが無効か期限切れです。新しいログインリンクを発行してください。";
  }
  if (code.includes("invalid-credential")) {
    return "認証情報が無効か期限切れです。メールリンクを再送するか、ログイン情報を確認してください。";
  }
  if (code.includes("wrong-password") || code.includes("user-not-found")) return "メールアドレスまたはパスワードが正しくありません。";
  if (code.includes("email-already-in-use")) return "このメールアドレスはすでに使われています。";
  if (code.includes("weak-password")) return "パスワードは8文字以上で入力してください。";
  if (code.includes("requires-recent-login")) return "安全のため、いったんログアウトして再ログインしてください。";
  if (code.includes("invalid-email")) return "メールアドレスの形式が正しくありません。";
  if (code.includes("invalid-api-key") || code.includes("app-not-authorized")) return "Firebase のアプリ認証設定を確認できません。管理者にお問い合わせください。";
  if (code.includes("user-disabled")) return "このアカウントは現在利用できません。管理者にお問い合わせください。";
  if (code === "EMAIL_REQUIRED") return "メールアドレスを入力してください。";
  if (code === "PREFECTURE_REQUIRED") return "お住まいの都道府県を選択してください。";
  if (code === "FIREBASE_CONFIG_MISSING") return "認証設定が未完了です。管理者にお問い合わせください。";
  if (/^auth\/[a-z0-9-]{1,80}$/.test(code)) {
    return `認証に失敗しました（エラーコード: ${code}）。管理者にお問い合わせください。`;
  }
  return "処理に失敗しました。時間をおいてもう一度お試しください。";
}
