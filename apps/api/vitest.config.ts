import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      miniflare: {
        d1Databases: ['DB'],
      },
    }),
  ],
  test: {
    globals: true,
  },
});
