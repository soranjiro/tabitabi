const required = [
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_APP_ID'
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error('Missing required web build environment variables:');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('\nCopy the values from Firebase Console into apps/web/.env.');
  console.error('See docs/developer/account-auth.md for setup details.');
  process.exit(1);
}

console.log(`Web environment check passed (${required.length} Firebase variables).`);
