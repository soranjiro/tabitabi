import { getMemoText } from "$lib/memo";
import { renderMarkdown as renderSanitizedMarkdown } from "../../standard/core/utils/markdown";

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  return renderSanitizedMarkdown(memoOrNotes);
}

export function stripMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return '';

  return text
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^- \[.\] /gm, '')
    .replace(/^- /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^> /gm, '');
}
