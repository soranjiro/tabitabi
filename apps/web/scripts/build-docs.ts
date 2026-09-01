import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import type { Dirent } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DOCS_SRC = path.join(PROJECT_ROOT, 'docs');
const DOCS_DEST = path.join(PROJECT_ROOT, 'apps/web/static/docs');

if (!fs.existsSync(DOCS_DEST)) {
  fs.mkdirSync(DOCS_DEST, { recursive: true });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCodeLanguage(lang: string | undefined): string {
  return (lang || '').replace(/[^\w-]/g, '');
}

marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<div class="mermaid">${escapeHtml(text)}</div>`;
      }
      return `<pre><code class="language-${normalizeCodeLanguage(lang)}">${escapeHtml(text)}</code></pre>`;
    }
  }
});

function getFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((dirent: Dirent) => {
    const result = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(result) : [result];
  });
}

const allFiles = getFiles(DOCS_SRC).filter(file => file.endsWith('.md'));

interface SearchItem {
  id: string;
  title: string;
  content: string;
}

interface NavItem {
  name: string;
  path: string;
  title: string;
  hasIndex?: boolean;
  children?: NavItem[];
}

const SECTION_LABELS: Record<string, string> = {
  user: '使い方ガイド',
  developer: '開発者ガイド',
  features: '機能一覧',
  common: '共通機能',
  home: 'ホーム画面',
  themes: 'テーマ機能'
};

function extractTitleFromMarkdown(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  const name = path.basename(filePath, '.md');
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
}

const searchIndex: SearchItem[] = allFiles.map(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(DOCS_SRC, file);
  const id = relativePath.replace('.md', '');
  const title = extractTitleFromMarkdown(file);
  const plainText = content
    .replace(/#+\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 300);
  return { id, title, content: plainText };
});

fs.writeFileSync(path.join(DOCS_DEST, 'search.json'), JSON.stringify(searchIndex));

function buildNavTree(): NavItem[] {
  const tree: NavItem[] = [];
  const dirMap = new Map<string, NavItem>();

  const topLevelFiles = allFiles.filter(file => path.dirname(file) === DOCS_SRC);
  topLevelFiles.forEach(file => {
    const name = path.basename(file, '.md');
    if (name === 'index') return;
    tree.push({
      name,
      path: `${name}.html`,
      title: extractTitleFromMarkdown(file)
    });
  });

  const dirs = ['user', 'developer'];
  dirs.forEach(dir => {
    const dirPath = path.join(DOCS_SRC, dir);
    if (!fs.existsSync(dirPath)) return;

    const item: NavItem = {
      name: dir,
      path: `${dir}/index.html`,
      title: SECTION_LABELS[dir] || dir,
      children: []
    };

    const filesInDir = allFiles.filter(file => {
      const rel = path.relative(DOCS_SRC, file);
      const parts = rel.split(path.sep);
      return parts[0] === dir && parts.length === 2;
    });

    filesInDir.forEach(file => {
      const name = path.basename(file, '.md');
      if (name === 'index') return;
      item.children!.push({
        name,
        path: `${dir}/${name}.html`,
        title: extractTitleFromMarkdown(file)
      });
    });

    const subDirs = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((dirent: Dirent) => dirent.isDirectory())
      .map((dirent: Dirent) => dirent.name);

    subDirs.forEach((subDir: string) => {
      const subDirPath = path.join(dirPath, subDir);
      const subItem: NavItem = {
        name: subDir,
        path: `${dir}/${subDir}/index.html`,
        title: SECTION_LABELS[subDir] || subDir,
        children: []
      };

      const filesInSubDir = allFiles.filter(file => {
        const rel = path.relative(DOCS_SRC, file);
        const parts = rel.split(path.sep);
        return parts[0] === dir && parts[1] === subDir && parts.length === 3;
      });

      filesInSubDir.forEach(file => {
        const name = path.basename(file, '.md');
        if (name === 'index') return;
        subItem.children!.push({
          name,
          path: `${dir}/${subDir}/${name}.html`,
          title: extractTitleFromMarkdown(file)
        });
      });

      const subSubDirs = fs.readdirSync(subDirPath, { withFileTypes: true })
        .filter((dirent: Dirent) => dirent.isDirectory())
        .map((dirent: Dirent) => dirent.name);

      subSubDirs.forEach((subSubDir: string) => {
        const subSubDirPath = path.join(subDirPath, subSubDir);
        const hasIndex = fs.existsSync(path.join(subSubDirPath, 'index.md'));

        const filesInSubSubDir = allFiles.filter(file => {
          const rel = path.relative(DOCS_SRC, file);
          const parts = rel.split(path.sep);
          return parts[0] === dir && parts[1] === subDir && parts[2] === subSubDir;
        });

        const childFiles: NavItem[] = [];
        filesInSubSubDir.forEach(file => {
          const name = path.basename(file, '.md');
          if (name === 'index') return;
          childFiles.push({
            name,
            path: `${dir}/${subDir}/${subSubDir}/${name}.html`,
            title: extractTitleFromMarkdown(file)
          });
        });

        const subSubItem: NavItem = {
          name: subSubDir,
          path: hasIndex
            ? `${dir}/${subDir}/${subSubDir}/index.html`
            : childFiles.length > 0
              ? childFiles[0].path
              : `${dir}/${subDir}/${subSubDir}/index.html`,
          title: SECTION_LABELS[subSubDir] || subSubDir,
          hasIndex,
          children: childFiles
        };

        if (subSubItem.children!.length > 0) {
          subItem.children!.push(subSubItem);
        }
      });

      if (subItem.children!.length > 0) {
        item.children!.push(subItem);
      }
    });

    dirMap.set(dir, item);
  });

  const userItem = dirMap.get('user');
  const developerItem = dirMap.get('developer');
  if (userItem) tree.unshift(userItem);
  if (developerItem) tree.splice(userItem ? 1 : 0, 0, developerItem);

  return tree;
}

function toUrlPath(pathWithHtml: string): string {
  return '/docs/' + pathWithHtml.replace(/\.html$/, '');
}

function containsCurrent(item: NavItem, currentPath: string): boolean {
  if (item.path === currentPath) return true;
  return item.children?.some(child => containsCurrent(child, currentPath)) ?? false;
}

function generateNavHtml(items: NavItem[], currentPath: string): string {
  return items.map(item => {
    const hasChildren = Boolean(item.children?.length);
    const itemPath = toUrlPath(item.path);
    const isActive = currentPath === item.path;
    const isOpen = containsCurrent(item, currentPath);
    const title = escapeHtml(item.title);

    if (hasChildren) {
      const childrenHtml = generateNavHtml(item.children!, currentPath);
      const showOverview = item.hasIndex !== false;
      return `
        <li class="nav-section${isOpen ? ' open' : ''}">
          <button class="nav-toggle" type="button" aria-expanded="${isOpen}" onclick="const section=this.parentElement;const open=section.classList.toggle('open');this.setAttribute('aria-expanded',String(open));">
            <svg class="toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
            <span>${title}</span>
          </button>
          <ul class="nav-children">
            ${showOverview ? `<li><a href="${itemPath}" class="${isActive ? 'active' : ''}"${isActive ? ' aria-current="page"' : ''}>概要</a></li>` : ''}
            ${childrenHtml}
          </ul>
        </li>
      `;
    }

    return `<li><a href="${itemPath}" class="${isActive ? 'active' : ''}"${isActive ? ' aria-current="page"' : ''}>${title}</a></li>`;
  }).join('\n');
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.hasIndex !== false) {
      result.push(item);
    }
    if (item.children) {
      result.push(...flattenNavItems(item.children));
    }
  }
  return result;
}

function getPrevNext(navTree: NavItem[], currentPath: string): { prev: NavItem | null; next: NavItem | null } {
  const flat = flattenNavItems(navTree);
  const index = flat.findIndex(item => item.path === currentPath);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null
  };
}

function generatePrevNextHtml(prev: NavItem | null, next: NavItem | null): string {
  if (!prev && !next) return '';

  let html = '<nav class="page-nav" aria-label="前後のドキュメント">';
  if (prev) {
    html += `<a href="${toUrlPath(prev.path)}" class="page-nav-link prev"><span class="page-nav-label">← 前へ</span><span class="page-nav-title">${escapeHtml(prev.title)}</span></a>`;
  } else {
    html += '<div></div>';
  }
  if (next) {
    html += `<a href="${toUrlPath(next.path)}" class="page-nav-link next"><span class="page-nav-label">次へ →</span><span class="page-nav-title">${escapeHtml(next.title)}</span></a>`;
  }
  html += '</nav>';
  return html;
}

const template = (title: string, content: string, nav: string, pageNav: string, currentPath: string) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="たびたびの使い方と開発情報をまとめた公式ドキュメントです。">
  <meta name="theme-color" content="#fffdf9">
  <link rel="canonical" href="https://tabitabi.pages.dev${toUrlPath(currentPath)}">
  <title>${escapeHtml(title)} - たびたび ドキュメント</title>
  <style>
    :root {
      --ink: #15243c;
      --ink-soft: #5f6f83;
      --accent: #2f6385;
      --accent-strong: #244f6d;
      --accent-soft: #eaf2f5;
      --canvas: #f3f1ec;
      --paper: #fffdf9;
      --paper-muted: #f8f7f3;
      --border: #dde3e5;
      --border-strong: #cbd5d9;
      --code-bg: #18283d;
      --code-text: #edf4f7;
      --sidebar-width: 292px;
      --font-sans: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Segoe UI", sans-serif;
      --font-serif: Georgia, "Yu Mincho", "Hiragino Mincho ProN", serif;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; background: var(--canvas); }
    body {
      min-height: 100vh;
      margin: 0;
      display: flex;
      color: var(--ink);
      background: var(--canvas);
      font-family: var(--font-sans);
      line-height: 1.7;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    ::selection { background: #dbe9ef; color: var(--ink); }

    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      position: sticky;
      top: 0;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--paper-muted);
    }

    .nav-header {
      padding: 24px 20px 18px;
      border-bottom: 1px solid var(--border);
      background: var(--paper-muted);
    }

    .nav-brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .nav-title {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding-bottom: 12px;
      color: var(--ink);
      font-family: var(--font-serif);
      font-size: 1.08rem;
      font-weight: 600;
      letter-spacing: .04em;
      text-decoration: none;
    }

    .nav-title::after {
      position: absolute;
      right: 3px;
      bottom: 3px;
      left: 35px;
      border-top: 2px dotted #aebbc2;
      content: "";
      opacity: .8;
    }

    .nav-brand-mark {
      display: grid;
      width: 30px;
      height: 30px;
      place-items: center;
      border: 1px solid var(--border-strong);
      border-radius: 50%;
      color: var(--accent);
      background: var(--paper);
    }

    .nav-brand-mark svg { width: 16px; height: 16px; }

    .mobile-nav-toggle {
      display: none;
      min-height: 38px;
      padding: 7px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      color: var(--ink);
      background: var(--paper);
      font: inherit;
      font-size: .78rem;
      font-weight: 700;
      cursor: pointer;
    }

    .search-wrap { position: relative; margin-top: 12px; }
    .search-box {
      width: 100%;
      min-height: 42px;
      padding: 9px 12px 9px 36px;
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      outline: none;
      color: var(--ink);
      background: var(--paper);
      font: inherit;
      font-size: .86rem;
    }
    .search-icon {
      position: absolute;
      top: 50%;
      left: 12px;
      width: 15px;
      height: 15px;
      color: var(--ink-soft);
      pointer-events: none;
      transform: translateY(-50%);
    }
    .search-box::placeholder { color: #82909f; }

    .nav-links {
      flex: 1;
      margin: 0;
      padding: 14px 12px 20px;
      overflow-y: auto;
      list-style: none;
      scrollbar-width: thin;
      scrollbar-color: #c7d0d4 transparent;
    }
    .nav-links li { margin: 2px 0; }
    .nav-links > li > a,
    .nav-toggle {
      display: flex;
      width: 100%;
      min-height: 38px;
      align-items: center;
      gap: 8px;
      padding: 8px 11px;
      border: 0;
      border-radius: 8px;
      color: #46586d;
      background: transparent;
      font: inherit;
      font-size: .86rem;
      font-weight: 650;
      line-height: 1.4;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 150ms ease, color 150ms ease;
    }
    .nav-links > li > a:hover,
    .nav-toggle:hover { color: var(--ink); background: #eef1ef; }
    .nav-links a.active {
      position: relative;
      color: var(--accent-strong);
      background: var(--accent-soft);
      font-weight: 750;
    }
    .nav-links a.active::before {
      position: absolute;
      top: 8px;
      bottom: 8px;
      left: 0;
      width: 3px;
      border-radius: 3px;
      background: var(--accent);
      content: "";
    }

    .toggle-icon { flex-shrink: 0; transition: transform 150ms ease; }
    .nav-section.open > .nav-toggle .toggle-icon { transform: rotate(90deg); }
    .nav-children { display: none; margin: 0; padding: 0 0 2px 18px; list-style: none; }
    .nav-section.open > .nav-children { display: block; }
    .nav-children a {
      display: block;
      position: relative;
      padding: 7px 10px;
      border-radius: 7px;
      color: #66768a;
      font-size: .82rem;
      line-height: 1.45;
      text-decoration: none;
      transition: background-color 150ms ease, color 150ms ease;
    }
    .nav-children a:hover { color: var(--ink); background: #eef1ef; }

    .nav-footer { padding: 16px 20px 20px; border-top: 1px solid var(--border); }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--ink-soft);
      font-size: .8rem;
      font-weight: 650;
      text-decoration: none;
    }
    .back-link:hover { color: var(--ink); }

    main {
      position: relative;
      flex: 1;
      min-width: 0;
      width: min(100%, 980px);
      min-height: 100vh;
      margin: 0 auto;
      padding: clamp(46px, 6vw, 72px) clamp(34px, 6vw, 76px) 84px;
      background: var(--paper);
      box-shadow: 0 0 0 1px rgba(221, 227, 229, .45);
    }

    main::before {
      display: block;
      width: 74px;
      margin-bottom: 22px;
      border-top: 2px dotted #aebbc2;
      content: "";
    }

    h1, h2, h3, h4 { color: var(--ink); }
    h1 {
      max-width: 20ch;
      margin: 0 0 1.6rem;
      font-family: var(--font-serif);
      font-size: clamp(2rem, 4vw, 2.55rem);
      font-weight: 500;
      line-height: 1.45;
      letter-spacing: .035em;
    }
    h2 {
      margin: 3rem 0 1.15rem;
      padding-bottom: .58rem;
      border-bottom: 1px solid var(--border);
      font-family: var(--font-serif);
      font-size: clamp(1.35rem, 2.5vw, 1.6rem);
      font-weight: 600;
      line-height: 1.5;
      letter-spacing: .02em;
    }
    h3 {
      margin: 2rem 0 .75rem;
      font-size: 1.08rem;
      font-weight: 750;
      line-height: 1.55;
    }
    h4 { margin: 1.5rem 0 .6rem; font-size: .98rem; }

    p {
      margin: 0 0 1.08rem;
      color: #405269;
      font-size: 1rem;
      line-height: 1.82;
    }
    ul, ol {
      margin: 0 0 1.2rem;
      padding-left: 1.5rem;
      color: #405269;
      line-height: 1.72;
    }
    li { margin: .34rem 0; }
    li::marker { color: #7b8da0; }
    strong { color: var(--ink); }

    a {
      color: var(--accent-strong);
      text-decoration-thickness: 1px;
      text-underline-offset: .18em;
    }
    a:hover { text-decoration-thickness: 2px; }

    blockquote {
      margin: 1.6rem 0;
      padding: 1rem 1.15rem;
      border-left: 3px solid #6f96ab;
      border-radius: 0 8px 8px 0;
      color: #405269;
      background: var(--accent-soft);
    }
    blockquote p { color: inherit; }
    blockquote > :last-child { margin-bottom: 0; }

    .table-scroll {
      width: 100%;
      margin: 1.6rem 0;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      scrollbar-width: thin;
    }
    table {
      width: 100%;
      min-width: 540px;
      border-collapse: collapse;
      color: #405269;
      font-size: .92rem;
    }
    th, td {
      padding: .78rem .9rem;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: 0; }
    th:last-child, td:last-child { border-right: 0; }
    th {
      color: var(--ink);
      background: #f2f5f4;
      font-weight: 750;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) { background: #fcfcfa; }

    code {
      padding: .14em .4em;
      border-radius: 5px;
      color: #244f6d;
      background: #edf2f3;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: .9em;
    }
    pre {
      margin: 1.6rem 0;
      padding: 17px 20px;
      overflow-x: auto;
      border: 1px solid #263a52;
      border-radius: 10px;
      background: var(--code-bg);
      line-height: 1.6;
      scrollbar-width: thin;
    }
    pre code {
      padding: 0;
      color: var(--code-text);
      background: transparent;
      white-space: pre;
    }

    hr { margin: 2.4rem 0; border: 0; border-top: 1px solid var(--border); }
    img { max-width: 100%; height: auto; border-radius: 10px; }
    .mermaid {
      margin: 1.6rem 0;
      padding: 18px;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      text-align: center;
    }

    .guide-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
      margin: 1.6rem 0;
    }
    .guide-cards > h3 { grid-column: 1 / -1; margin: 0; }

    #search-results {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      left: 0;
      z-index: 100;
      display: none;
      max-height: 310px;
      overflow-y: auto;
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 18px 40px rgba(21, 36, 60, .14);
    }
    .search-result-item {
      display: block;
      padding: 10px 12px;
      border-bottom: 1px solid #edf0f0;
      color: inherit;
      text-decoration: none;
    }
    .search-result-item:last-child { border-bottom: 0; }
    .search-result-item:hover { background: #f4f7f7; }
    .search-result-title { color: var(--ink); font-size: .84rem; font-weight: 750; }
    .search-result-preview {
      margin-top: 3px;
      overflow: hidden;
      color: var(--ink-soft);
      font-size: .76rem;
      line-height: 1.45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .search-empty { padding: 12px; color: var(--ink-soft); font-size: .8rem; }

    .page-nav {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 14px;
      margin-top: 3.6rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }
    .page-nav-link {
      display: flex;
      min-height: 90px;
      flex-direction: column;
      justify-content: center;
      padding: 15px 17px;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: inherit;
      background: #fff;
      text-decoration: none;
      transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
    }
    .page-nav-link:hover {
      border-color: #aac0ca;
      background: #f8fbfb;
      text-decoration: none;
      transform: translateY(-1px);
    }
    .page-nav-link.next { align-items: flex-end; text-align: right; }
    .page-nav-label {
      margin-bottom: 4px;
      color: var(--ink-soft);
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .04em;
    }
    .page-nav-title { color: var(--accent-strong); font-size: .9rem; font-weight: 750; line-height: 1.5; }

    .scroll-top {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 120;
      display: none;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, .65);
      border-radius: 50%;
      place-items: center;
      color: white;
      background: var(--accent-strong);
      box-shadow: 0 8px 22px rgba(21, 36, 60, .18);
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }
    .scroll-top:hover { transform: translateY(-2px); box-shadow: 0 11px 26px rgba(21, 36, 60, .22); }
    .scroll-top.visible { display: grid; }

    a:focus-visible,
    button:focus-visible,
    input:focus-visible,
    .table-scroll:focus-visible {
      outline: 3px solid rgba(47, 99, 133, .34);
      outline-offset: 2px;
    }

    @media (max-width: 1024px) {
      :root { --sidebar-width: 260px; }
      main { padding-right: clamp(28px, 4vw, 52px); padding-left: clamp(28px, 4vw, 52px); }
    }

    @media (max-width: 768px) {
      html { background: var(--paper); }
      body { display: block; background: var(--paper); }
      .sidebar {
        width: 100%;
        height: auto;
        position: sticky;
        top: 0;
        z-index: 200;
        border-right: 0;
        border-bottom: 1px solid var(--border);
        background: rgba(248, 247, 243, .97);
        backdrop-filter: blur(10px);
      }
      .nav-header { padding: 12px 16px; }
      .nav-title { padding-bottom: 8px; font-size: 1rem; }
      .nav-title::after { bottom: 1px; }
      .nav-brand-mark { width: 28px; height: 28px; }
      .mobile-nav-toggle { display: inline-flex; align-items: center; justify-content: center; }
      .search-wrap,
      .nav-links,
      .nav-footer { display: none; }
      .sidebar.mobile-open .search-wrap { display: block; margin-top: 12px; }
      .sidebar.mobile-open .nav-links {
        display: block;
        max-height: 52vh;
        border-top: 1px solid var(--border);
      }
      .sidebar.mobile-open .nav-footer { display: block; }
      main {
        width: 100%;
        min-height: auto;
        padding: 34px 20px 64px;
        box-shadow: none;
      }
      main::before { margin-bottom: 18px; }
      h1 { max-width: none; font-size: clamp(1.9rem, 8vw, 2.25rem); }
      h2 { margin-top: 2.6rem; }
      p { line-height: 1.78; }
      .page-nav { grid-template-columns: 1fr; }
      .page-nav > div:empty { display: none; }
      .page-nav-link.next { align-items: flex-start; text-align: left; }
      .scroll-top { right: 16px; bottom: 16px; width: 42px; height: 42px; }
    }

    @media (max-width: 420px) {
      main { padding-right: 17px; padding-left: 17px; }
      .table-scroll { margin-right: -2px; margin-left: -2px; }
      .page-nav-link { min-height: 82px; }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        scroll-behavior: auto;
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  </style>
</head>
<body>
  <nav class="sidebar" id="docs-sidebar" aria-label="ドキュメントナビゲーション">
    <div class="nav-header">
      <div class="nav-brand-row">
        <a href="/docs/index" class="nav-title">
          <span class="nav-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h18M14 6l7 6-7 6M8 9l-3 3 3 3"/></svg>
          </span>
          <span>たびたび Docs</span>
        </a>
        <button class="mobile-nav-toggle" id="mobile-nav-toggle" type="button" aria-controls="docs-navigation" aria-expanded="false">目次</button>
      </div>
      <div class="search-wrap" role="search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="search-input" class="search-box" placeholder="ドキュメントを検索" aria-label="ドキュメントを検索" autocomplete="off">
        <div id="search-results" aria-live="polite"></div>
      </div>
    </div>
    <ul class="nav-links" id="docs-navigation">
      ${nav}
    </ul>
    <div class="nav-footer">
      <a href="/" class="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        アプリに戻る
      </a>
    </div>
  </nav>
  <main id="doc-content">
    ${content}
    ${pageNav}
  </main>
  <button class="scroll-top" id="scroll-top" type="button" aria-label="ページ上部へ戻る">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>
  </button>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
    mermaid.init(undefined, document.querySelectorAll('.mermaid'));
  </script>
  <script>
    const sidebar = document.getElementById('docs-sidebar');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const scrollBtn = document.getElementById('scroll-top');
    let searchIndex = [];

    mobileNavToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('mobile-open');
      mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
      mobileNavToggle.textContent = isOpen ? '閉じる' : '目次';
    });

    fetch('/docs/search.json')
      .then(response => response.json())
      .then(data => { searchIndex = data; })
      .catch(() => { searchIndex = []; });

    searchInput.addEventListener('input', event => {
      const query = event.target.value.trim().toLowerCase();
      if (query.length < 2) {
        resultsContainer.style.display = 'none';
        resultsContainer.replaceChildren();
        return;
      }

      const results = searchIndex.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      ).slice(0, 8);

      if (results.length > 0) {
        resultsContainer.replaceChildren(...results.map(item => {
          const link = document.createElement('a');
          link.href = '/docs/' + encodeURI(item.id);
          link.className = 'search-result-item';

          const resultTitle = document.createElement('div');
          resultTitle.className = 'search-result-title';
          resultTitle.textContent = item.title;

          const preview = document.createElement('div');
          preview.className = 'search-result-preview';
          preview.textContent = item.content.substring(0, 70) + '...';

          link.append(resultTitle, preview);
          return link;
        }));
      } else {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = '該当するドキュメントが見つかりません';
        resultsContainer.replaceChildren(empty);
      }
      resultsContainer.style.display = 'block';
    });

    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        resultsContainer.style.display = 'none';
        searchInput.blur();
      }
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.search-wrap')) {
        resultsContainer.style.display = 'none';
      }
    });

    const updateScrollButton = () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 320);
    };

    scrollBtn.addEventListener('click', () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    window.addEventListener('scroll', updateScrollButton, { passive: true });
    updateScrollButton();
  </script>
</body>
</html>
`;

const navTree = buildNavTree();

(async () => {
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(DOCS_SRC, file);
    const title = extractTitleFromMarkdown(file);
    const currentPath = relativePath.replace('.md', '.html');

    const navHtml = generateNavHtml(navTree, currentPath);
    const { prev, next } = getPrevNext(navTree, currentPath);
    const pageNavHtml = generatePrevNextHtml(prev, next);
    const htmlContent = await marked(content);
    const processedContent = htmlContent
      .replace(/href="([^"]+)\.md"/g, 'href="$1.html"')
      .replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="横スクロールできる表"><table>')
      .replace(/<\/table>/g, '</table></div>');

    const finalHtml = template(title, processedContent, navHtml, pageNavHtml, currentPath);
    const destPath = path.join(DOCS_DEST, relativePath.replace('.md', '.html'));
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.writeFileSync(destPath, finalHtml);
    console.log(`Generated ${relativePath.replace('.md', '.html')}`);
  }

  console.log('Documentation build complete!');
})();
