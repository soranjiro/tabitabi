import { sveltekit } from '@sveltejs/kit/vite';
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
    sveltekit()
  ],
  server: {
    port: 5173
  },
  // SvelteKit 2.x preview on Windows is vulnerable when exposed to untrusted
  // clients. Keep the preview server loopback-only by default until Kit 3.
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
