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

marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${text}</pre>`;
      }
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code class="language-${lang || ''}">${escaped}</code></pre>`;
    }
  }
});

function getFiles(dir: string): string[] {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files: (string | string[])[] = dirents.map((dirent: Dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

const allFiles = getFiles(DOCS_SRC).filter(file => file.endsWith('.md'));

interface SearchItem {
  id: string;
  title: string;
  content: string;
}

const searchIndex: SearchItem[] = allFiles.map(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(DOCS_SRC, file);
  const id = relativePath.replace('.md', '');
  const name = path.basename(file, '.md');
  const title = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
  const plainText = content.replace(/#+\s/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`[^`]+`/g, '').replace(/\n/g, ' ').slice(0, 300);
  return { id, title, content: plainText };
});

fs.writeFileSync(path.join(DOCS_DEST, 'search.json'), JSON.stringify(searchIndex));

interface NavItem {
  name: string;
  path: string;
  title: string;
  hasIndex?: boolean;
  children?: NavItem[];
}

const SECTION_LABELS: Record<string, string> = {
  'user': '🚀 使い方ガイド',
  'developer': '🛠️ 開発者ガイド',
  'features': '機能一覧',
  'common': '共通機能',
  'home': 'ホーム画面',
  'themes': 'テーマ機能',
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

function buildNavTree(): NavItem[] {
  const tree: NavItem[] = [];
  const dirMap = new Map<string, NavItem>();

  const topLevelFiles = allFiles.filter(f => path.dirname(f) === DOCS_SRC);
  topLevelFiles.forEach(file => {
    const name = path.basename(file, '.md');
    if (name === 'index') return;
    tree.push({
      name,
      path: `${name}.html`,
      title: extractTitleFromMarkdown(file),
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
      children: [],
    };

    const filesInDir = allFiles.filter(f => {
      const rel = path.relative(DOCS_SRC, f);
      const parts = rel.split(path.sep);
      return parts[0] === dir && parts.length === 2;
    });

    filesInDir.forEach(file => {
      const name = path.basename(file, '.md');
      if (name === 'index') return;
      item.children!.push({
        name,
        path: `${dir}/${name}.html`,
        title: extractTitleFromMarkdown(file),
      });
    });

    const subDirs = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((d: Dirent) => d.isDirectory())
      .map((d: Dirent) => d.name);

    subDirs.forEach((subDir: string) => {
      const subDirPath = path.join(dirPath, subDir);
      const subItem: NavItem = {
        name: subDir,
        path: `${dir}/${subDir}/index.html`,
        title: SECTION_LABELS[subDir] || subDir,
        children: [],
      };

      const filesInSubDir = allFiles.filter(f => {
        const rel = path.relative(DOCS_SRC, f);
        const parts = rel.split(path.sep);
        return parts[0] === dir && parts[1] === subDir && parts.length === 3;
      });

      filesInSubDir.forEach(file => {
        const name = path.basename(file, '.md');
        if (name === 'index') return;
        subItem.children!.push({
          name,
          path: `${dir}/${subDir}/${name}.html`,
          title: extractTitleFromMarkdown(file),
        });
      });

      const subSubDirs = fs.readdirSync(subDirPath, { withFileTypes: true })
        .filter((d: Dirent) => d.isDirectory())
        .map((d: Dirent) => d.name);

      subSubDirs.forEach((subSubDir: string) => {
        const subSubDirPath = path.join(subDirPath, subSubDir);
        const hasIndex = fs.existsSync(path.join(subSubDirPath, 'index.md'));

        const filesInSubSubDir = allFiles.filter(f => {
          const rel = path.relative(DOCS_SRC, f);
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
            title: extractTitleFromMarkdown(file),
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
          children: childFiles,
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
  const devItem = dirMap.get('developer');
  if (userItem) tree.unshift(userItem);
  if (devItem) tree.splice(1, 0, devItem);

  return tree;
}

function toHtmllessPath(pathWithHtml: string): string {
  return pathWithHtml.replace(/\.html$/, '');
}

function generateNavHtml(items: NavItem[], rootPath: string, currentPath: string, level: number = 0): string {
  return items.map(item => {
    const hasChildren = item.children && item.children.length > 0;
    const itemPath = rootPath + toHtmllessPath(item.path);
    const isActive = currentPath === item.path;
    const isParentOfActive = hasChildren && item.children!.some(child =>
      currentPath === child.path ||
      (child.children && child.children.some(c => currentPath === c.path || (c.children && c.children.some(cc => currentPath === cc.path))))
    );
    const isOpen = isActive || isParentOfActive;

    if (hasChildren) {
      const childrenHtml = generateNavHtml(item.children!, rootPath, currentPath, level + 1);
      const showOverview = item.hasIndex !== false;
      return `
        <li class="nav-section${isOpen ? ' open' : ''}">
          <button class="nav-toggle" onclick="this.parentElement.classList.toggle('open')">
            <svg class="toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            <span>${item.title}</span>
          </button>
          <ul class="nav-children">
            ${showOverview ? `<li><a href="${itemPath}" class="${isActive ? 'active' : ''}">概要</a></li>` : ''}
            ${childrenHtml}
          </ul>
        </li>
      `;
    } else {
      return `<li><a href="${itemPath}" class="${isActive ? 'active' : ''}">${item.title}</a></li>`;
    }
  }).join('\n');
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...flattenNavItems(item.children));
    }
  }
  return result;
}

function getPrevNext(navTree: NavItem[], currentPath: string): { prev: NavItem | null; next: NavItem | null } {
  const flat = flattenNavItems(navTree);
  const idx = flat.findIndex(item => item.path === currentPath);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

function generatePrevNextHtml(prev: NavItem | null, next: NavItem | null, rootPath: string): string {
  if (!prev && !next) return '';

  let html = '<nav class="page-nav">';
  if (prev) {
    html += `<a href="${rootPath}${toHtmllessPath(prev.path)}" class="page-nav-link prev"><span class="page-nav-label">← 前へ</span><span class="page-nav-title">${prev.title}</span></a>`;
  } else {
    html += '<div></div>';
  }
  if (next) {
    html += `<a href="${rootPath}${toHtmllessPath(next.path)}" class="page-nav-link next"><span class="page-nav-label">次へ →</span><span class="page-nav-title">${next.title}</span></a>`;
  }
  html += '</nav>';
  return html;
}

const template = (title: string, content: string, nav: string, rootPath: string, pageNav: string) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - たびたび ドキュメント</title>
  <style>
    :root {
      --primary: #3b82f6;
      --bg: #f9fafb;
      --sidebar-bg: #ffffff;
      --text: #1f2937;
      --border: #e5e7eb;
      --header-height: 70px;
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: var(--text); margin: 0; display: flex; min-height: 100vh; background: var(--bg); }

    .sidebar { width: 280px; background: var(--sidebar-bg); border-right: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
    .nav-header { padding: 20px; border-bottom: 1px solid var(--border); background: var(--sidebar-bg); }
    .nav-title { font-weight: 800; font-size: 1.2rem; color: var(--primary); text-decoration: none; display: block; margin-bottom: 12px; }
    .search-box { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; }
    .nav-links { list-style: none; padding: 16px; margin: 0; flex-grow: 1; overflow-y: auto; }
    .nav-links li { margin-bottom: 2px; }
    .nav-links > li > a,
    .nav-links .nav-toggle { display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; color: #4b5563; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: all 0.15s; }
    .nav-links > li > a:hover,
    .nav-toggle:hover { background: #f3f4f6; color: #111827; }
    .nav-links a.active { background: #eff6ff; color: var(--primary); }

    .nav-section { }
    .nav-toggle { width: 100%; border: none; background: none; cursor: pointer; text-align: left; gap: 8px; }
    .toggle-icon { transition: transform 0.2s; flex-shrink: 0; }
    .nav-section.open > .nav-toggle .toggle-icon { transform: rotate(90deg); }
    .nav-children { list-style: none; padding-left: 20px; margin: 0; display: none; }
    .nav-section.open > .nav-children { display: block; }
    .nav-children li { margin-bottom: 2px; }
    .nav-children a { display: block; padding: 6px 12px; border-radius: 6px; color: #6b7280; text-decoration: none; font-size: 0.85rem; transition: all 0.15s; }
    .nav-children a:hover { background: #f3f4f6; color: #111827; }
    .nav-children a.active { background: #eff6ff; color: var(--primary); font-weight: 500; }

    .nav-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
    .back-link { color: #6b7280; text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
    .back-link:hover { color: #111827; }

    main { flex-grow: 1; padding: 40px 60px; max-width: 900px; }

    h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; color: #111827; }
    h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #1f2937; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.15rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #374151; }
    p { margin-bottom: 1rem; color: #4b5563; }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { color: #4b5563; margin-bottom: 1rem; }
    li { margin-bottom: 0.25rem; }

    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }

    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; color: #db2777; }
    pre { background: #1f2937; padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 1.5rem 0; }
    pre code { background: none; color: #e5e7eb; padding: 0; }

    blockquote { border-left: 4px solid var(--primary); margin: 1.5rem 0; padding: 0.75rem 1rem; color: #4b5563; background: #eff6ff; border-radius: 0 8px 8px 0; }

    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

    .guide-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 1.5rem 0; }
    .guide-cards > h3 { grid-column: 1 / -1; margin: 0; }

    #search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 8px; margin-top: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); display: none; z-index: 10; max-height: 300px; overflow-y: auto; }
    .search-result-item { display: block; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; text-decoration: none; }
    .search-result-item:last-child { border-bottom: none; }
    .search-result-item:hover { background: #f9fafb; }
    .search-result-title { font-weight: 600; color: #111827; font-size: 0.9rem; }
    .search-result-preview { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }

    .page-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
    .page-nav-link { display: flex; flex-direction: column; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; transition: all 0.15s; max-width: 45%; }
    .page-nav-link:hover { border-color: var(--primary); background: #eff6ff; text-decoration: none; }
    .page-nav-link.next { align-items: flex-end; text-align: right; margin-left: auto; }
    .page-nav-label { font-size: 0.75rem; color: #6b7280; margin-bottom: 2px; }
    .page-nav-title { font-size: 0.9rem; font-weight: 600; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .scroll-top { position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s; z-index: 100; }
    .scroll-top:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
    .scroll-top.visible { display: flex; }

    @media (max-width: 768px) {
      body { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: relative; border-right: none; border-bottom: 1px solid var(--border); }
      .nav-header { position: sticky; top: 0; z-index: 50; }
      .nav-links { max-height: 50vh; }
      main { padding: 24px 20px; }
      .page-nav-link { max-width: 50%; }
    }
  </style>
</head>
<body>
  <nav class="sidebar">
    <div class="nav-header">
      <a href="${rootPath}index" class="nav-title">📘 たびたび Docs</a>
      <div style="position: relative;">
        <input type="text" id="search-input" class="search-box" placeholder="検索...">
        <div id="search-results"></div>
      </div>
    </div>
    <ul class="nav-links">
      ${nav}
    </ul>
    <div class="nav-footer">
      <a href="/" class="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        アプリに戻る
      </a>
    </div>
  </nav>
  <main>
    ${content}
    ${pageNav}
  </main>
  <button class="scroll-top" id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
  </button>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
  </script>
  <script>
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    let searchIndex = [];

    fetch('${rootPath}search.json')
      .then(res => res.json())
      .then(data => searchIndex = data);

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
      }
      const results = searchIndex.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
      ).slice(0, 8);

      if (results.length > 0) {
        resultsContainer.innerHTML = results.map(item => \`
          <a href="${rootPath}\${item.id}" class="search-result-item">
            <div class="search-result-title">\${item.title}</div>
            <div class="search-result-preview">\${item.content.substring(0, 50)}...</div>
          </a>
        \`).join('');
        resultsContainer.style.display = 'block';
      } else {
        resultsContainer.innerHTML = '<div style="padding:12px;color:#6b7280;font-size:0.85rem">見つかりませんでした</div>';
        resultsContainer.style.display = 'block';
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-header')) {
        resultsContainer.style.display = 'none';
      }
    });

    const scrollBtn = document.getElementById('scroll-top');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    });
  </script>
</body>
</html>
`;

const navTree = buildNavTree();
const flatNav = flattenNavItems(navTree);

(async () => {
  for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(DOCS_SRC, file);
    const name = relativePath.replace('.md', '');
    const title = extractTitleFromMarkdown(file);

    const depth = relativePath.split(path.sep).length - 1;
    const rootPath = depth > 0 ? '../'.repeat(depth) : './';
    const currentPath = relativePath.replace('.md', '.html');

    const navHtml = generateNavHtml(navTree, rootPath, currentPath);
    const { prev, next } = getPrevNext(navTree, currentPath);
    const pageNavHtml = generatePrevNextHtml(prev, next, rootPath);
    const htmlContent = await marked(content);
    const processedContent = htmlContent.replace(/href="([^"]+)\.md"/g, 'href="$1"');

    const finalHtml = template(title, processedContent, navHtml, rootPath, pageNavHtml);

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
