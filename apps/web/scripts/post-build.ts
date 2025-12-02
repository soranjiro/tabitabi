import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLOUDFLARE_DIR = path.join(PROJECT_ROOT, '.svelte-kit/cloudflare');
const ROUTES_FILE = path.join(CLOUDFLARE_DIR, '_routes.json');

interface RoutesJson {
  version: number;
  description: string;
  include: string[];
  exclude: string[];
}

const routesJson: RoutesJson = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf-8'));

const docsExcludes = routesJson.exclude.filter((rule) => rule.startsWith('/docs/') && rule.endsWith('.html'));

const htmlLessExcludes = docsExcludes.map((rule) => rule.replace(/\.html$/, ''));

const newExcludes = [...routesJson.exclude];
for (const exclude of htmlLessExcludes) {
  if (!newExcludes.includes(exclude)) {
    newExcludes.push(exclude);
  }
}

const directories = ['/docs', '/docs/user', '/docs/developer', '/docs/user/features', '/docs/user/features/common', '/docs/user/features/home', '/docs/user/features/themes'];
for (const dir of directories) {
  if (!newExcludes.includes(dir)) {
    newExcludes.push(dir);
  }
}

routesJson.exclude = newExcludes;

fs.writeFileSync(ROUTES_FILE, JSON.stringify(routesJson, null, '\t'));
console.log('Updated _routes.json with html-less doc paths');
