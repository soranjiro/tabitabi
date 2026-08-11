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

// The adapter expands static and prerendered docs into one rule per file/path.
// Collapse them so adding documentation pages cannot exceed Pages' 100-rule limit.
const nonDocsExcludes = routesJson.exclude.filter(
  (rule) => rule !== '/docs' && !rule.startsWith('/docs/')
);
routesJson.exclude = [...new Set([...nonDocsExcludes, '/docs', '/docs/*'])];

const routeCount = routesJson.include.length + routesJson.exclude.length;
if (routeCount > 100) {
  throw new Error(`_routes.json has ${routeCount} rules; Cloudflare Pages allows at most 100`);
}

fs.writeFileSync(ROUTES_FILE, JSON.stringify(routesJson, null, '\t'));
console.log(`Compacted docs routes in _routes.json (${routeCount}/100 rules)`);

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
