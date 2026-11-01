import type { ShioriHistory } from '@tabitabi/types';
import { replaceState } from '$app/navigation';

const STORAGE_KEY = 'shiori_history';
const SESSION_TOKENS_KEY = 'shiori_edit_tokens_session';

// Editing credentials must not be persisted indefinitely with recent-trip metadata.
// sessionStorage survives reloads within this tab, but not the browser session.
const memoryTokens = new Map<string, string>();

function readSessionTokens(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(SESSION_TOKENS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([id, token]) =>
        id !== '__proto__' && typeof token === 'string' && token.length > 0)
    ) as Record<string, string>;
  } catch {
    return Object.fromEntries(memoryTokens);
  }
}

function persistSessionTokens(tokens: Record<string, string>): void {
  memoryTokens.clear();
  for (const [id, token] of Object.entries(tokens)) memoryTokens.set(id, token);
  try { sessionStorage.setItem(SESSION_TOKENS_KEY, JSON.stringify(tokens)); }
  catch { /* Keep credentials in memory if browser storage is disabled. */ }
}


const isDemoShiori = (shioriId: string) => shioriId === 'demo';

export const auth = {
  getHistory(): ShioriHistory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const history: unknown = data ? JSON.parse(data) : [];
      if (!Array.isArray(history)) return [];

      const sessionTokens = readSessionTokens();
      let needsMigration = false;
      const entries = history.filter(
        (item): item is ShioriHistory =>
          item !== null && typeof item === 'object' && typeof item.shioriId === 'string'
      );
      for (const entry of entries) {
        // One-time migration of existing edit permissions from persistent storage.
        if (typeof entry.token === 'string' && entry.token) {
          if (!sessionTokens[entry.shioriId]) sessionTokens[entry.shioriId] = entry.token;
          needsMigration = true;
        }
      }

      if (needsMigration) {
        persistSessionTokens(sessionTokens);
        // Do not leave plaintext legacy tokens in localStorage.
        const metadata = entries.map(({ token: _token, ...entry }) => ({ ...entry, token: null }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      }
      return entries.map(entry => ({ ...entry, token: sessionTokens[entry.shioriId] ?? null }));
    } catch {
      return [];
    }
  },

  saveHistory(history: ShioriHistory[]): void {
    const tokens: Record<string, string> = {};
    const metadata = history.map(({ token, ...entry }) => {
      if (typeof token === 'string' && token) tokens[entry.shioriId] = token;
      return { ...entry, token: null };
    });
    persistSessionTokens(tokens);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  },

  getToken(shioriId: string): string | null {
    const history = this.getHistory();
    const record = history.find(h => h.shioriId === shioriId);
    return record?.token ?? null;
  },

  setToken(shioriId: string, title: string, token: string): void {
    if (isDemoShiori(shioriId)) return;

    const history = this.getHistory();
    const index = history.findIndex(h => h.shioriId === shioriId);

    const existing = index >= 0 ? history[index] : undefined;

    const record: ShioriHistory = {
      shioriId,
      title,
      token,
      accessedAt: Date.now(),
      is_password_protected: existing?.is_password_protected,
    };

    if (index >= 0) {
      history[index] = record;
    } else {
      history.unshift(record);
    }

    this.saveHistory(history);
  },

  removeToken(shioriId: string): void {
    const history = this.getHistory();
    const index = history.findIndex(h => h.shioriId === shioriId);

    if (index >= 0) {
      history[index].token = null;
      this.saveHistory(history);
    }
  },

  updateAccessTime(shioriId: string, title: string): void {
    if (isDemoShiori(shioriId)) return;

    const history = this.getHistory();
    const index = history.findIndex(h => h.shioriId === shioriId);
    const now = Date.now();

    if (index >= 0) {
      history[index].accessedAt = now;
      history[index].title = title;
      const [current] = history.splice(index, 1);
      history.unshift(current);
    } else {
      history.unshift({
        shioriId,
        title,
        token: null,
        accessedAt: now,
        is_password_protected: this.isPasswordProtected(shioriId),
      });
    }

    const trimmed = history.slice(0, 10);
    this.saveHistory(trimmed);
  },

  extractTokenFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      params.delete('token');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

      try {
        replaceState('', newUrl);
      } catch (e) {
        // In SSR context, replaceState may not be available
        // but we're in a browser context when this runs
      }
    }

    return token;
  },

  hasEditPermission(shioriId: string): boolean {
    const token = this.getToken(shioriId);
    return !!token;
  },

  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
    persistSessionTokens({});
    try { sessionStorage.removeItem(SESSION_TOKENS_KEY); } catch { /* session unavailable */ }
  },

  removeFromHistory(shioriId: string): void {
    const history = this.getHistory();
    const filtered = history.filter(h => h.shioriId !== shioriId);
    this.saveHistory(filtered);
  },

  restoreHistoryEntry(entry: ShioriHistory): void {
    const history = this.getHistory().filter(h => h.shioriId !== entry.shioriId);
    history.unshift(entry);
    this.saveHistory(history.slice(0, 10));
  },

  getRecentItineraries(limit: number = 5) {
    const history = this.getHistory();
    return history
      .filter(h => h.shioriId !== 'demo') // Exclude demo entries
      .sort((a, b) => b.accessedAt - a.accessedAt)
      .slice(0, limit)
      .map(h => ({
        id: h.shioriId,
        title: h.title,
        visitedAt: h.accessedAt,
      }));
  },

  // パスワード保護状態の管理
  isPasswordProtected(shioriId: string): boolean {
    const history = this.getHistory();
    const record = history.find(h => h.shioriId === shioriId);
    return !!record?.is_password_protected;
  },

  setPasswordProtected(shioriId: string, isProtected: boolean): void {
    const history = this.getHistory();
    const index = history.findIndex(h => h.shioriId === shioriId);
    if (index >= 0) {
      history[index].is_password_protected = isProtected;
    } else {
      history.unshift({
        shioriId,
        title: '',
        token: null,
        accessedAt: Date.now(),
        is_password_protected: isProtected,
      });
    }
    this.saveHistory(history);
  },
};
