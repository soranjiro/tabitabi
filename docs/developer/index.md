# 開発者ガイド

> [!NOTE]
> このドキュメントは作成中です。内容が実際のコードと異なる場合があります。

「たびたび」の開発に参加するためのガイドです。

---

## クイックスタート

```bash
git clone https://github.com/soranjiro/tabitabi.git
cd tabitabi
pnpm install
pnpm dev
```

詳しくは **[はじめに](getting-started.md)** をご覧ください。

---

## やりたいことから探す

### 環境構築・全体像を知りたい

| ガイド | 内容 |
|--------|------|
| [はじめに](getting-started.md) | 開発環境セットアップ・起動方法 |
| [アーキテクチャ](architecture.md) | プロジェクト構造・技術スタック |
| [データベース](database.md) | スキーマ設計・マイグレーション |

### 機能を追加・修正したい

| ガイド | 内容 |
|--------|------|
| [機能開発](feature-development.md) | 新機能の追加方法・API連携 |
| [テーマ開発](theme-development.md) | 新しいテーマの作り方 |
| [テスト](testing.md) | テストの書き方・実行方法 |

### 効率よく開発したい

| ガイド | 内容 |
|--------|------|
| [AI活用](ai-prompts.md) | AIエージェントを使った開発 |

---

## コントリビューション

プルリクエストは大歓迎です！

> [!TIP]
> **ドキュメントの改善だけでも大歓迎です！** 誤字脱字の修正、説明のわかりやすさ向上、翻訳など、コードを書かなくてもプロジェクトに貢献できます。このドキュメント自体もまだ作成中なので、ぜひお手伝いください。

### 貢献の流れ

1. [GitHub Issues](https://github.com/soranjiro/tabitabi/issues)で課題を確認（または作成）
2. リポジトリをフォーク
3. ブランチを作成（`feature/`, `fix/`, `docs/`など）
4. コードを書く + テストを追加（ドキュメントの場合はテスト不要）
5. Pull Requestを作成

### ブランチ命名規則

| Prefix | 用途 |
|--------|------|
| `feature/` | 新機能 |
| `fix/` | バグ修正 |
| `docs/` | ドキュメント |
| `refactor/` | リファクタリング |
| `test/` | テスト追加 |

### コミットメッセージ

```
<type>(<scope>): <subject>
```

例: `feat(theme): add winter theme`

詳しくは **[コントリビューションガイド](../contributing.md)** をご覧ください。

---

## 困ったときは

- **[GitHub Discussions](https://github.com/soranjiro/tabitabi/discussions)** で質問
- **[よくある質問](../user/faq.md)** を確認
- Issue にコメントして相談

---

一緒に「たびたび」をより良くしましょう！ 🚀
