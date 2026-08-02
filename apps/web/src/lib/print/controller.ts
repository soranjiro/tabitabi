import { writable } from "svelte/store";

export const printStudioOpen = writable(false);

export function openPrintStudio(): void {
  printStudioOpen.set(true);
}

export function closePrintStudio(): void {
  printStudioOpen.set(false);
}
