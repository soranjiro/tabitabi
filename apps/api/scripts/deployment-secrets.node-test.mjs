import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

test('deployed API environments never place the JWT signing key in plaintext vars', () => {
  const config = read('apps/api/wrangler.toml.example');
  for (const environment of ['production', 'preview']) {
    const marker = `[env.${environment}.vars]`;
    const section = config.split(marker)[1]?.split(/\n\[/, 1)[0];
    assert.ok(section, `Missing ${marker}`);
    assert.doesNotMatch(section, /^\s*JWT_SECRET\s*=/m);
  }
  // The development-only key is deliberately not a production credential.
  assert.match(config, /^JWT_SECRET = "local-dev-secret"$/m);
});

test('production and preview deploy JWT through encrypted Wrangler secret files', () => {
  for (const workflow of ['deploy.yml', 'preview.yml']) {
    const config = read(`.github/workflows/${workflow}`);
    assert.match(config, /wrangler deploy[^\n]*--secrets-file/);
    assert.match(config, /JSON\.stringify\(\{ JWT_SECRET: process\.env\.JWT_SECRET \}\)/);
    assert.match(config, /mode: 0o600/);
    assert.doesNotMatch(config, /PLACEHOLDER_(?:PROD|PREVIEW)_SECRET/);
  }
});

test('Pages feedback GitHub token is an encrypted binding, not a plaintext var', () => {
  const config = read('wrangler.toml.example');
  assert.doesNotMatch(config, /^\\s*APP_GITHUB_ISSUES_TOKEN\\s*=/m);
  assert.doesNotMatch(config, /PLACEHOLDER_GITHUB_ISSUES_TOKEN/);

  for (const [workflow, environment] of [
    ['deploy.yml', 'production'],
    ['preview.yml', 'preview'],
  ]) {
    const content = read(`.github/workflows/${workflow}`);
    assert.match(content, /printf '%s' "\\$APP_GITHUB_ISSUES_TOKEN" \\| pnpm wrangler pages secret put/);
    assert.ok(content.includes(`wrangler pages secret put APP_GITHUB_ISSUES_TOKEN --project-name=tabitabi --env ${environment}`));
    assert.match(content, /wrangler pages deploy/);
    assert.doesNotMatch(content, /PLACEHOLDER_GITHUB_ISSUES_TOKEN/);
  }
});
