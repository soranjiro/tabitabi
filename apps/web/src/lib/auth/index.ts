import type { ShioriHistory } from '@tabitabi/types';

const STORAGE_KEY = 'shiori_history';

export const auth = {
  getHistory(): ShioriHistory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHistory(history: ShioriHistory[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },

  getToken(shioriId: string): string | null {
    const history = this.getHistory();
    const record = history.find(h => h.shioriId === shioriId);
    return record?.token ?? null;
  },

  setToken(shioriId: string, title: string, token: string): void {
    const history = this.getHistory();
    const index = history.findIndex(h => h.shioriId === shioriId);
    const record: ShioriHistory = {
      shioriId,
      title,
      token,
      accessedAt: Date.now(),
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
      window.history.replaceState({}, '', newUrl);
    }

    return token;
  },

  hasEditPermission(shioriId: string): boolean {
    return this.getToken(shioriId) !== null;
  },

  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  removeFromHistory(shioriId: string): void {
    const history = this.getHistory();
    const filtered = history.filter(h => h.shioriId !== shioriId);
    this.saveHistory(filtered);
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
};
