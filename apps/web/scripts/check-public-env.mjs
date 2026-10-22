import { loadEnv } from 'vite';

const required = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_APP_ID'
];

// `predev` runs directly in Node, which does not load `.env` automatically.
// Use Vite's loader so this check sees the exact variables available to SvelteKit.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const missing = required.filter((name) => !env[name]?.trim());

if (missing.length > 0) {
  console.error('Missing required web build environment variables:');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('\nCopy the values from Firebase Console into apps/web/.env.');
  console.error('See docs/developer/account-auth.md for setup details.');
  process.exit(1);
}

console.log(`Web environment check passed (${required.length} Firebase variables).`);
