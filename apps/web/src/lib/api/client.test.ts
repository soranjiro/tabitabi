import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient } from './client';
import type { ApiResult } from '@tabitabi/types';

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

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    mockLocalStorage.clear();
    client = new ApiClient('http://localhost:8787/api/v1');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('makes GET request and returns data', async () => {
      const mockData = { id: '123', title: 'Test' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: mockData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await client.get('/itineraries/123');

      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/v1/itineraries/123',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws error on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await expect(client.get('/itineraries/nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('post', () => {
    it('makes POST request with body', async () => {
      const mockData = { id: '123', title: 'New Trip' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: mockData }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await client.post('/itineraries', { title: 'New Trip' });

      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/v1/itineraries',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Trip' }),
        })
      );
    });
  });

  describe('put', () => {
    it('makes PUT request with body', async () => {
      const mockData = { id: '123', title: 'Updated Trip' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: mockData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await client.put('/itineraries/123', { title: 'Updated Trip' });

      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/v1/itineraries/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Trip' }),
        })
      );
    });
  });

  describe('delete', () => {
    it('makes DELETE request', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await client.delete('/itineraries/123');

      expect(result).toBeNull();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/v1/itineraries/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('authentication', () => {
    it('includes Authorization header when token exists', async () => {
      const history = [
        { shioriId: 'abc123', title: 'Trip', token: 'mytoken', accessedAt: 1000 },
      ];
      mockLocalStorage.setItem('shiori_history', JSON.stringify(history));

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/steps?itinerary_id=abc123', 'abc123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
          }),
        })
      );
    });

    it('does not include Authorization header when no token', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/itineraries');

      const callArgs = (fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });
  });
});
