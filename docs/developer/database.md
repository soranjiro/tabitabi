# Database Schema

- itinerariesテーブルはシンプルにする
- 機能追加の場合は別でitinerariesに依存したテーブルを作成する
- そのため、itinerariesテーブルにはカラムを追加することはないと考えられる。

## ER Diagram

```mermaid
erDiagram
    itineraries ||--o{ steps : contains
    itineraries ||--o| itinerary_secrets : has
    itineraries ||--o| itinerary_walica_settings : has

    itineraries {
        TEXT id PK
        TEXT title
        TEXT theme_id
        TEXT memo
        TEXT password
        TEXT created_at
        TEXT updated_at
    }

    itinerary_secrets {
        TEXT itinerary_id PK, FK
        BOOLEAN enabled
        INTEGER offset_minutes
        TEXT created_at
        TEXT updated_at
    }

    itinerary_walica_settings {
        TEXT itinerary_id PK, FK
        TEXT walica_id
        TEXT created_at
        TEXT updated_at
    }

    steps {
        TEXT id PK
        TEXT itinerary_id FK
        TEXT title
        TEXT location
        TEXT notes
        INTEGER start_at
        INTEGER end_at
        INTEGER is_all_day
        TEXT type
        TEXT created_at
        TEXT updated_at
    }
```

## Step Type Format

Step の `type` カラムはカテゴリとタイプを `category:type` 形式で保存します。

### 通常の予定 (normal)
- `normal:general` - 一般的な予定
- `normal:food` - 食事
- `normal:hotel` - 宿泊
- `normal:sightseeing` - 観光

### 移動 (transport)
- `transport:general` - 一般的な移動
- `transport:train` - 電車
- `transport:car` - 車
- `transport:plane` - 飛行機
- `transport:bus` - バス
