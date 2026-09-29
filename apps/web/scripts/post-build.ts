import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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


function installOgWorkerWasmBindings() {
  const workerPath = path.join(CLOUDFLARE_DIR, '_worker.js');
  const svelteKitWorkerPath = path.join(CLOUDFLARE_DIR, '_worker.sveltekit.js');
  if (!fs.existsSync(workerPath)) {
    throw new Error('Cloudflare worker entry was not generated');
  }

  if (fs.existsSync(svelteKitWorkerPath)) fs.rmSync(svelteKitWorkerPath);
  fs.renameSync(workerPath, svelteKitWorkerPath);

  const require = createRequire(import.meta.url);
  const modules = [
    {
      source: require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
      filename: '_og-resvg.wasm',
      binding: 'RESVG_WASM',
      variable: 'resvgWasm',
    },
    {
      source: require.resolve('@jsquash/avif/codec/dec/avif_dec.wasm'),
      filename: '_og-avif-dec.wasm',
      binding: 'AVIF_DEC_WASM',
      variable: 'avifDecodeWasm',
    },
    {
      source: require.resolve('@jsquash/webp/codec/dec/webp_dec.wasm'),
      filename: '_og-webp-dec.wasm',
      binding: 'WEBP_DEC_WASM',
      variable: 'webpDecodeWasm',
    },
  ] as const;

  for (const module of modules) {
    fs.copyFileSync(module.source, path.join(CLOUDFLARE_DIR, module.filename));
  }

  const imports = modules
    .map((module) => `import ${module.variable} from './${module.filename}';`)
    .join('\n');
  const bindings = modules
    .map((module) => `${module.binding}: ${module.variable}`)
    .join(', ');

  fs.writeFileSync(
    workerPath,
    `${imports}
import sveltekit from './_worker.sveltekit.js';

export default {
  fetch(request, env, context) {
    return sveltekit.fetch(request, { ...env, ${bindings} }, context);
  },
};
`,
  );

  const assetsIgnorePath = path.join(CLOUDFLARE_DIR, '.assetsignore');
  const ignored = [
    '_worker.sveltekit.js',
    ...modules.map((module) => module.filename),
  ];
  const existing = fs.existsSync(assetsIgnorePath)
    ? fs.readFileSync(assetsIgnorePath, 'utf-8').trimEnd()
    : '';
  const lines = new Set(existing.split('\n').filter(Boolean));
  for (const item of ignored) lines.add(item);
  fs.writeFileSync(assetsIgnorePath, `${[...lines].join('\n')}\n`);

  console.log('Installed OG image WASM bindings in Cloudflare worker');
}

installOgWorkerWasmBindings();
