# 単一ページを測定
node tools/measure-site-weight.js http://localhost:5173

# 詳細表示 (-v)
node tools/measure-site-weight.js http://localhost:5173 -v

# リンク先も含めて測定 (--depth)
node tools/measure-site-weight.js http://localhost:5173 --depth 1
