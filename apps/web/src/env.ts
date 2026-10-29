import { defineEnvVars } from '@sveltejs/kit/env';

// Firebase client configuration is public by design, not secret credentials.
export const variables = defineEnvVars({
  PUBLIC_FIREBASE_API_KEY: { public: true },
  PUBLIC_FIREBASE_APP_ID: { public: true },
  PUBLIC_FIREBASE_AUTH_DOMAIN: { public: true },
  PUBLIC_FIREBASE_PROJECT_ID: { public: true },
});
