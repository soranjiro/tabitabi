import { describe, expect, it } from 'vitest';
import { variables } from './env';

describe('Firebase public configuration', () => {
  it('is embedded during the web build rather than read from Pages runtime bindings', () => {
    for (const name of [
      'PUBLIC_FIREBASE_API_KEY',
      'PUBLIC_FIREBASE_APP_ID',
      'PUBLIC_FIREBASE_AUTH_DOMAIN',
      'PUBLIC_FIREBASE_PROJECT_ID',
    ] as const) {
      expect(variables[name].public, name).toBe(true);
      expect(variables[name].static, name).toBe(true);
    }
  });
});
