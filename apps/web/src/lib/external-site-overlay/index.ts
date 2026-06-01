import { writable } from "svelte/store";

export type ExternalSiteOverlayAction = {
  label: string;
  onClick: (url: string) => void;
  variant?: "primary" | "secondary";
};

export type ExternalSiteOverlayOptions = {
  title?: string;
  subtitle?: string;
  actions?: ExternalSiteOverlayAction[];
};

type ExternalSiteOverlayState = {
  isOpen: boolean;
  url: string;
  title: string;
  subtitle?: string;
  actions: ExternalSiteOverlayAction[];
};

const initialState: ExternalSiteOverlayState = {
  isOpen: false,
  url: "",
  title: "外部サイト",
  actions: [],
};

export const externalSiteOverlay = writable<ExternalSiteOverlayState>(
  initialState,
);

export function isExternalUrl(url: string, baseUrl?: string): boolean {
  try {
    const base =
      baseUrl ?? (typeof window !== "undefined" ? window.location.href : undefined);
    const parsedUrl = new URL(url, base);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }

    if (typeof window === "undefined") {
      return true;
    }

    return parsedUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function toAbsoluteExternalUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(
      url,
      typeof window !== "undefined" ? window.location.href : undefined,
    );
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
    return parsedUrl.href;
  } catch {
    return null;
  }
}

export function openExternalSiteOverlay(
  url: string,
  options: ExternalSiteOverlayOptions = {},
): boolean {
  const absoluteUrl = toAbsoluteExternalUrl(url);
  if (!absoluteUrl || !isExternalUrl(absoluteUrl)) {
    return false;
  }

  externalSiteOverlay.set({
    isOpen: true,
    url: absoluteUrl,
    title: options.title ?? getExternalSiteTitle(absoluteUrl),
    subtitle: options.subtitle,
    actions: options.actions ?? [],
  });

  return true;
}

export function closeExternalSiteOverlay() {
  externalSiteOverlay.set(initialState);
}

function getExternalSiteTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "外部サイト";
  }
}
