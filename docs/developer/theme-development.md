# テーマ開発

テーマは、しおりと予定の共通データを異なるUIで表示する動的ロード単位です。
登録可能なテーマとWeb画面の既定値は `apps/web/src/lib/themes/catalog.ts` が正本です。

## 現在のテーマ

| ID | 表示名 | 概要 |
|---|---|---|
| `planning-draft` | 下書き | 候補から日時を決める計画用テーマ。Web画面の既定テーマ |
| `standard-spring` | 標準（春） | 標準機能一式 |
| `standard-summer` | 標準（夏） | 標準機能一式、夏配色 |
| `standard-autumn` | 標準（秋） | 標準機能一式、秋配色 |
| `standard-winter` | 標準（冬） | 標準機能一式、冬配色 |
| `shopping` | 買い物リスト | 買い物管理向け |
| `pixel-quest` | ピクセルクエスト | RPG風マップ |
| `map-only` | Map Only | Google Maps中心 |
| `mapbox-journey` | Mapbox Journey | Mapboxの3D地図・グローブ |
| `ai-generated` | AI Generated | タイムライン、シークレット、Markdown |
| `sauna-rally` | サウナスタンプラリー | サウナ巡り向け |

`minimal/` はソースに残っていますが、カタログと `loadTheme()` に登録されていないため選択できません。

## 構造

独立テーマの標準的な構成です。

```text
themes/new-theme/
├── index.ts              # Themeをdefault export
├── config.ts             # 任意。メタ情報を分離する場合
├── ItineraryView.svelte  # しおり全体
├── StepList.svelte       # 予定一覧
├── components/           # テーマ固有UI
├── styles/               # テーマ固有CSS
├── demo-data.ts          # デモ用データ
└── DESIGN.md             # デザイン意図
```

季節テーマは例外で、機能とレイアウトを共有します。

```text
themes/standard-seasons/
├── shared/               # 春夏秋冬すべてが使う画面・機能・CSS
├── spring/               # 配色、entry、デモデータ
├── summer/
├── autumn/
└── winter/
```

## Theme型

`packages/types/src/theme.ts` の `Theme` を実装し、`index.ts` からdefault exportします。

```typescript
import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const theme: Theme = {
  id: 'new-theme',
  name: '新しいテーマ',
  version: '1.0.0',
  description: 'テーマの説明',
  author: 'Tabitabi Team',
  features: {
    steps: { enabled: true, required: true },
    memo: { enabled: true },
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#2563eb',
      background: '#ffffff',
      text: '#172033',
    },
  },
  components: { ItineraryView, StepList },
};

export default theme;
```

`features` はテーマの能力を表すメタデータです。フラグを有効にするだけで画面やAPI連携が
自動実装されるわけではありません。コンポーネント側の実装と一致させてください。

## 新しいテーマを登録する

### 1. カタログ

`apps/web/src/lib/themes/catalog.ts` の `availableThemes` と `THEME_CATALOG` に同じIDを追加します。

```typescript
export const availableThemes = [
  // ...
  'new-theme',
] as const;

// THEME_CATALOGにも name / description / phrase を追加
```

ホームの作成フォーム、デモ選択、テーマ切り替えはこのカタログを参照します。

### 2. 動的import

`apps/web/src/lib/themes/index.ts` の `loadTheme()` へcaseを追加します。

```typescript
case 'new-theme':
  return (await import('./new-theme')).default;
```

未知のIDは現在 `standard-spring` にフォールバックします。

### 3. デモ

テーマ内の `demo-data.ts` に加えて、ホームのプレビューを出す場合は
`apps/web/src/routes/home/previewData/` と `preview-carousel/` も更新します。
`/demo?theme=new-theme` ではバックエンドを呼ばず、変更をブラウザ内のデモ状態へ保存します。

### 4. テスト

最低限、次を確認します。

- `pnpm --filter web test:run`
- `pnpm --filter web test:e2e -- themes-all.spec.ts`
- モバイル幅で予定の追加・編集・削除、閲覧モード、共有メニュー
- 鍵付きしおりと公開スナップショットで編集UIが出ないこと
- テーマ切り替え後に前テーマの状態・CSSが残らないこと

地図テーマではtoken未設定時、位置情報拒否時、geocoding失敗時も確認します。

## コンポーネントの契約

`ItineraryView` は `apps/web/src/routes/[id]/+page.svelte` から、少なくとも `itinerary` と
`steps`、更新用callbackを受け取ります。公開スナップショットではcallbackが `undefined` になるため、
その場合は編集UIを表示・実行しないでください。

データ更新はcallbackまたは `$lib/api/` を通し、テーマからAPI URLを組み立てて直接fetchしません。
メモと予定ノートはJSON文字列なので、`$lib/memo` のhelperでテキスト部分を読み書きします。

## 標準テーマを変更するとき

春・夏・秋・冬の機能修正は `standard-seasons/shared/` で行います。季節固有ディレクトリには、
配色、装飾、テーマentry、デモデータだけを置くのが基本です。

標準テーマには、次の共通機能があります。

- 日カード、リスト、月、週の表示モードと初期表示設定
- 旅行メンバー
- 持ち物リスト
- 予算、支出、立替、精算
- Markdownメモ、予定リンク、シークレットモード
- 閲覧／編集／公開用共有リンク
- 印刷・PDF出力

共通部の変更では4季節すべての配色と、狭い画面のボトムナビを確認してください。

## Step Type

予定種別の正本は `packages/types/src/step.ts`、表示名とアイコンは
`standard-seasons/shared/utils/step-type.ts` です。

| 通常 | 移動 |
|---|---|
| 一般、食事、宿泊、観光、買い物 | 一般、電車、車、飛行機、バス、船 |

新しいtypeを追加する場合は、共有型、アイコンrenderer、選択UI、各表示モード、印刷、デモデータ、
DBドキュメントを更新します。保存形式は `category:type` です。

## CSSとパフォーマンス

- テーマCSSはテーマディレクトリ内に閉じ、汎用名のグローバルselectorを避ける
- 色は `Theme.ui.customColors` とCSS custom propertiesを揃える
- 地図、印刷、大きなoverlayは初期表示で読み込まず遅延ロードする
- テーマ間で大きな機能を共通化する場合は、独立性と初期バンドルへの影響を先に確認する
- 画像は表示サイズに合わせて圧縮し、不要な高解像度assetを同梱しない
