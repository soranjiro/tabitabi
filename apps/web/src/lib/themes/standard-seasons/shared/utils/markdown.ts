import { marked } from "marked";
import { getMemoText } from "$lib/memo";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'del', 'code', 'pre',
  'blockquote',
  'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'input',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  input: new Set(['type', 'checked', 'disabled']),
};

// Allow http(s), mailto, root-relative, fragment, and any string with no scheme.
// Disallow javascript:, data:, vbscript:, file:, etc.
const SAFE_URL_RE = /^(?:https?:|mailto:|\/|#|[^:]*(?:[/?#]|$))/i;

const TAG_RE = /<(\/)?\s*([a-zA-Z][\w-]*)\b((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const ATTR_RE = /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function escapeQuoted(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return '';
  const out: string[] = [];
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name)) continue;
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    if ((name === 'href' || name === 'src') && !SAFE_URL_RE.test(value.trim())) continue;
    out.push(`${name}="${escapeQuoted(value)}"`);
  }
  return out.length ? ' ' + out.join(' ') : '';
}

function sanitize(html: string): string {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '');
  return stripped.replace(TAG_RE, (_match, slash: string | undefined, tag: string, rawAttrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return '';
    if (slash) return `</${t}>`;
    return `<${t}${sanitizeAttrs(t, rawAttrs)}>`;
  });
}

const cache = new Map<string, string>();

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return '';

  const cached = cache.get(text);
  if (cached) return cached;

  const raw = marked.parse(text, { async: false }) as string;
  const result = sanitize(raw);

  if (cache.size > 200) {
    const firstKey = cache.keys().next().value!;
    cache.delete(firstKey);
  }
  cache.set(text, result);

  return result;
}
