import { getMemoText } from "$lib/memo";

export function renderMarkdown(memoOrNotes: string | null | undefined): string {
  const text = getMemoText(memoOrNotes);
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('type="checkbox"')) {
      return `<ul class="ai-checklist">${match}</ul>`;
    }
    return `<ul>${match}</ul>`;
  });

  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;

  html = html.replace(/<p><(h[123]|ul|ol|blockquote)/g, '<$1');
  html = html.replace(/<\/(h[123]|ul|ol|blockquote)><\/p>/g, '</$1>');
  html = html.replace(/<p><\/p>/g, '');

  return html;
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
