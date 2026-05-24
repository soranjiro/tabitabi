export function replaceState(_state: string, url: string) {
  window.history.replaceState({}, '', url);
}
