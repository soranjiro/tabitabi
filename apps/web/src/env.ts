import { defineEnvVars } from '@sveltejs/kit/env';

// Firebase client configuration is public by design, not secret credentials.
// Missing client config is permitted in isolated tests and is rejected when auth starts.
const optionalString = (value: unknown): string => typeof value === 'string' ? value : '';

export const variables = defineEnvVars({
  PUBLIC_FIREBASE_API_KEY: { public: true, schema: optionalString },
  PUBLIC_FIREBASE_APP_ID: { public: true, schema: optionalString },
  PUBLIC_FIREBASE_AUTH_DOMAIN: { public: true, schema: optionalString },
  PUBLIC_FIREBASE_PROJECT_ID: { public: true, schema: optionalString },
});
