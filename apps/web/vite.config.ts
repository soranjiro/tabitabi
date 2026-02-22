import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { copyLibFiles } from '@builder.io/partytown/utils';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [
    {
      name: 'partytown-copy',
      async buildStart() {
        const dest = path.join(process.cwd(), 'static', '~partytown');
        await copyLibFiles(dest, { debugDir: false });
      },
      async configureServer() {
        const dest = path.join(process.cwd(), 'static', '~partytown');
        await copyLibFiles(dest, { debugDir: false });
      }
    },
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
  build: {
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('mapbox-gl')) return 'mapbox';
          if (id.includes('node_modules')) return 'vendor';
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
