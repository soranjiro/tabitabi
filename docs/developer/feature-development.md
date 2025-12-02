# 機能開発ガイド（バックエンド連携）

新しい機能、特にバックエンドのデータベース操作を伴う機能を追加する手順を説明します。
基本的には、バックエンドでCRUD操作を実装し、フロントエンドでAPIラッパーを用意する構成になっています。

## 開発フロー

1. **データベース移行 (Migration)**
2. **バックエンド実装 (Service & Worker)**
3. **フロントエンド実装 (API Client)**

---

## 1. データベース移行

`apps/api/migrations` フォルダに新しいSQLファイルを作成して、テーブル構造を変更します。
ファイル名は `000N_description.sql` の形式にします（Nは連番）。

例: `0006_add_new_feature.sql`

```sql
CREATE TABLE new_feature_items (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## 2. バックエンド実装

### Service の作成・更新

`apps/api/src/services` 内にビジネスロジックを記述します。
既存の `ItineraryService` などを参考にするか、新しい Service クラスを作成します。

```typescript
// apps/api/src/services/new-feature.service.ts

export class NewFeatureService {
  constructor(private db: D1Database) {}

  async create(input: CreateInput) {
    // ...
  }

  async get(id: string) {
    // ...
  }
}
```

### Worker (API エンドポイント) の更新

`apps/api/src/index.ts` (または対応するルーターファイル) で、APIエンドポイントを定義し、Serviceを呼び出します。

```typescript
app.post('/api/new-feature', async (c) => {
  const input = await c.req.json();
  const service = new NewFeatureService(c.env.DB);
  const result = await service.create(input);
  return c.json(result);
});
```

## 3. フロントエンド実装

`apps/web/src/lib/api.ts` (または機能ごとのAPIファイル) に、バックエンドAPIを呼び出すラッパー関数を追加します。

```typescript
export async function createNewFeatureItem(data: CreateInput) {
  const response = await fetch(`${API_URL}/api/new-feature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create item');
  return response.json();
}
```

あとは、この関数をSvelteコンポーネントから呼び出すだけです。
