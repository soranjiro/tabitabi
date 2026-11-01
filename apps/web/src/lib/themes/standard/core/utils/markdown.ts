import { marked, Renderer } from "marked";
import { getMemoText } from "$lib/memo";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const renderer = new Renderer();
// Never render raw HTML from user-controlled memos or itinerary notes.
renderer.html = () => "";
renderer.image = ({ text }) => escapeHtml(text);
renderer.link = function ({ href, title, tokens }) {
  const safe = /^(https?:|mailto:)/i.test(href) && !/[\u0000-\u001f\u007f]/.test(href);
  const label = this.parser.parseInline(tokens);
  if (!safe) return label;
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  return `<a href="${escapeHtml(href)}"${titleAttr}>${label}</a>`;
};

marked.setOptions({ breaks: true, gfm: true, renderer });

const cache = new Map<string, string>();

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return "";

  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  const result = marked.parse(text, { async: false }) as string;
  if (cache.size >= 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(text, result);
  return result;
}
