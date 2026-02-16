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

function inlineCssInHtml(htmlPath: string, baseDir: string, altAssetDirs: string[] = []): boolean {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const linkRegex = /<link\s+href="([^"]*\.css)"\s+rel="stylesheet"\s*>/g;
  let changed = false;

  html = html.replace(linkRegex, (_match, cssHref: string) => {
    const candidates = [
      path.resolve(path.dirname(htmlPath), cssHref),
      ...altAssetDirs.map(d => path.resolve(d, cssHref.replace(/^\.\//, '')))
    ];
    const cssPath = candidates.find(p => fs.existsSync(p));
    if (!cssPath) return _match;

    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    changed = true;
    return `<style>${cssContent}</style>`;
  });

  if (changed) {
    fs.writeFileSync(htmlPath, html);
  }
  return changed;
}

const htmlFiles = ['index.html', 'itineraries/index.html'];
let inlinedCount = 0;
const PRERENDERED_DIR = path.join(PROJECT_ROOT, '.svelte-kit/output/prerendered/pages');
const CLIENT_DIR = path.join(PROJECT_ROOT, '.svelte-kit/output/client');
const dirs: Array<{ dir: string; altAssetDirs: string[] }> = [
  { dir: CLOUDFLARE_DIR, altAssetDirs: [] },
  { dir: PRERENDERED_DIR, altAssetDirs: [CLIENT_DIR] },
];
for (const { dir, altAssetDirs } of dirs) {
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(dir, htmlFile);
    if (fs.existsSync(htmlPath) && inlineCssInHtml(htmlPath, dir, altAssetDirs)) {
      inlinedCount++;
    }
  }
}
console.log(`Inlined CSS in ${inlinedCount} HTML files`);
