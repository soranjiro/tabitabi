# Stepデータcleanup実施条件

旧 `memo` / `notes` JSONと旧 `start_at` / `end_at` は、段階移行中の復旧元です。expand、backfill、dual-write、新構造へのread切替、plain text切替を本番で順に適用し、監視期間を終えるまで削除しません。

## cleanupを開始できる条件

以下をすべて満たす必要があります。

1. 先行する段階移行PRが順番どおり本番へ適用済み
2. 少なくとも2回の通常リリースを新構造で運用済み
3. D1 Time Travel bookmarkと本番exportを取得済み
4. exportに対する監査が `safe: true` で終了
5. publish、republish、fork、restore、全現行テーマのスモークテストが成功
6. cleanup PRをDraftからReadyへ変更後、改めてCIを成功させる

監査コマンド:

```sh
node apps/db/scripts/audit-step-cleanup.mjs /path/to/production-export.sqlite
```

1件でも不一致、NULL未移行、日時・pin制約違反、FK違反があれば終了コード1となり、cleanupは中止します。監査は読み取り専用で、DBを変更しません。

## cleanup migrationの必須要件

- 変換前の全行を専用archive tableへ退避する
- itinerary、step、money item、splitの件数とID集合を前後比較する
- `memo_text` / `notes_text` / nullable日時 / pin / priority / sort_order / linkを正としてコピーする
- money itemの`step_id`を維持する
- `PRAGMA foreign_key_check`が空でなければtransaction全体を失敗させる
- downまたはTime Travelで旧schemaと旧値へ復旧できる手順を同時に用意する

これらを満たす物理削除migrationは、本番監査結果をPRへ添付してから別commitとして追加します。監査前に旧カラムやJSONを削除してはいけません。
