# テーマ開発ガイド

Tabitabiのテーマシステムは、拡張性と保守性を重視して設計されています。
新しいテーマを追加したり、既存のテーマを編集したりする手順は非常にシンプルです。

## ディレクトリ構造

テーマ関連のファイルは `apps/web/src/lib/themes` に集約されています。

```
apps/web/src/lib/themes/
├── index.ts          # テーマの登録と動的インポートの管理
├── map-only/         # 地図に特化したテーマ
├── standard-autumn/  # 標準（秋）テーマ（デフォルト）
├── mapbox-journey/   # 3Dマップテーマ
└── ...               # その他のテーマ
```

## 新しいテーマの追加

新しいテーマを追加するには、以下の2つのステップを実行するだけです。

### 1. テーマフォルダの作成

`apps/web/src/lib/themes` 内に新しいフォルダを作成し（例: `new-theme`）、必要なコンポーネントを実装します。
既存のテーマ（`map-only` や `standard-autumn` など）をコピーして参考にすることをお勧めします。

必須ファイル:
- `index.ts`: テーマ定義（`Theme` 型）を default export します。

### 2. テーマの登録

`apps/web/src/lib/themes/index.ts` を編集して、新しいテーマを登録します。

1. `THEME_CATALOG` 配列に新しいテーマのメタ情報を追加します。
2. `loadTheme` 関数の `switch` 文に新しいケースを追加し、動的インポートを設定します。
3. `availableThemes` 配列にテーマIDを追加します。

```typescript
// apps/web/src/lib/themes/index.ts

// ...

const THEME_CATALOG = [
  // ...
  { id: 'new-theme', name: '新しいテーマ', description: 'テーマの説明' },
];

export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case 'new-theme':
      return (await import('./new-theme')).default;
    // ...
  }
}

export const availableThemes = [..., 'new-theme'] as const;
```

これだけで、アプリケーション内で新しいテーマが選択可能になります。

## 既存テーマの編集

既存のテーマを編集する場合は、対応するテーマフォルダ内のファイルを変更するだけです。
他のテーマやアプリケーション全体への影響を気にする必要はありません。

## 利用可能なテーマ

現在、以下のテーマが利用可能です。

### Standard Autumn（秋）- デフォルト
- **ID**: `standard-autumn`
- **Color**: #8b2e1f (深い茶色)
- **特徴**: 秋をモチーフにしたデザイン。完全なUI機能セットを含みます。

### Standard Spring（春）
- **ID**: `standard-spring`
- **Color**: #d946a6 (ピンク)
- **特徴**: 春をモチーフにしたデザイン。

### Standard Summer（夏）
- **ID**: `standard-summer`
- **Color**: #0369a1 (青)
- **特徴**: 夏をモチーフにしたデザイン。

### Standard Winter（冬）
- **ID**: `standard-winter`
- **Color**: #2563eb (紫青)
- **特徴**: 冬をモチーフにしたデザイン。

## Step Type システム

### 概要

予定（Step）には「種類」（type）を指定できます。これにより、旅行中の異なる活動を視覚的に区別できます。

### Type 格式

Type は `category:type` 形式で指定されます。

#### 通常の予定 (normal)
- `normal:general` - 一般的な予定
- `normal:food` - 食事
- `normal:hotel` - 宿泊
- `normal:sightseeing` - 観光

#### 移動 (transport)
- `transport:general` - 一般的な移動
- `transport:train` - 電車
- `transport:car` - 車
- `transport:plane` - 飛行機
- `transport:bus` - バス

### アイコン

各Type には SVG アイコンが関連付けられています。アイコンは [IconRenderer.svelte](../../../apps/web/src/lib/themes/standard-seasons/shared/icons/IconRenderer.svelte) で管理されます。

### UI での表現

- **リストビュー**: アイコン + タイトルを表示
- **週ビュー**: 色分けされたブロック内にアイコンを表示
  - 通常の予定：紫茶色
  - 移動：黄色（accent カラー）
- **月ビュー**: 色分けされたタグ形式で表示

### Type 編集

Type の編集は、予定作成・編集モーダルで **アイコン選択器** から行います。

```
[📋 一般的な予定] [🍽️ 食事] [🏨 宿泊] [🎌 観光]
その他の移動手段

[🚗 一般的な移動] [🚄 電車] [🚙 車] [✈️ 飛行機] [🚌 バス]
移動手段

※ アイコンをタップすることで選択できます
```

## その他のテーマ

以下のテーマは、以前のバージョンで提供されていました：

- **Map Only**: 地図中心のシンプルUI
- **Mapbox Journey**: 3Dグローブ表示
- **Pixel Quest**: RPG風ドット絵表示
- **Shopping**: 買い物リスト管理UI
