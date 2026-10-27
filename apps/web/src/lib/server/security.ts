import path from 'node:path';

export function hasUnsafeLeadingDoubleSlash(pathname: string): boolean {
  return pathname.startsWith('//');
}

export function resolveContainedHtmlPath(rootDir: string, docPath: string): string | null {
  if (!docPath || docPath.startsWith('/') || docPath.includes('\\') || docPath.includes('\0')) {
    return null;
  }

  const segments = docPath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null;
  }

  const root = path.resolve(rootDir);
  const candidate = path.resolve(root, `${docPath}.html`);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  return candidate.startsWith(rootPrefix) ? candidate : null;
}
