# 機能開発

ここでは、D1とAPIを伴う機能を追加する基本の流れを説明します。既存実装では旅行メンバー、
お金、持ち物がこの構成の参考になります。

## 実装順序

1. データと権限の境界を決める
2. D1 migrationを追加する
3. `packages/types` の共有型を更新する
4. Zod validatorとAPI route／serviceを実装する
5. WebのAPI wrapperを実装する
6. ページまたはテーマUIを実装する
7. テストとドキュメントを更新する

## 1. データと権限を決める

実装前に次を明確にします。

- しおり削除時に一緒に消えるデータか
- 閲覧者にも返すか、編集者だけに返すか
- 鍵なししおりで誰でも更新できてよいか
- 公開スナップショットへ含めるか
- コピー時に引き継ぐか
- 旅行メンバーや予定を参照するか
- 金額、日時、URL、JSONに必要な検証は何か

公開スナップショットは常に閲覧専用です。書き込みrouteでは、しおりの存在、
`source_itinerary_id`、鍵付きの場合の編集JWTを共通して確認してください。

## 2. Migration

`make migrate-new` で `apps/db/migrations/sql/` にSQLを追加します。

```bash
make migrate-new name=add_example_items
```

```sql
-- migrate:up
CREATE TABLE itinerary_example_items (
  id TEXT PRIMARY KEY,
  itinerary_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_example_items_itinerary
  ON itinerary_example_items(itinerary_id, created_at);

-- migrate:down
DROP INDEX IF EXISTS idx_example_items_itinerary;
DROP TABLE IF EXISTS itinerary_example_items;
```

注意点:

- 適用済みmigrationを編集しない
- `itineraries` に必須でない機能カラムを増やさず、従属テーブルを優先する
- SQLite / D1で実行可能なDDLだけを使う
- 外部キーと削除時の動作を明示する
- dbmateのup/downセクションを両方書く
- up/downを冪等なDDLにする
- ローカルの空DBへ全migrationを通す

```bash
make migrate-up
```

## 3. 共有型

WebとAPIの両方で使うrecord、input、responseは `packages/types/src/` に追加し、
`packages/types/src/index.ts` からexportします。

```typescript
export interface ExampleItem {
  id: string;
  itinerary_id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExampleItemInput {
  label: string;
}
```

D1の `INTEGER` 真偽値やJSON文字列は、API境界でWeb向けの `boolean` や配列へ変換します。

## 4. ValidatorとAPI

入力schemaは `apps/api/src/validators/index.ts` に置き、`@hono/zod-validator` と
`validationHook` を使います。

```typescript
export const exampleItemSchema = z.object({
  label: z.string().trim().min(1).max(100),
});
```

routeは `apps/api/src/routes/`、複数routeで共有するDB処理やドメイン処理は
`apps/api/src/services/` に置きます。新しいrouteファイルは `apps/api/src/index.ts` で
mountしない限り公開されません。

```typescript
example.post(
  '/itineraries/:id/examples',
  optionalAuthMiddleware,
  zValidator('json', exampleItemSchema, validationHook),
  async (c) => {
    const itineraryId = c.req.param('id');
    // existence / snapshot / itinerary JWTを確認
    // D1へ保存
    return c.json({ success: true, data: item }, 201);
  },
);
```

### 2種類のBearer token

このプロジェクトには用途の異なるtokenがあります。

| token | 用途 | 主なmiddleware / client |
|---|---|---|
| しおりJWT | 鍵付きしおりの編集 | `optionalAuthMiddleware`、`apiClient.*(..., shioriId)` |
| Firebase ID token | マイページ、公開、コピー | `userAuthMiddleware`、`postWithUserToken`、`userApi` |

同じ `Authorization: Bearer` を使うため、1つのendpointで両方を曖昧に受け取らないようにします。

## 5. Web API wrapper

機能ごとに `apps/web/src/lib/api/example.ts` を作ります。

```typescript
import type { CreateExampleItemInput, ExampleItem } from '@tabitabi/types';
import { apiClient } from './client';

export const exampleApi = {
  list: (itineraryId: string) =>
    apiClient.get<ExampleItem[]>(`/itineraries/${itineraryId}/examples`),

  create: (itineraryId: string, input: CreateExampleItemInput) =>
    apiClient.post<ExampleItem>(
      `/itineraries/${itineraryId}/examples`,
      input,
      itineraryId,
    ),
};
```

URL、JSON headers、しおりJWTを各コンポーネントで再実装しないでください。Firebase認証が
必要な機能は `userApi` または `userAuth.getToken()` を使う専用wrapperへ分離します。

## 6. UI

テーマ固有機能なら対象テーマ内へ、テーマ非依存なら `apps/web/src/lib/` またはrouteへ置きます。

- 標準4季節に共通: `themes/standard-seasons/shared/`
- 独立テーマのみ: `themes/<theme-id>/`
- 全テーマの上に重ねる機能: `routes/[id]/+page.svelte` または `$lib/`
- アカウント／公開ページ: `routes/profile/`、`routes/users/`

callbackが `undefined` の公開スナップショットでは編集UIを出さないようにします。鍵付き、鍵なし、
公開スナップショット、デモの4状態を混同しないことが重要です。

## 7. テスト

APIでは、正常系だけでなく次を追加します。

- 入力の空文字、長さ、範囲、形式
- 別のしおりに属するmember／step ID
- 鍵付きしおりのtokenなし・誤token
- 公開スナップショットへの書き込み
- 削除時のCASCADEまたはCONFLICT
- D1 rowとAPI型の変換

UIの計算は可能な限りpure functionへ分離し、Vitestで確認します。主要操作は対象のPlaywright
specへ追加します。コマンドは[テスト](testing.md)を参照してください。

## 完了チェック

- [ ] 空のローカルD1へmigrationが通る
- [ ] 共有型と実際のAPIレスポンスが一致する
- [ ] すべての書き込みで権限境界を確認している
- [ ] 公開・コピーへ含めるデータを意図的に決めた
- [ ] API wrapperを経由している
- [ ] 対象テーマとモバイル表示を確認した
- [ ] API/Web/E2Eの必要なテストを追加した
- [ ] `docs/developer/database.md` と `docs/user/` を更新した
