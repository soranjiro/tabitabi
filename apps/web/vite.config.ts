import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [
    {
      name: 'html-ext-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/docs/') && !req.url.includes('.')) {
            const htmlPath = path.join(process.cwd(), 'static', req.url + '.html');
            if (fs.existsSync(htmlPath)) {
              req.url = req.url + '.html';
            }
          }
          next();
        });
      }
    },
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({
        routes: { include: ['/*'], exclude: ['<all>'] }
      }),
      alias: { $lib: './src/lib' },
      inlineStyleThreshold: 100_000,
      prerender: {
        handleMissingId: 'warn',
        handleHttpError: ({ status, path, referrer, referenceType }) => {
          if (status === 404 && path.startsWith('/favicon')) return;
          throw new Error(`${status} ${path}${referrer ? ` (${referenceType} from ${referrer})` : ''}`);
        }
      }
    })
  ],
  server: {
    port: 5173
  },
  // Keep local preview loopback-only.
  preview: {
    host: '127.0.0.1'
  },
  build: {
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep the very large map renderer isolated, but otherwise let
          // Rollup/SvelteKit create route-aware chunks. A catch-all vendor
          // chunk makes public pages download code used only by other routes.
          if (id.includes('mapbox-gl')) return 'mapbox';
        }
      }
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
