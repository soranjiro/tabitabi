# データベース

「たびたび」は Cloudflare D1（SQLite）を使用します。スキーマの正本は
`apps/api/migrations/*.sql` です。このページは `0023_add_private_packing_items.sql`
までを反映しています。

## 設計方針

- `itineraries` には、しおり全体に必須の情報だけを置く
- シークレット、公開統計、お金、持ち物などの機能は従属テーブルへ分離する
- しおりに属するデータは、原則として `ON DELETE CASCADE` で削除する
- ORMは使わず、WorkerからD1へSQLを直接実行する
- 真偽値は `INTEGER` の `0` / `1`、予定日時はUnix time（ミリ秒）で保存する
- `memo`、`notes`、`split_member_ids` などの可変構造はJSON文字列として保存する

## ER図

```mermaid
erDiagram
    itineraries ||--o{ steps : contains
    itineraries ||--o| itinerary_secrets : configures
    itineraries ||--o| itinerary_walica_settings : configures
    itineraries ||--o| itinerary_fork_stats : counts
    itineraries ||--o| itinerary_money_settings : configures
    itineraries ||--o{ itinerary_members : has
    itineraries ||--o{ itinerary_money_members : keeps_legacy_members
    itineraries ||--o{ itinerary_money_items : has
    itineraries ||--o{ itinerary_packing_groups : has
    itineraries ||--o{ itinerary_packing_items : has
    users ||--o{ user_bookmarks : saves
    itineraries ||--o{ user_bookmarks : bookmarked_by
    itinerary_members ||--o{ itinerary_packing_checks : checks
    itinerary_packing_items ||--o{ itinerary_packing_checks : checked_by
```

`itineraries.source_itinerary_id` は元しおりを指しますが、公開スナップショットを
元しおりと独立して保持するため、外部キー制約は設定していません。

## コアテーブル

### `itineraries`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、UUID |
| `title` | TEXT | NOT NULL |
| `theme_id` | TEXT | NOT NULL、DB既定値は `standard-autumn` |
| `default_view_mode` | TEXT | NOT NULL、既定値 `dayCard` |
| `memo` | TEXT | `MemoData` のJSON文字列 |
| `password` | TEXT | 編集パスワードのbcryptハッシュ。未設定はNULL |
| `source_itinerary_id` | TEXT | 公開スナップショットの場合の元しおりID |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

Webの作成画面は `catalog.ts` の `standard-spring` を明示して送信します。一方、APIで
`theme_id` を省略した場合の `ItineraryService` とDB既定値は `standard-autumn` です。
DB既定値だけを変更しても、画面の既定テーマは変わりません。
`source_itinerary_id` には部分ユニークインデックスがあり、元しおり1件につき公開
スナップショットは最大1件です。

### `steps`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、UUID |
| `itinerary_id` | TEXT | NOT NULL、`itineraries.id`、削除時CASCADE |
| `title` | TEXT | NOT NULL |
| `start_at` | INTEGER | NOT NULL、Unix time（ミリ秒） |
| `end_at` | INTEGER | NOT NULL、Unix time（ミリ秒） |
| `location` | TEXT | 任意の場所 |
| `notes` | TEXT | `MemoData` のJSON文字列 |
| `link` | TEXT | 任意のHTTP(S)リンク |
| `type` | TEXT | NOT NULL、既定値 `normal:general` |
| `is_all_day` | INTEGER | NOT NULL、既定値 `0` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

主なインデックスは `(itinerary_id, start_at)` と `(itinerary_id, end_at)` です。

## しおり設定・統計

### `itinerary_secrets`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `itinerary_id` | TEXT | PRIMARY KEY、しおり削除時CASCADE |
| `enabled` | BOOLEAN | シークレットモードの有効状態 |
| `offset_minutes` | INTEGER | 予定開始の何分前に公開するか |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### `itinerary_walica_settings`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `itinerary_id` | TEXT | PRIMARY KEY、しおり削除時CASCADE |
| `walica_id` | TEXT | NOT NULL、WalicaのグループID |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### `itinerary_fork_stats`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `itinerary_id` | TEXT | PRIMARY KEY、しおり削除時CASCADE |
| `fork_count` | INTEGER | NOT NULL、既定値 `0` |

## ユーザーと保存したしおり

Firebase Authenticationを認証元とし、D1には公開プロフィールとしおりとの関連を保存します。

### `users`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、Firebase UID |
| `username` | TEXT | UNIQUE、NOT NULL、公開名 |
| `email` | TEXT | UNIQUE、NOT NULL |
| `password_hash` | TEXT | NOT NULL、旧認証互換用。新規アカウントは固定値でFirebase管理を示す |
| `prefecture` | TEXT | 非公開の都道府県 |
| `email_verified_at` | TEXT | メール確認済み日時。未確認はNULL |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

`password_hash` は現在のログインやパスワード変更には使用しません。

### `user_bookmarks`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `user_id` | TEXT | 複合PRIMARY KEY、ユーザー削除時CASCADE |
| `itinerary_id` | TEXT | 複合PRIMARY KEY、しおり削除時CASCADE |
| `is_visible` | INTEGER | NOT NULL、公開状態。既定値 `1`（アプリからの新規追加は `0`） |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

公開フィードには、公開状態の「公開スナップショット」だけを表示します。元しおりを
公開へ切り替えるとスナップショットが作成・更新され、そのIDもブックマークへ関連付けられます。

## 旅行メンバーとお金

### `itinerary_members`

持ち物とお金で共有する旅行メンバーです。

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、UUID |
| `itinerary_id` | TEXT | NOT NULL、しおり削除時CASCADE |
| `name` | TEXT | NOT NULL |
| `created_at` | TEXT | ISO 8601 |

### `itinerary_money_settings`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `itinerary_id` | TEXT | PRIMARY KEY、しおり削除時CASCADE |
| `budget_amount` | INTEGER | 旅行全体の予算（円）、未設定はNULL |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### `itinerary_money_items`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、UUID |
| `itinerary_id` | TEXT | NOT NULL、しおり削除時CASCADE |
| `title` | TEXT | NOT NULL |
| `amount` | INTEGER | NOT NULL、正の円金額 |
| `paid_by_member_id` | TEXT | 支払者。削除時SET NULL |
| `status` | TEXT | `paid` または `planned` |
| `is_settled` | INTEGER | NOT NULL、精算済みなら `1` |
| `occurred_on` | TEXT | 任意の日付（`YYYY-MM-DD`） |
| `step_id` | TEXT | 任意の予定ID。DB上の外部キー制約はなし |
| `split_member_ids` | TEXT | 負担者ID配列のJSON、既定値 `[]` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

`itinerary_money_members` は、お金機能が共通メンバーへ移行する前の互換テーブルです。
`itinerary_money_items.paid_by_member_id` の外部キーが残っているため、メンバーAPIは
`itinerary_members` とこのテーブルを同期して更新します。新しい参照処理では
`itinerary_members` を使用してください。

## 持ち物

### `itinerary_packing_groups`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `itinerary_id` | TEXT | NOT NULL、しおり削除時CASCADE |
| `name` | TEXT | NOT NULL |
| `sort_order` | INTEGER | NOT NULL |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

既定グループは「貴重品」「スマホ・電子機器」「洗面・ケアアイテム」「衣類」「その他」です。

### `itinerary_packing_items`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `id` | TEXT | PRIMARY KEY、UUID |
| `itinerary_id` | TEXT | NOT NULL、しおり削除時CASCADE |
| `name` | TEXT | NOT NULL |
| `kind` | TEXT | migration上は `personal` または `shared` のCHECK制約 |
| `group_id` | TEXT | 持ち物グループID。DB上の外部キー制約はなし |
| `quantity` | INTEGER | NOT NULL、既定値 `1` |
| `assignee_member_id` | TEXT | 共通品の担当者。削除時SET NULL |
| `owner_member_id` | TEXT | 自分専用品の所有者。DB上の外部キー制約はなし |
| `is_packed` | INTEGER | 共通品の準備状態、既定値 `0` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

API上は `personal` を全員が個別にチェック、`private` を指定した所有者だけに表示、`shared` を
グループで1つ準備する区分として扱います。個人ごとのチェック状態は次のテーブルに保存します。

> [!WARNING]
> `0023_add_private_packing_items.sql` は `owner_member_id` を追加しましたが、`0020_add_trip_members_and_packing.sql`
> の `kind IN ('personal', 'shared')` 制約を更新していません。現在のmigrationを空DBへ適用したスキーマは
> `private` を拒否する一方、APIは `private` を送信します。自分専用品を本番で有効にする前に、テーブルを
> 再作成してCHECK制約へ `private` を追加する新しいmigrationが必要です。

### `itinerary_packing_checks`

| カラム | 型 | 制約・用途 |
|---|---|---|
| `item_id` | TEXT | 複合PRIMARY KEY、持ち物削除時CASCADE |
| `member_id` | TEXT | 複合PRIMARY KEY、メンバー削除時CASCADE |
| `checked_at` | TEXT | ISO 8601 |

## Step Type

`steps.type` は `category:type` 形式です。選択UIで使用する値は
`packages/types/src/step.ts` の `STEP_TYPE_CATEGORIES` を正本とします。

| カテゴリ | 値 |
|---|---|
| 通常 | `normal:general`, `normal:food`, `normal:hotel`, `normal:sightseeing`, `normal:shopping` |
| 移動 | `transport:general`, `transport:train`, `transport:car`, `transport:plane`, `transport:bus`, `transport:ship` |

`normal:meal` は互換用の型として残っていますが、現在の選択UIでは `normal:food` を使用します。

## マイグレーション

新しいファイルは `apps/api/migrations/NNNN_description.sql` として追加します。
既に適用済みのファイルは編集せず、新しいマイグレーションで変更してください。
過去には `0011` と `0020` の番号重複がありますが、新規migrationでは未使用番号を使います。

```bash
# ローカルD1
make migrate-local

# 設定済みのリモートD1
make migrate-remote
```

環境を明示する場合は、APIディレクトリで実行します。

```bash
cd apps/api
pnpm wrangler d1 migrations apply DB --local
pnpm wrangler d1 migrations apply DB --remote --env production
```

スキーマを変更したら、共有型、Service／Route、APIテスト、およびこのページも同じ変更で更新します。
