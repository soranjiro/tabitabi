# Walica連携

[Walica](https://walica.jp/) のグループURLをしおりへ登録し、AI Generatedテーマから開く機能です。

## 対応テーマ

現在、設定・表示UIがあるのは **AI Generated** です。標準テーマには、Walicaとは別に
[お金の管理](../common/money.md)があります。

## 登録する

1. Walicaでグループを作る
2. `https://walica.jp/group/...` のURLをコピー
3. AI Generatedの編集メニューを開く
4. 「Walica連携」へURLを貼り付けて保存

登録後はしおりの「Walica」から埋め込み表示を開けます。表示できない場合は「Walicaで開く」で
外部サイトを直接開いてください。

## データの扱い

- 「たびたび」にはWalicaのグループIDだけを保存する
- 支払い、参加者、精算結果はWalica側で管理する
- 標準テーマのお金データとは同期しない
- 公開用スナップショットやしおりのコピーにはWalica設定を引き継がない

WalicaのURLを知る人がどこまで閲覧・編集できるかは、Walica側の仕様と共有設定を確認してください。
