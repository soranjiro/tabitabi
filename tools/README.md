# Tools

## Lighthouse

Lighthouseを使用してサイトのパフォーマンス、アクセシビリティ、SEOなどを測定します。

```bash
# デスクトップモードで測定
make lighthouse

# または直接実行
node tools/run-lighthouse.js http://localhost:5173

# モバイルモードで測定
node tools/run-lighthouse.js http://localhost:5173 --mobile

# HTMLレポートを保存
node tools/run-lighthouse.js http://localhost:5173 --output report.html
```

## Site Weight Measurement

サイトの軽量性を測定します。

```bash
# 単一ページを測定
node tools/measure-site-weight.js http://localhost:5173

# 詳細表示 (-v)
node tools/measure-site-weight.js http://localhost:5173 -v

# リンク先も含めて測定 (--depth)
node tools/measure-site-weight.js http://localhost:5173 --depth 1
```
