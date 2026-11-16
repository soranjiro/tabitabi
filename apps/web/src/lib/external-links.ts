/**
 * External HTTP(S) links open in a separate browser tab, not an iframe.
 * Preserve explicit custom targets and native modified-click behavior.
 */
export function getSafeHttpUrl(href: string, base?: string): URL | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function prepareExternalAnchor(anchor: HTMLAnchorElement, currentUrl: string): boolean {
  if (anchor.hasAttribute("download") || anchor.dataset.externalNewTab === "false") return false;

  const rawHref = anchor.getAttribute("href");
  if (!rawHref) return false;

  const link = getSafeHttpUrl(rawHref, currentUrl);
  const current = getSafeHttpUrl(currentUrl);
  if (!link || !current || link.origin === current.origin) return false;

  if (!anchor.target || anchor.target === "_self") anchor.target = "_blank";
  if (anchor.target === "_blank") anchor.relList.add("noopener", "noreferrer");
  return true;
}

export function openExternalUrl(href: string): boolean {
  if (typeof window === "undefined") return false;
  const link = getSafeHttpUrl(href, window.location.href);
  if (!link || link.origin === window.location.origin) return false;
  window.open(link.href, "_blank", "noopener,noreferrer");
  return true;
}
