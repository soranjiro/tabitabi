# テスト

「たびたび」のテストについて説明します。

## テストの実行

### すべてのテストを実行

```bash
pnpm test
```

### 特定のテストのみ実行

```bash
pnpm test -- path/to/test.spec.ts
```

### ウォッチモード

```bash
pnpm test:watch
```

## テストツール

- **テストフレームワーク**: Vitest
- **テストライブラリ**: @testing-library/svelte
- **モック**: vitest/mocks

## テストの種類

### 1. ユニットテスト

個別の関数やコンポーネントをテスト。

**場所**: ソースコードと同じディレクトリ

**命名**: `[name].spec.ts` または `[name].test.ts`

**例**:
```typescript
// src/lib/utils/date.spec.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate(new Date('2024-01-01'));
    expect(result).toBe('2024年1月1日');
  });
});
```

### 2. コンポーネントテスト

Svelteコンポーネントの動作をテスト。

**例**:
```typescript
// src/lib/components/Button.spec.ts
import { render, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('should emit click event', async () => {
    let clicked = false;
    const { getByRole } = render(Button, {
      props: { text: 'Click me' },
      on: { click: () => { clicked = true; } }
    });

    const button = getByRole('button');
    await fireEvent.click(button);
    expect(clicked).toBe(true);
  });
});
```

### 3. 統合テスト

複数のコンポーネントやAPIの連携をテスト。

**場所**: `tests/integration/`

**例**:
```typescript
// tests/integration/itinerary-creation.spec.ts
import { describe, it, expect } from 'vitest';
import { createItinerary } from '$lib/api/itinerary';

describe('Itinerary Creation', () => {
  it('should create and retrieve itinerary', async () => {
    const created = await createItinerary({
      title: 'Test Trip',
      theme_id: 'standard-autumn',
    });

    expect(created.id).toBeDefined();
  });
});
```

## テストのベストプラクティス

### 1. テストは読みやすく

```typescript
// Good
it('should display error message when password is incorrect', () => {
  // ...
});

// Bad
it('test1', () => {
  // ...
});
```

### 2. AAA パターンを使う

- **Arrange**: テストデータや状態を準備
- **Act**: テスト対象を実行
- **Assert**: 結果を検証

```typescript
it('should calculate total price', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(300);
});
```

### 3. モックは最小限に

できるだけ実際のコードを使い、外部依存のみモック。

```typescript
import { vi } from 'vitest';

// API呼び出しのモック
vi.mock('$lib/api/client', () => ({
  fetch: vi.fn().mockResolvedValue({ data: mockData })
}));
```

### 4. テストの独立性

各テストは他のテストに依存しない。

```typescript
// Good
describe('ItineraryService', () => {
  beforeEach(() => {
    // 各テストの前にクリーンな状態を作る
    resetDatabase();
  });

  it('test1', () => { /* ... */ });
  it('test2', () => { /* ... */ });
});
```

## カバレッジ

### カバレッジレポートの生成

```bash
pnpm test:coverage
```

### カバレッジ目標

- **Statements**: 80%以上
- **Branches**: 75%以上
- **Functions**: 80%以上
- **Lines**: 80%以上

### カバレッジの確認

```bash
open coverage/index.html
```

## CI/CDでのテスト

GitHubActionsで自動テスト（予定）:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
```

## よくある問題

### Q. テストが遅い
**A.**
- 不要なモックを削除
- 並列実行を有効化: `vitest --threads`
- ファイル数を制限

### Q. テストが不安定（flaky）
**A.**
- `waitFor`を使って非同期処理を待つ
- タイムアウトを長めに設定
- テストの独立性を確認

### Q. Cloudflare固有の機能のテスト
**A.**
- `@cloudflare/vitest-pool-workers`を使用
- ローカル環境でWorker環境をエミュレート

## 参考リンク

- [Vitest ドキュメント](https://vitest.dev/)
- [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/vitest-integration/)
