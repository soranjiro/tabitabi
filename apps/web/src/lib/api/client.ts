import type { ApiResult } from '@tabitabi/types';
import { auth } from '../auth';
import { getIsDemoMode } from '../demo';

// Prefer PUBLIC_ for Cloudflare Pages, fallback to VITE_
const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8787/api/v1';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(shioriId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (shioriId) {
      const token = auth.getToken(shioriId);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    shioriId?: string
  ): Promise<T> {
    // In demo mode, throw error to prevent any backend calls
    if (getIsDemoMode()) {
      throw new Error('Backend API calls are not allowed in demo mode');
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(shioriId),
        ...options.headers,
      },
    });

    const result: ApiResult<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  async get<T>(endpoint: string, shioriId?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, shioriId);
  }

  async post<T>(endpoint: string, data: unknown, shioriId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, shioriId);
  }

  async put<T>(endpoint: string, data: unknown, shioriId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, shioriId);
  }

  async delete<T>(endpoint: string, shioriId?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, shioriId);
  }

  async patch<T>(endpoint: string, data: unknown, shioriId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, shioriId);
  }
}

export const apiClient = new ApiClient();
