# Authentication & Authorization - Product Requirements Document

## Overview
JWT-based stateless authentication system that balances ease of use (no user registration required) with security and UX optimization.

## Architecture

### Core Components
- **Authentication Method**: JWT (JSON Web Token) - stateless authentication
- **Token Storage**: Browser localStorage for persistent sessions
- **Authorization Model**:
  - Password: Master key (recovery & new login)
  - Token: Daily use key (convenience access)

## User Flows

### Flow A: Creation (Auto-login)
1. User sets password and creates a "shiori"
2. Server returns edit token in response
3. Browser stores token immediately
4. Redirect to edit mode

### Flow B: Edit URL Access (Shortcut)
1. User accesses `example.com/s/xxx?token=abc...`
2. JavaScript extracts token from URL parameter
3. Store token in localStorage
4. **Critical**: Remove token from URL using `history.replaceState` (prevent accidental sharing)
5. Display edit mode using stored token

### Flow C: Password Authentication (Recovery/Alternative Device)
1. User accesses without edit URL or lost token
2. Click "Edit" button and enter password
3. Server issues new token on success
4. Store token (no password required for subsequent access)

## Data Structure

### LocalStorage Schema
Integrated with existing browsing history feature as unified object array.

**Key**: `shiori_history`

```json
[
  {
    "shioriId": "xyz12345",
    "title": "Autumn Kyoto Trip",
    "accessedAt": 1715000000,
    "token": "eyJhbGciOi..."
  },
  {
    "shioriId": "abc98765",
    "title": "Friend's Shiori",
    "accessedAt": 1716000000,
    "token": null
  }
]
```

**Authorization Logic**: Search by `shioriId`. If `token` exists, attach to API header for edit permission. If `token` is `null`, viewer mode only.

## Implementation Requirements

| Item | Requirement | Rationale |
|---|---|---|
| URL Sanitization | Immediately remove `?token=...` from URL bar after edit URL access | Prevent accidental permission sharing when user shares URL |
| Recovery Mechanism | Password authentication must be implemented | Enable recovery when edit URL is lost or browser cache is cleared |
| Brute Force Protection | Rate limiting on password authentication API | Protect against attacks on fixed ID system (e.g., lock after 5 failed attempts per minute) |

## Security Considerations
- No user registration reduces friction but requires robust rate limiting
- Token-based daily access minimizes password exposure
- URL sanitization prevents social engineering vulnerabilities
- Password as fallback ensures account recovery

## Edit Mode Permission Flow

すべてのテーマ（minimal、ai-generated、standard-autumn）で統一された編集モード移行フローを実装しています。

### 編集モード移行の判定ロジック

ユーザーが「編集」ボタンをクリックした際の処理フロー：

#### 1. トークン確認フェーズ
```
ユーザーが「編集」ボタンをクリック
  ↓
localStorageにトークンが存在するか確認
  ↓
YES → サーバーでトークンを検証
       ↓
       有効 → 編集モードに移行（パスワード不要）
       ↓
       無効 → フェーズ2へ
  ↓
NO → フェーズ2へ
```

#### 2. パスワード存在チェックフェーズ
```
しおりにパスワードが設定されているか確認
  ↓
NO（パスワード未設定）→ 即座に編集モードに移行
  ↓
  理由: パスワード未設定 = 公開編集可能なしおり
  ↓
YES（パスワード設定済）→ パスワードダイアログを表示
  ↓
  ユーザーがパスワードを入力
  ↓
  サーバーで認証
  ↓
  成功 → 新しいトークンを発行・保存
       → 編集モードに移行
  ↓
  失敗 → エラーメッセージ表示
```

### 実装関数

各テーマの `ItineraryView.svelte` に以下の関数を実装：

#### `attemptEditModeActivation()`
編集モード移行を試みるメイン関数

```typescript
async function attemptEditModeActivation() {
  // 1. localStorageからトークンを取得
  const token = auth.getToken(itinerary.id);

  if (token) {
    // 2. トークンが存在する場合、サーバーで検証
    const isValid = await authApi.verifyToken(itinerary.id);
    if (isValid) {
      hasEditPermission = true;
      return; // 編集モード移行完了
    }
  }

  // 3. トークンがない、または無効な場合、パスワードチェック
  if (!itinerary.password) {
    // パスワード未設定の場合は即座に編集モードへ
    hasEditPermission = true;
    return;
  }

  // 4. パスワードが設定されている場合はダイアログ表示
  showPasswordDialog = true;
}
```

#### `handlePasswordAuth()`
パスワード認証処理

```typescript
async function handlePasswordAuth() {
  if (!password.trim()) {
    alert("パスワードを入力してください");
    return;
  }

  isAuthenticating = true;
  try {
    // サーバーでパスワード認証
    const token = await authApi.authenticateWithPassword(
      itinerary.id,
      password,
    );
    // 認証成功：トークンをlocalStorageに保存
    auth.setToken(itinerary.id, itinerary.title, token);
    hasEditPermission = true;
    showPasswordDialog = false;
    password = "";
  } catch (error) {
    alert("パスワードが正しくありません");
  } finally {
    isAuthenticating = false;
  }
}
```

### セキュリティ上の利点

1. **トークン優先**: 一度認証したユーザーは、次回以降パスワード入力不要
2. **公開編集の容易性**: パスワード未設定のしおりは誰でも自由に編集可能
3. **プライベート編集の保護**: パスワード設定済みのしおりは認証必須
4. **トークン期限切れ対策**: トークンが無効になった場合でも、パスワードで再認証可能
