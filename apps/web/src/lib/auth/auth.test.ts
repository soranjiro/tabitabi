import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { auth } from './index';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('auth', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('getHistory', () => {
    it('returns empty array when no history exists', () => {
      expect(auth.getHistory()).toEqual([]);
    });

    it('returns parsed history from localStorage', () => {
      const history = [
        { shioriId: 'abc123', title: 'Trip', token: 'token123', accessedAt: 1000 },
      ];
      mockLocalStorage.setItem('shiori_history', JSON.stringify(history));

      expect(auth.getHistory()).toEqual(history);
    });

    it('returns empty array on parse error', () => {
      mockLocalStorage.setItem('shiori_history', 'invalid json');
      expect(auth.getHistory()).toEqual([]);
    });
  });

  describe('getToken', () => {
    it('returns null when no token exists', () => {
      expect(auth.getToken('nonexistent')).toBeNull();
    });

    it('returns token for existing shiori', () => {
      const history = [
        { shioriId: 'abc123', title: 'Trip', token: 'mytoken', accessedAt: 1000 },
      ];
      mockLocalStorage.setItem('shiori_history', JSON.stringify(history));

      expect(auth.getToken('abc123')).toBe('mytoken');
    });
  });

  describe('setToken', () => {
    it('adds new entry to history', () => {
      auth.setToken('new123', 'New Trip', 'newtoken');

      const history = auth.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].shioriId).toBe('new123');
      expect(history[0].title).toBe('New Trip');
      expect(history[0].token).toBe('newtoken');
    });

    it('updates existing entry', () => {
      auth.setToken('abc123', 'Original', 'token1');
      auth.setToken('abc123', 'Updated', 'token2');

      const history = auth.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Updated');
      expect(history[0].token).toBe('token2');
    });

    it('ignores demo itinerary', () => {
      auth.setToken('demo', 'Demo Trip', 'token');
      expect(auth.getHistory()).toEqual([]);
    });
  });

  describe('removeToken', () => {
    it('sets token to null for existing entry', () => {
      auth.setToken('abc123', 'Trip', 'mytoken');
      auth.removeToken('abc123');

      const history = auth.getHistory();
      expect(history[0].token).toBeNull();
    });

    it('does nothing for non-existent entry', () => {
      auth.removeToken('nonexistent');
      expect(auth.getHistory()).toEqual([]);
    });
  });

  describe('hasEditPermission', () => {
    it('returns false when no token', () => {
      expect(auth.hasEditPermission('abc123')).toBe(false);
    });

    it('returns true when token exists', () => {
      auth.setToken('abc123', 'Trip', 'token');
      expect(auth.hasEditPermission('abc123')).toBe(true);
    });

    it('returns false when token is null', () => {
      auth.setToken('abc123', 'Trip', 'token');
      auth.removeToken('abc123');
      expect(auth.hasEditPermission('abc123')).toBe(false);
    });
  });

  describe('updateAccessTime', () => {
    it('moves entry to front of history', () => {
      auth.setToken('first', 'First', 't1');
      auth.setToken('second', 'Second', 't2');
      auth.updateAccessTime('first', 'First Updated');

      const history = auth.getHistory();
      expect(history[0].shioriId).toBe('first');
      expect(history[0].title).toBe('First Updated');
    });

    it('adds new entry if not exists', () => {
      auth.updateAccessTime('new123', 'New Trip');

      const history = auth.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].shioriId).toBe('new123');
      expect(history[0].token).toBeNull();
    });

    it('limits history to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        auth.updateAccessTime(`trip${i}`, `Trip ${i}`);
      }

      const history = auth.getHistory();
      expect(history).toHaveLength(10);
    });

    it('does not record demo itinerary', () => {
      auth.updateAccessTime('demo', 'Demo Trip');
      expect(auth.getHistory()).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('removes all history', () => {
      auth.setToken('abc123', 'Trip', 'token');
      auth.clearHistory();

      expect(auth.getHistory()).toEqual([]);
    });
  });

  describe('removeFromHistory', () => {
    it('removes specific entry from history', () => {
      auth.setToken('keep', 'Keep', 't1');
      auth.setToken('remove', 'Remove', 't2');
      auth.removeFromHistory('remove');

      const history = auth.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].shioriId).toBe('keep');
    });
  });

  describe('getRecentItineraries', () => {
    it('returns recent itineraries sorted by access time', () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T10:00:00'));
      auth.updateAccessTime('old', 'Old Trip');

      vi.setSystemTime(new Date('2024-01-01T12:00:00'));
      auth.updateAccessTime('new', 'New Trip');

      const recent = auth.getRecentItineraries(2);
      expect(recent[0].id).toBe('new');
      expect(recent[1].id).toBe('old');

      vi.useRealTimers();
    });

    it('limits results to specified count', () => {
      for (let i = 0; i < 10; i++) {
        auth.updateAccessTime(`trip${i}`, `Trip ${i}`);
      }

      const recent = auth.getRecentItineraries(3);
      expect(recent).toHaveLength(3);
    });
  });
});
