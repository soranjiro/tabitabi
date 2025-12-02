import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    }),
    alias: {
      $lib: './src/lib'
    },
    prerender: {
      handleMissingId: 'warn',
      handleHttpError: ({ status, path, referrer, referenceType }) => {
        if (status === 404 && path.startsWith('/favicon')) {
          return;
        }
        throw new Error(`${status} ${path}${referrer ? ` (${referenceType} from ${referrer})` : ''}`);
      }
    }
  }
};

export default config;
