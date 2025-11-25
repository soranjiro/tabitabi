import type { Env } from '../src/utils';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
