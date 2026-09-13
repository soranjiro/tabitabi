import { describe, expect, it } from 'vitest';
import { bootstrapProfileSchema, updateProfileSchema } from '../src/validators';

describe('username validation', () => {
  it('accepts Japanese usernames', () => {
    expect(bootstrapProfileSchema.safeParse({ username: 'たび太郎', prefecture: '東京都' }).success).toBe(true);
    expect(bootstrapProfileSchema.safeParse({ username: '山田_123', prefecture: '東京都' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ username: '旅行好き' }).success).toBe(true);
  });

  it('rejects punctuation that is not allowed in usernames', () => {
    expect(bootstrapProfileSchema.safeParse({ username: 'user@name', prefecture: '東京都' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ username: '旅行!好き' }).success).toBe(false);
  });
});
