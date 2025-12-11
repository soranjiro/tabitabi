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

### Map Only
- **ID**: `map-only`
- **特徴**: 地図とスポット表示に特化した軽量UI。
- **用途**: ルートを素早く確認したいときに。

### Mapbox Journey
- **ID**: `mapbox-journey`
- **特徴**: 3Dグローブとアニメーションルートで没入感のある体験。
- **用途**: 景色や航路を魅せたい旅程に。

### 標準
- **ID**: `standard-autumn`
- **特徴**: 秋をモチーフにしたデザイン。Google Maps連携機能を含みます。（デフォルト）
- **用途**: 観光地巡りなど、地図を活用したい旅行に。

### 買い物リスト
- **ID**: `shopping`
- **特徴**: 買い物管理に特化したUI。
- **用途**: お土産リストや買い出しリストの作成に。

### ピクセルクエスト
- **ID**: `pixel-quest`
- **特徴**: RPG風のドット絵マップ表示。
- **用途**: 冒険心をくすぐる旅行に。

### AI Generated
- **ID**: `ai-generated`
- **特徴**: AIによって生成された実験的なデザイン（パープル基調）。
- **用途**: 新しいUIのテスト用。
