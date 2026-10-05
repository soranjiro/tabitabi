# Google AdSense 導入フロー

tabitabi の広告コードは、AdSense の ID が未設定なら本番でも非表示、PR Preview / ローカルでは実広告を読み込まずプレースホルダーを表示する構成です。

## 0. 先に独自ドメインを用意する

Google AdSense の通常サイト申請では、パスやパラメータを含まない標準ドメインが必要で、一般的なサブドメインは申請 URL として利用できません。

現在の `tabitabi.pages.dev` は `pages.dev` のサブドメインなので、AdSense を本運用する前に独自ドメインを取得し、Cloudflare Pages の Custom domains に接続します。

- 例: `tabitabi.jp`
- AdSense には独自ドメインのルートを登録する
- canonical / OGP などの本番 URL も独自ドメインへ切り替える

参考:
- https://support.google.com/adsense/answer/2784438?hl=ja
- https://support.google.com/adsense/answer/7584263?hl=ja

## 1. AdSense にサイトを追加して審査する

1. AdSense アカウントを作成する。
2. AdSense の「サイト」から独自ドメインを追加する。
3. 所有権確認を行う。
4. 「審査をリクエスト」を実行する。
5. サイトが「準備完了」になるまで待つ。

tabitabi では、全ページの `<head>` に審査用スクリプトを常設するより、後述の `ads.txt` または AdSense が提示するメタタグで所有権を確認する運用を推奨します。

審査には数日、場合によっては 2〜4 週間程度かかることがあります。

## 2. ads.txt を追加する

AdSense の「サイト」に表示される ads.txt スニペットをコピーし、`apps/web/static/ads.txt` として追加します。

例:

```text
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

- `pub-...` は AdSense のパブリッシャー ID
- `ca-pub-...` ではなく `pub-...` を使う
- デプロイ後、`https://<独自ドメイン>/ads.txt` で取得できることを確認する

参考:
- https://support.google.com/adsense/answer/12171612?hl=ja

## 3. 広告ユニットを4つ作る

AdSense の「広告」→「広告ユニット単位」→「ディスプレイ広告」から、レスポンシブ広告を作成します。

推奨名:

1. `tabitabi-home-lead`: トップのファーストビュー直後
2. `tabitabi-home-tail`: トップの作成エリア後
3. `tabitabi-explore`: みんなの旅一覧と行き先検索の間
4. `tabitabi-shared`: 共有しおり本文の末尾

各ユニットから `data-ad-slot` の数値を控えます。

参考:
- https://support.google.com/adsense/answer/9274025?hl=ja

## 4. GitHub Actions の Secrets を設定する

GitHub の Repository settings → Secrets and variables → Actions に以下を登録します。

| Secret | 値 |
| --- | --- |
| `VITE_ADSENSE_CLIENT_ID` | `ca-pub-xxxxxxxxxxxxxxxx` |
| `VITE_ADSENSE_HOME_LEAD_SLOT_ID` | home-lead の `data-ad-slot` |
| `VITE_ADSENSE_HOME_SLOT_ID` | home-tail の `data-ad-slot` |
| `VITE_ADSENSE_EXPLORE_SLOT_ID` | explore の `data-ad-slot` |
| `VITE_ADSENSE_SHARED_SLOT_ID` | shared の `data-ad-slot` |

ID が未設定なら広告枠自体を本番で表示しないため、審査前にこの PR をマージしても空の広告スペースは残りません。

## 5. プライバシー / 同意対応を確認する

広告配信前に、プライバシーポリシーへ Google 広告による Cookie、Web ビーコン、IP アドレス等の利用を明記します。

EEA・英国・スイスへ広告を配信する場合は、Google 認定 CMP と IAB TCF に対応した同意取得も設定します。AdSense 内の Google CMP を使う方法でも構いません。

参考:
- https://support.google.com/adsense/answer/10502938?hl=ja
- https://support.google.com/adsense/answer/13554116?hl=ja

## 6. 本番確認

1. `main` をデプロイする。
2. PR Preview ではプレースホルダー、本番だけ実広告になることを確認する。
3. トップのファーストビュー内に広告が出ないことを確認する。
4. 広告とリンク・ボタンの間に十分な余白があり、誤タップしにくいことを確認する。
5. AdSense の「サイト」が「準備完了」であることを確認する。
6. 広告が出ない場合は、まず ID、ads.txt、サイト審査状態、ブラウザの広告ブロッカーを確認する。
