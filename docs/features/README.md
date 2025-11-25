# 機能一覧

旅のしおり管理アプリ「Tabitabi」の機能一覧です。

## 📱 ホーム画面

| 機能 | 説明 |
|------|------|
| [最近の項目](./home/recent-items.md) | 最近開いたしおりに素早くアクセス |
| [URLの追加](./home/url-sharing.md) | URLを使ったしおりへのアクセス |
| [PWA](./home/pwa.md) | アプリのようにインストールして使える |

## 🔧 共通機能

テーマに関係なく使える基本機能です。

| 機能 | 説明 |
|------|------|
| [認証](./common/auth.md) | パスワードによる編集権限の管理 |
| [編集モード](./common/edit-mode.md) | 閲覧モードと編集モードの切り替え |
| [メモ](./common/memo.md) | しおりごとの自由なメモ欄 |
| [共有機能](./common/sharing.md) | URLでしおりを簡単に共有 |

## 🎨 テーマ独自機能

特定のテーマでのみ使える拡張機能です。

| 機能 | 説明 |
|------|------|
| [シークレットモード](./themes/secret-mode.md) | サプライズ用に内容を隠す |
| [Walica連携](./themes/walica.md) | 割り勘計算サービスとの連携 |
| [Markdown対応](./themes/markdown.md) | メモでMarkdown記法が使える |

## 📁 ディレクトリ構成

```
docs/features/
├── README.md          # この文書
├── home/              # ホーム画面の機能
│   ├── recent-items.md
│   ├── url-sharing.md
│   └── pwa.md
├── common/            # 共通機能
│   ├── auth.md
│   ├── edit-mode.md
│   ├── memo.md
│   └── sharing.md
└── themes/            # テーマ独自機能
    ├── secret-mode.md
    ├── walica.md
    └── markdown.md
```
