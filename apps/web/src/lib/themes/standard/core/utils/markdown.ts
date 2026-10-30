import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { getMemoText } from "$lib/memo";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'ul', 'ol', 'li', 'strong', 'em', 'del', 'code', 'pre',
    'blockquote', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    input: ['type', 'checked', 'disabled'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
} satisfies sanitizeHtml.IOptions;

const cache = new Map<string, string>();

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return '';

  const cached = cache.get(text);
  if (cached) return cached;

  const raw = marked.parse(text, { async: false }) as string;
  const result = sanitizeHtml(raw, SANITIZE_OPTIONS);

  if (cache.size > 200) {
    const firstKey = cache.keys().next().value!;
    cache.delete(firstKey);
  }
  cache.set(text, result);

  return result;
}
