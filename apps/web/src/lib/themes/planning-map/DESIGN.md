# 地図プラン

予定が未定の旅行を「集める → 比べる → 日に分ける → 時間を決める」で支援するテーマ。

- 地図にピンを刺し、名前・行きたい理由・参考リンクを保存。場所が不明なら名前だけでも追加できる。
- リストとピンを選択で連動。選択地点から近い候補を直線距離で比較する。経路や所要時間の推定ではない。
- 「絶対行きたい」で候補を絞り、近い場所を同じ Day に仮置きする。時間は任意。
- 旅程画面で編集・候補へ戻す・順番調整。共通の notes 内の schedule/place メタデータを使い、テーマ変更でも保持する。
- モバイルは地図→候補リストの縦配置。地図に位置がない候補もリストから操作可能。
- 編集権限、共有、お金、持ち物、印刷は既存のプラン画面を再利用。

## デモ

`/demo/planning-map` に京都のサンプル。変更は既存 demoStorage のブラウザ保存のみ。リセット可能。本番 API に予定を書き込まない。

## 地図と運営費

Leaflet 1.9.4 + OpenStreetMap 標準ラスタタイル、場所検索は Photon。アカウント、API キー、クレカ登録は不要。施設名で検索し、同名の場所は住所で区別して選ぶ。検索結果から名前・住所・座標を自動設定し、地図で確認・位置修正できる。座標入力 UI は設けない。候補内の絞り込みはローカル検索。

Photon の公開 API は適量の利用が許可されるデモサーバーで、SLA や無制限利用の保証はない。検索ボタン押下時のみ最大6件を取得。5分・最大40検索分のメモリキャッシュ、12秒タイムアウト、古い要求のキャンセルを実装。大量アクセス時は自前 Photon 等へ切り替える。

- `PUBLIC_PLANNING_SEARCH_URL`: Photon 互換 API の URL。未設定時は `https://photon.komoot.io/api/`。検索語は提供元へ送信される。
- 地図および検索は実サービス。固定モックは E2E のみ。デモの候補データはサンプルと画面に明記。
- `make create-planning-example`: 実検索した京都6か所をローカルDBに作る例。公開・予約は行わない。生成 URL は `.tmp/planning-example.json`。
- しおりの説明は共通 memo に保存。テーマの使い方とは別に、旅の目的・人数・日数・未決事項を表示する。

公開タイルは無料だが無制限サービスではなく、SLA もない。アクセス増加時は提供元を切り替える。商用サービスの登録や契約は今回行っていない。

- `PUBLIC_PLANNING_TILE_URL`: XYZ タイルの配信先。未設定時は `https://tile.openstreetmap.org/{z}/{x}/{y}.png`。
- `PUBLIC_PLANNING_TILE_ATTRIBUTION`: 配信元が求める attribution HTML。運営者が管理する設定値のみ使用する。
- 著作権表示は地図下部に常時表示。ブラウザ標準の Referer / HTTP キャッシュを利用する。
- 一括ダウンロード、オフライン地図、先読み機能なし。外部タイルは Service Worker の独自キャッシュ対象外。
- Leaflet 本体はマウント時の動的 import。位置情報権限を要求しない。読み込み失敗時もリストの追加編集を続けられる。
- E2E は Service Worker を無効にしてタイルを差し替える。外部タイルサーバーに自動操作の負荷をかけない。

確認した公式資料:

- https://leafletjs.com/reference.html
- https://operations.osmfoundation.org/policies/tiles/
- https://github.com/komoot/photon

## 検証

`make test-web` / `make test-planning-map` / `make check-web` / `make build`
