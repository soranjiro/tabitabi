# 旅のしおり管理アプリ 詳細設計書

## 1. アーキテクチャ概要

### 1.1 基本方針
- **ミニマルファースト**: 必要最小限の機能で最大の価値を提供
- **超軽量・超高速**: 初期ロード1秒以内を目標、必要なデータのみを取得
- **完全疎結合設計**: 各機能は独立したテーブル・エンドポイント・サービスで完結
- **テーマの独立性**: HTML/CSSのみで新テーマ作成可能、APIラッパー経由で機能利用
- **DRY原則**: コードの重複を徹底的に排除、再利用性を最大化
- **Readability重視**: 誰でも読みやすく、編集しやすいコード構造

### 1.2 技術スタック
```
Frontend:
  - SvelteKit (SSR + CSR)
  - TailwindCSS (テーマカスタマイズ容易)
  - TypeScript

Backend:
  - Cloudflare Workers
  - Hono (軽量Web Framework)
  - TypeScript

Database:
  - Cloudflare D1 (SQLite)

Hosting:
  - Cloudflare Pages (Frontend)
  - Cloudflare Workers (API)
```

## 2. ディレクトリ構成

```
itinerary-app/
├── apps/
│   ├── web/                          # フロントエンド (SvelteKit)
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── api/              # APIラッパー（すべてのAPI呼び出しはここ経由）
│   │   │   │   │   ├── client.ts    # 基本HTTPクライアント
│   │   │   │   │   ├── itinerary.ts # しおりCRUD
│   │   │   │   │   └── step.ts      # 予定CRUD
│   │   │   │   ├── components/       # 共通コンポーネント
│   │   │   │   │   ├── ui/           # 基本UIコンポーネント
│   │   │   │   │   └── layout/       # レイアウトコンポーネント
│   │   │   │   ├── stores/           # 状態管理
│   │   │   │   │   ├── itinerary.ts
│   │   │   │   │   └── theme.ts
│   │   │   │   └── themes/           # テーマシステム（軽量・疎結合）
│   │   │   │   │   ├── index.ts     # テーマ読み込み・切り替え
│   │   │   │   │   └── types.ts     # テーマ型定義
│   │   │   │   └── utils/
│   │   │   ├── routes/
│   │   │   │   ├── +layout.svelte
│   │   │   │   ├── +page.svelte      # トップページ
│   │   │   │   ├── itineraries/
│   │   │   │   │   ├── +page.svelte  # しおり一覧
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── +page.svelte
│   │   │   │   │       └── +page.ts   # データローダー
│   │   │   │   └── themes/
│   │   │   │       └── +page.svelte   # テーマ選択
│   │   │   └── themes/                # テーマパッケージ
│   │   │       └── minimal/           # ミニマルテーマ（初期実装）
│   │   │           ├── index.ts       # テーマエントリーポイント
│   │   │           ├── theme.json     # テーマメタデータ
│   │   │           ├── components/
│   │   │           │   ├── ItineraryView.svelte  # しおり表示
│   │   │           │   └── StepList.svelte       # 予定リスト（時系列表示）
│   │   │           └── styles/
│   │   │               └── theme.css  # ミニマルスタイル
│   │   ├── static/
│   │   ├── package.json
│   │   └── svelte.config.js
│   │
│   └── api/                           # バックエンド (Cloudflare Workers)
│       ├── src/
│       │   ├── index.ts               # エントリーポイント
│       │   ├── routes/                # ルート定義（完全なCRUD）
│       │   │   ├── itineraries.ts     # しおりCRUD
│       │   │   └── steps.ts           # 予定CRUD
│       │   ├── services/              # ビジネスロジック（DRY原則）
│       │   │   ├── itinerary.service.ts
│       │   │   └── step.service.ts
│       │   ├── db/
│       │   │   ├── client.ts
│       │   │   └── schema.ts          # 型定義
│       │   ├── middleware/
│       │   │   ├── cors.ts
│       │   │   └── auth.ts            # 将来的な認証
│       │   └── utils/
│       ├── migrations/                # DB マイグレーション
│       │   └── 0001_init.sql          # 初期スキーマ（itineraries + steps）
│       ├── package.json
│       └── wrangler.toml
│
├── packages/                          # 共有パッケージ
│   └── types/                         # 型定義パッケージ
│       ├── src/
│       │   ├── index.ts
│       │   ├── itinerary.ts           # しおり型定義
│       │   ├── step.ts                # 予定型定義
│       │   ├── theme.ts               # テーマ型定義
│       │   └── api.ts                 # API共通型定義
│       └── package.json
│
├── docs/
│   ├── prd.md
│   ├── detailed-design.md             # このファイル
│   ├── api-spec.md                    # API仕様書
│   ├── theme-development-guide.md     # テーマ開発ガイド
│   └── database-schema.md             # DB設計書
│
├── package.json                       # ルートpackage.json (workspace管理)
├── pnpm-workspace.yaml
├── turbo.json                         # Turborepo設定
└── README.md
```

## 3. データベース設計

### 3.1 基本方針
- 各機能は独立したテーブルを持つ
- `itinerary_id` で関連付け
- 機能追加時は新テーブル追加のみ
- 既存テーブルへの依存は最小限

### 3.2 テーブル定義

```sql
-- コア: しおりマスタ
-- シンプルな構造で、日付範囲は予定（steps）から自動計算
CREATE TABLE itineraries (
  id TEXT PRIMARY KEY,              -- 長いランダムID（例: 32文字の英数字）
  title TEXT NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'minimal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 機能1: 予定管理 (コア機能)
-- タイトル・日付・時間が必須、場所とメモはオプション
-- 時系列順に自動ソートされる（step_orderは不要）
CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  title TEXT NOT NULL,              -- 必須
  date TEXT NOT NULL,               -- 必須: YYYY-MM-DD形式
  time TEXT NOT NULL,               -- 必須: HH:mm形式
  location TEXT,                    -- オプション
  notes TEXT,                       -- オプション
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- 将来の拡張機能用テーブル（ミニマル版では未実装）
-- 必要に応じて以下のようなテーブルを追加可能：
-- - checklist_items: 持ち物管理
-- - budget_items: 予算管理
-- - memos: メモ機能
-- - locations: 地図連携

-- インデックス: 時系列ソートのパフォーマンス最適化
CREATE INDEX idx_steps_itinerary ON steps(itinerary_id);
CREATE INDEX idx_steps_datetime ON steps(itinerary_id, date, time);
```

## 4. API設計

### 4.1 エンドポイント一覧

```
Base URL: /api/v1

【しおり管理】
GET    /itineraries              # しおり一覧取得
GET    /itineraries/:id          # しおり詳細取得（基本情報のみ）
POST   /itineraries              # しおり作成（長いランダムIDを自動生成）
PUT    /itineraries/:id          # しおり更新
DELETE /itineraries/:id          # しおり削除

【予定管理】
# 完全なCRUD操作を提供する独立したエンドポイント
GET    /steps?itinerary_id=:id   # 予定一覧取得（時系列順に自動ソート）
GET    /steps/:stepId            # 予定詳細取得
POST   /steps                    # 予定作成（itinerary_id, title, date, timeは必須）
PUT    /steps/:stepId            # 予定更新
DELETE /steps/:stepId            # 予定削除

【将来の拡張エンドポイント】
# 新機能追加時は同様の独立したCRUD構造で実装
# 例:
# GET    /checklist?itinerary_id=:id
# POST   /checklist
# PUT    /checklist/:itemId
# DELETE /checklist/:itemId
```

### 4.2 レスポンス形式

```typescript
// 成功レスポンス
{
  "success": true,
  "data": { ... }
}

// エラーレスポンス
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data"
  }
}
```

### 4.3 軽量化のための工夫

1. **選択的データ取得**
```
GET /itineraries/:id?include=timeline,checklist

// テーマが使用する機能のみを指定して取得
```

2. **ページネーション**
```
GET /itineraries?page=1&limit=20
```

3. **圧縮**
- Brotli/Gzip圧縮を有効化
- Cloudflare自動圧縮を活用

## 5. テーマシステム設計

### 5.1 テーマ定義ファイル (theme.json)

```json
{
  "id": "minimal",
  "name": "ミニマル",
  "version": "1.0.0",
  "description": "必要最小限のシンプルなテーマ",
  "author": "Tabitabi Team",
  "features": {
    "steps": {
      "enabled": true,
      "required": true
    }
  },
  "ui": {
    "layout": "single",
    "colorScheme": "light",
    "customColors": {
      "primary": "#000000",
      "background": "#FFFFFF",
      "text": "#333333"
    }
  },
  "components": {
    "ItineraryView": "./components/ItineraryView.svelte",
    "StepList": "./components/StepList.svelte"
  },
  "styles": "./styles/theme.css"
}
```

### 5.2 テーマローダー

```typescript
// lib/themes/index.ts
import type { Theme } from './types';

/**
 * テーマを動的に読み込む
 * HTML/CSSのみのテーマもサポート
 */
export async function loadTheme(themeId: string): Promise<Theme> {
  const module = await import(`../../themes/${themeId}/index.ts`);
  return module.default;
}

/**
 * テーマで有効な機能のリストを取得
 */
export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name);
}
```

### 5.3 テーマ例

#### Minimal テーマ（初期実装）
```json
{
  "id": "minimal",
  "name": "ミニマル",
  "features": {
    "steps": { "enabled": true, "required": true }
  },
  "ui": {
    "layout": "single",
    "colorScheme": "light"
  }
}
```

#### 将来の拡張テーマ例
```json
{
  "id": "standard",
  "name": "スタンダード",
  "features": {
    "steps": { "enabled": true, "required": true },
    "checklist": { "enabled": true },
    "budget": { "enabled": true },
    "map": { "enabled": true }
  }
}
```

## 6. フロントエンド設計

### 6.1 データフロー

```
1. ユーザーがしおり詳細ページにアクセス
   ↓
2. テーマIDを読み込み
   ↓
3. テーマ定義から有効な機能を判定
   ↓
4. 必要なAPIエンドポイントのみを呼び出し
   ↓
5. テーマのコンポーネントをロード
   ↓
6. データを注入してレンダリング
```

### 6.2 ページローダー例

```typescript
// routes/[id]/+page.ts
import { getItinerary } from '$lib/api/itinerary';
import { getSteps } from '$lib/api/step';
import { loadTheme } from '$lib/themes';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  // しおり基本情報を取得（APIラッパー経由）
  const itinerary = await getItinerary(params.id);

  // テーマを読み込み
  const theme = await loadTheme(itinerary.theme_id);

  // 予定リストを取得（時系列順に自動ソート）
  const steps = await getSteps(params.id);

  return {
    itinerary,
    theme,
    steps
  };
};
```

### 6.3 動的コンポーネントロード

```svelte
<!-- routes/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  export let data;

  let ItineraryView;

  onMount(async () => {
    // テーマコンポーネントを動的にロード
    ItineraryView = data.theme.components.ItineraryView;
  });
</script>

{#if ItineraryView}
  <svelte:component
    this={ItineraryView}
    itinerary={data.itinerary}
    steps={data.steps}
  />
{/if}
```

## 7. パフォーマンス最適化

### 7.1 初期ロード最適化（目標: 1秒以内）
- **超軽量HTML**: 初期HTMLは10KB以下を目標
- **最小限のJS**: 必須JSは30KB以下（gzip圧縮後）
- **最小限のCSS**: クリティカルCSSのインライン化、その他は遅延読み込み
- **Code Splitting**: テーマごとに独立したチャンク、動的インポート
- **SSR**: 初期HTMLに予定リストを埋め込み、即座に表示
- **画像最適化**: WebP形式、遅延読み込み、適切なサイズ

### 7.2 キャッシング戦略
```typescript
// Cloudflare Workers でのキャッシュ設定
const cache = caches.default;
const cacheKey = new Request(request.url, request);

// しおりデータは短時間キャッシュ（頻繁に更新される可能性）
response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');

// テーマファイルは長時間キャッシュ（めったに変更されない）
response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
```

### 7.3 データベースクエリ最適化
- **インデックスの活用**: 時系列ソート用のインデックス
- **シンプルなクエリ**: JOINを避け、必要最小限のSELECT
- **prepared statements**: SQLインジェクション対策とパフォーマンス向上
- **ページネーション**: 予定が多い場合の分割取得（将来実装）

```sql
-- 予定取得クエリ（時系列順）
SELECT id, title, date, time, location, notes
FROM steps
WHERE itinerary_id = ?
ORDER BY date ASC, time ASC;
```

## 8. セキュリティ設計

### 8.1 基本方針
- CORS設定の適切な管理
- 入力値のバリデーション
- SQLインジェクション対策（Prepared Statements）
- XSS対策（適切なエスケープ）

### 8.2 認証（将来実装）
```typescript
// middleware/auth.ts
export async function authenticate(request: Request) {
  const token = request.headers.get('Authorization');
  // JWT検証など
}
```

## 9. デプロイメント

### 9.1 CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm --filter api deploy

  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm --filter web build
      - uses: cloudflare/pages-action@v1
```

### 9.2 環境変数
```toml
# apps/api/wrangler.toml
name = "itinerary-api"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "itinerary-db"
database_id = "..."

[vars]
ALLOWED_ORIGINS = "https://yourapp.com"
```

## 10. 開発フロー

### 10.1 新機能追加の流れ（完全疎結合）

1. **DB設計**（独立したテーブル）
   ```sql
   CREATE TABLE new_feature_items (
     id TEXT PRIMARY KEY,
     itinerary_id TEXT NOT NULL,
     -- 機能固有のカラム
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
   );
   CREATE INDEX idx_new_feature_itinerary ON new_feature_items(itinerary_id);
   ```

2. **型定義**（DRY原則）
   ```typescript
   // packages/types/src/new-feature.ts
   export interface NewFeatureItem {
     id: string;
     itinerary_id: string;
     // 機能固有のフィールド
     created_at: string;
     updated_at: string;
   }
   ```

3. **バックエンド実装**（完全なCRUD）
   ```typescript
   // apps/api/src/services/new-feature.service.ts（ビジネスロジック）
   // apps/api/src/routes/new-feature.ts（エンドポイント）
   // GET /new-feature?itinerary_id=:id
   // GET /new-feature/:itemId
   // POST /new-feature
   // PUT /new-feature/:itemId
   // DELETE /new-feature/:itemId
   ```

4. **APIラッパー**（フロントエンド）
   ```typescript
   // apps/web/src/lib/api/new-feature.ts
   export async function getNewFeatureItems(itineraryId: string) { ... }
   export async function createNewFeatureItem(data: ...) { ... }
   export async function updateNewFeatureItem(id: string, data: ...) { ... }
   export async function deleteNewFeatureItem(id: string) { ... }
   ```

5. **テーマへの統合**（オプション）
   ```json
   // apps/web/src/themes/standard/theme.json
   {
     "features": {
       "new_feature": { "enabled": true }
     },
     "components": {
       "NewFeaturePanel": "./components/NewFeaturePanel.svelte"
     }
   }
   ```

### 10.2 新テーマ追加の流れ（HTML/CSSのみでもOK）

1. **テーマディレクトリ作成**
   ```
   apps/web/src/themes/my-theme/
   ├── index.ts           # エントリーポイント
   ├── theme.json         # メタデータ
   ├── components/        # Svelteコンポーネント（またはHTML）
   └── styles/            # CSS
   ```

2. **theme.json定義**（最小限）
   ```json
   {
     "id": "my-theme",
     "name": "マイテーマ",
     "features": {
       "steps": { "enabled": true, "required": true }
     },
     "components": {
       "ItineraryView": "./components/ItineraryView.svelte"
     },
     "styles": "./styles/theme.css"
   }
   ```

3. **コンポーネント実装**（APIラッパーを呼ぶだけ）
   ```svelte
   <script>
     import { getSteps, createStep } from '$lib/api/step';
     export let itinerary;
     export let steps;
   </script>

   <div class="my-theme">
     <h1>{itinerary.title}</h1>
     {#each steps as step}
       <div class="step">
         <h2>{step.title}</h2>
         <p>{step.date} {step.time}</p>
       </div>
     {/each}
   </div>
   ```

4. **スタイル定義**（独自のデザイン）
   ```css
   .my-theme {
     /* カスタムスタイル */
   }
   ```

5. **テーマ登録**（自動検出）

## 11. テスト戦略

### 11.1 ユニットテスト
- Vitest を使用
- Service層のロジックをテスト
- コンポーネントのテスト

### 11.2 統合テスト
- E2Eテスト: Playwright
- API テスト: Hono のテストユーティリティ

### 11.3 テーマバリデーションテスト
```typescript
// テーマが正しく定義されているかをチェック
import { validateTheme } from '@itinerary/theme-kit';

test('theme definition is valid', () => {
  const theme = require('./theme.json');
  expect(validateTheme(theme)).toBe(true);
});
```

## 12. OSSとしての公開

### 12.1 テーマ開発ガイド
- テーマの作り方ドキュメント
- サンプルテーマの提供
- テーマテンプレートリポジトリ

### 12.2 コントリビューションガイド
- コーディング規約
- PR テンプレート
- Issue テンプレート

### 12.3 ライセンス
- MIT License 推奨

## 13. 今後の拡張案

### 13.1 Phase 1（MVP - ミニマル）
- [x] しおりCRUD（長いランダムID）
- [x] 予定CRUD（タイトル・日付・時間が必須）
- [x] 時系列自動ソート
- [x] ミニマルテーマ
- [x] 超軽量・超高速（初期ロード1秒以内）

### 13.2 Phase 2（機能拡張）
- [ ] 地図連携（場所の視覚化）
- [ ] 持ち物チェックリスト
- [ ] スタンダードテーマ

### 13.3 Phase 3（高度な機能）
- [ ] 予算管理
- [ ] メモ機能
- [ ] ビジネステーマ

### 13.4 Phase 4（共有・協力）
- [ ] ユーザー認証
- [ ] しおり共有機能
- [ ] コメント機能
- [ ] テンプレート機能

### 13.5 Phase 5（PWA）
- [ ] PWA対応
- [ ] オフライン機能
- [ ] プッシュ通知
- [ ] カレンダー連携

## 14. 命名案

アプリ名の候補:
- **Tabitabi** (たびたび) - 旅×2、親しみやすい
- **Shiori** (しおり) - シンプルで分かりやすい
- **TripCanvas** - 旅を描くキャンバス
- **JourneyBook** - 旅の本
- **Tabimemo** (たびメモ) - 旅のメモ
- **WanderPlan** - さまよい計画する
- **Travelogue** - 旅行記

推奨: **Tabitabi** または **Shiori**
- 日本語で親しみやすい
- 短くて覚えやすい
- ドメイン取得の可能性が高い

---

## まとめ

この設計により以下が実現できます:

✅ **超軽量・超高速**: 初期ロード1秒以内、必要最小限のJS/CSS
✅ **ミニマルファースト**: 予定管理に集中したシンプルなUI/UX
✅ **完全疎結合**: 各機能は独立したテーブル・エンドポイント・サービス
✅ **DRY原則**: APIラッパーでコード重複を排除
✅ **テーマの独立性**: HTML/CSSのみで新テーマ作成可能
✅ **拡張性**: 新機能追加が容易（既存コードへの影響ゼロ）
✅ **Readability**: 誰でも読みやすく、編集しやすいコード
✅ **OSS対応**: テーマを誰でも開発・追加可能

次のステップ:
1. ミニマルテーマの実装
2. API実装（しおり・予定のCRUD）
3. パフォーマンス測定と最適化
