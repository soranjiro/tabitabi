import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      'cloudflare:test': fileURLToPath(new URL('./test/cloudflare-test.ts', import.meta.url)),
    },
  },
});
