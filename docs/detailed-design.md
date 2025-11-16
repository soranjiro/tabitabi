# 旅のしおり管理アプリ 詳細設計書

## 1. アーキテクチャ概要

### 1.1 基本方針
- **テーマ駆動アーキテクチャ**: テーマがUI/UX/機能を完全に制御
- **軽量・高速**: 必要なデータのみを取得し、初期ロードを最小化
- **疎結合設計**: 機能ごとに独立したエンドポイント・テーブル
- **拡張性**: 新機能追加時の既存コードへの影響を最小限に

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
│   │   │   │   ├── api/              # APIクライアント
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── itinerary.ts
│   │   │   │   │   ├── timeline.ts
│   │   │   │   │   ├── checklist.ts
│   │   │   │   │   ├── budget.ts
│   │   │   │   │   └── memo.ts
│   │   │   │   ├── components/       # 共通コンポーネント
│   │   │   │   │   ├── ui/           # 基本UIコンポーネント
│   │   │   │   │   └── layout/       # レイアウトコンポーネント
│   │   │   │   ├── stores/           # 状態管理
│   │   │   │   │   ├── itinerary.ts
│   │   │   │   │   └── theme.ts
│   │   │   │   ├── themes/           # テーマシステム
│   │   │   │   │   ├── types.ts
│   │   │   │   │   ├── registry.ts
│   │   │   │   │   └── loader.ts
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
│   │   │       ├── minimal/
│   │   │       │   ├── index.ts
│   │   │       │   ├── theme.json
│   │   │       │   ├── components/
│   │   │       │   │   ├── ItineraryView.svelte
│   │   │       │   │   ├── TimelineEditor.svelte
│   │   │       │   │   └── Header.svelte
│   │   │       │   └── styles/
│   │   │       │       └── theme.css
│   │   │       ├── standard/
│   │   │       │   ├── index.ts
│   │   │       │   ├── theme.json
│   │   │       │   ├── components/
│   │   │       │   │   ├── ItineraryView.svelte
│   │   │       │   │   ├── TimelineEditor.svelte
│   │   │       │   │   ├── ChecklistPanel.svelte
│   │   │       │   │   ├── BudgetPanel.svelte
│   │   │       │   │   └── MapView.svelte
│   │   │       │   └── styles/
│   │   │       │       └── theme.css
│   │   │       └── business/
│   │   │           └── (同様の構成)
│   │   ├── static/
│   │   ├── package.json
│   │   └── svelte.config.js
│   │
│   └── api/                           # バックエンド (Cloudflare Workers)
│       ├── src/
│       │   ├── index.ts               # エントリーポイント
│       │   ├── routes/                # ルート定義
│       │   │   ├── itineraries.ts     # しおりCRUD
│       │   │   ├── timeline.ts        # 旅程管理
│       │   │   ├── checklist.ts       # 持ち物リスト
│       │   │   ├── budget.ts          # 予算管理
│       │   │   ├── memo.ts            # メモ
│       │   │   └── map.ts             # 地図連携
│       │   ├── services/              # ビジネスロジック
│       │   │   ├── itinerary.service.ts
│       │   │   ├── timeline.service.ts
│       │   │   ├── checklist.service.ts
│       │   │   ├── budget.service.ts
│       │   │   └── memo.service.ts
│       │   ├── db/
│       │   │   ├── client.ts
│       │   │   └── schema.ts          # 型定義
│       │   ├── middleware/
│       │   │   ├── cors.ts
│       │   │   └── auth.ts            # 将来的な認証
│       │   └── utils/
│       ├── migrations/                # DB マイグレーション
│       │   ├── 0001_init.sql
│       │   ├── 0002_add_checklist.sql
│       │   ├── 0003_add_budget.sql
│       │   └── 0004_add_memo.sql
│       ├── package.json
│       └── wrangler.toml
│
├── packages/                          # 共有パッケージ
│   ├── types/                         # 型定義パッケージ
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── itinerary.ts
│   │   │   ├── timeline.ts
│   │   │   ├── checklist.ts
│   │   │   ├── budget.ts
│   │   │   ├── memo.ts
│   │   │   └── theme.ts
│   │   └── package.json
│   │
│   └── theme-kit/                     # テーマ開発キット
│       ├── src/
│       │   ├── index.ts
│       │   ├── validator.ts           # テーマバリデーション
│       │   └── helpers.ts
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
CREATE TABLE itineraries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  theme_id TEXT NOT NULL DEFAULT 'standard',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 機能1: タイムライン (必須機能)
CREATE TABLE timeline_steps (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER,
  location TEXT,
  latitude REAL,
  longitude REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- 機能2: 持ち物チェックリスト (オプション機能)
CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  category TEXT,
  item_name TEXT NOT NULL,
  is_checked INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'normal',
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- 機能3: 予算管理 (オプション機能)
CREATE TABLE budget_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  planned_amount REAL NOT NULL,
  actual_amount REAL,
  currency TEXT DEFAULT 'JPY',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- 機能4: メモ (オプション機能)
CREATE TABLE memos (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_timeline_itinerary ON timeline_steps(itinerary_id);
CREATE INDEX idx_timeline_order ON timeline_steps(itinerary_id, step_order);
CREATE INDEX idx_checklist_itinerary ON checklist_items(itinerary_id);
CREATE INDEX idx_budget_itinerary ON budget_items(itinerary_id);
CREATE INDEX idx_memos_itinerary ON memos(itinerary_id);
```

## 4. API設計

### 4.1 エンドポイント一覧

```
Base URL: /api/v1

【しおり管理】
GET    /itineraries              # しおり一覧取得
GET    /itineraries/:id          # しおり詳細取得
POST   /itineraries              # しおり作成
PUT    /itineraries/:id          # しおり更新
DELETE /itineraries/:id          # しおり削除

【タイムライン】
GET    /itineraries/:id/timeline           # タイムライン取得
POST   /itineraries/:id/timeline/steps     # ステップ追加
PUT    /timeline/steps/:stepId             # ステップ更新
DELETE /timeline/steps/:stepId             # ステップ削除
POST   /timeline/steps/:stepId/reorder     # 並び替え

【持ち物チェックリスト】
GET    /itineraries/:id/checklist          # チェックリスト取得
POST   /itineraries/:id/checklist/items    # アイテム追加
PUT    /checklist/items/:itemId            # アイテム更新
DELETE /checklist/items/:itemId            # アイテム削除
PATCH  /checklist/items/:itemId/check      # チェック切替

【予算管理】
GET    /itineraries/:id/budget             # 予算取得
POST   /itineraries/:id/budget/items       # 予算項目追加
PUT    /budget/items/:itemId               # 予算項目更新
DELETE /budget/items/:itemId               # 予算項目削除
GET    /itineraries/:id/budget/summary     # 予算サマリー

【メモ】
GET    /itineraries/:id/memos              # メモ一覧取得
POST   /itineraries/:id/memos              # メモ作成
PUT    /memos/:memoId                      # メモ更新
DELETE /memos/:memoId                      # メモ削除
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
  "id": "standard",
  "name": "スタンダード",
  "version": "1.0.0",
  "description": "基本的な旅のしおりテーマ",
  "author": "Your Name",
  "features": {
    "timeline": {
      "enabled": true,
      "required": true
    },
    "checklist": {
      "enabled": true,
      "required": false
    },
    "budget": {
      "enabled": true,
      "required": false
    },
    "memo": {
      "enabled": true,
      "required": false
    },
    "map": {
      "enabled": true,
      "required": false
    }
  },
  "ui": {
    "layout": "tabs",
    "colorScheme": "light",
    "customColors": {
      "primary": "#3B82F6",
      "secondary": "#10B981",
      "accent": "#F59E0B"
    }
  },
  "components": {
    "ItineraryView": "./components/ItineraryView.svelte",
    "TimelineEditor": "./components/TimelineEditor.svelte",
    "ChecklistPanel": "./components/ChecklistPanel.svelte",
    "BudgetPanel": "./components/BudgetPanel.svelte",
    "Header": "./components/Header.svelte"
  },
  "styles": "./styles/theme.css"
}
```

### 5.2 テーマローダー

```typescript
// lib/themes/loader.ts
export interface Theme {
  id: string;
  name: string;
  features: Record<string, FeatureConfig>;
  components: Record<string, any>;
  styles?: string;
}

export async function loadTheme(themeId: string): Promise<Theme> {
  const module = await import(`../themes/${themeId}/index.ts`);
  return module.default;
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name);
}
```

### 5.3 テーマ例

#### Minimal テーマ
```json
{
  "id": "minimal",
  "name": "ミニマル",
  "features": {
    "timeline": { "enabled": true, "required": true },
    "checklist": { "enabled": false },
    "budget": { "enabled": false },
    "memo": { "enabled": true }
  }
}
```

#### Business テーマ
```json
{
  "id": "business",
  "name": "ビジネス出張",
  "features": {
    "timeline": { "enabled": true, "required": true },
    "checklist": { "enabled": true },
    "budget": { "enabled": true },
    "receipt": { "enabled": true },  // 独自機能
    "expense_report": { "enabled": true }  // 独自機能
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
// routes/itineraries/[id]/+page.ts
import { loadTheme, getEnabledFeatures } from '$lib/themes/loader';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  // しおり基本情報を取得
  const itinerary = await fetch(`/api/v1/itineraries/${params.id}`).then(r => r.json());

  // テーマを読み込み
  const theme = await loadTheme(itinerary.data.theme_id);
  const features = getEnabledFeatures(theme);

  // 有効な機能のデータのみを取得
  const dataPromises = features.map(feature =>
    fetch(`/api/v1/itineraries/${params.id}?include=${feature}`).then(r => r.json())
  );

  const featureData = await Promise.all(dataPromises);

  return {
    itinerary: itinerary.data,
    theme,
    features: Object.fromEntries(
      features.map((name, i) => [name, featureData[i].data])
    )
  };
};
```

### 6.3 動的コンポーネントロード

```svelte
<!-- routes/itineraries/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  export let data;

  let ItineraryView;

  onMount(async () => {
    ItineraryView = data.theme.components.ItineraryView;
  });
</script>

{#if ItineraryView}
  <svelte:component
    this={ItineraryView}
    itinerary={data.itinerary}
    features={data.features}
  />
{/if}
```

## 7. パフォーマンス最適化

### 7.1 初期ロード最適化
- **Code Splitting**: テーマごとに独立したチャンク
- **Lazy Loading**: 使用する機能のみを動的インポート
- **SSR**: 初期HTMLに必要最小限のデータを埋め込み
- **Preloading**: 次に表示する可能性が高いデータを先読み

### 7.2 キャッシング戦略
```typescript
// Cloudflare Workers でのキャッシュ設定
const cache = caches.default;
const cacheKey = new Request(request.url, request);

// 静的データは長時間キャッシュ
response.headers.set('Cache-Control', 'public, max-age=3600');

// 動的データは短時間キャッシュ
response.headers.set('Cache-Control', 'public, max-age=60');
```

### 7.3 データベースクエリ最適化
- **インデックスの活用**
- **N+1問題の回避**: 関連データを一度に取得
- **ページネーション**: 大量データの分割取得

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

### 10.1 新機能追加の流れ

1. **DB設計**
   ```sql
   -- 新テーブル追加
   CREATE TABLE new_feature_data (...);
   ```

2. **バックエンド実装**
   ```typescript
   // apps/api/src/routes/new-feature.ts
   // apps/api/src/services/new-feature.service.ts
   ```

3. **型定義**
   ```typescript
   // packages/types/src/new-feature.ts
   ```

4. **APIクライアント**
   ```typescript
   // apps/web/src/lib/api/new-feature.ts
   ```

5. **テーマへの統合**
   ```json
   // apps/web/src/themes/standard/theme.json
   {
     "features": {
       "new_feature": { "enabled": true }
     }
   }
   ```

### 10.2 新テーマ追加の流れ

1. **テーマディレクトリ作成**
   ```
   apps/web/src/themes/my-theme/
   ```

2. **theme.json定義**

3. **コンポーネント実装**

4. **スタイル定義**

5. **テーマレジストリに登録**
   ```typescript
   // apps/web/src/lib/themes/registry.ts
   ```

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

### 13.1 Phase 1（MVP）
- しおりCRUD
- タイムライン機能
- 3つの基本テーマ（Minimal, Standard, Business）

### 13.2 Phase 2
- 持ち物チェックリスト
- 予算管理
- 地図連携

### 13.3 Phase 3
- ユーザー認証
- 共有機能
- コメント機能
- テンプレート機能

### 13.4 Phase 4
- PWA対応
- オフライン機能
- プッシュ通知
- カレンダー連携

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

✅ **軽量**: 必要な機能・データのみを取得
✅ **拡張性**: 新機能追加が容易（独立したテーブル・エンドポイント）
✅ **テーマ駆動**: UI/UX/機能をテーマで完全制御
✅ **OSS対応**: テーマを誰でも開発・追加可能
✅ **保守性**: 疎結合で依存関係が少ない
✅ **パフォーマンス**: Code Splitting, Lazy Loading, SSR

次のステップ: 実装開始に向けた詳細API仕様書とテーマ開発ガイドの作成
