import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { getMemoText } from "$lib/memo";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return '';
  const raw = marked.parse(text, { async: false }) as string;
  return sanitizeHtml(raw);
}
