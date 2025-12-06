/**
 * Demo Mode Context
 * Provides a way to track if the current page is in demo mode
 * without requiring themes to know about demo details
 */

let isDemoMode = false;

export function setDemoMode(active: boolean): void {
  isDemoMode = active;
}

export function getIsDemoMode(): boolean {
  return isDemoMode;
}

export function resetDemoMode(): void {
  isDemoMode = false;
}
