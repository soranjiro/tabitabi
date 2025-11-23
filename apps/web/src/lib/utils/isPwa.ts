/**
 * Detects if the app is running in PWA (Progressive Web App) mode.
 * This is particularly useful for iPhone PWAs where localStorage is isolated
 * from the browser.
 *
 * @returns true if running in standalone PWA mode, false otherwise
 */
export function isPwa(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches;
}
