import { apiClient } from './client';
import type { PasswordAuthRequest, PasswordAuthResponse } from '@tabitabi/types';

export const authApi = {
  async verifyToken(shioriId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>('/auth/verify', {}, shioriId);
      return response.valid;
    } catch {
      return false;
    }
  },

  async authenticateWithPassword(shioriId: string, password: string): Promise<string> {
    const data = await apiClient.post<PasswordAuthResponse>('/auth/password', {
      shioriId,
      password,
    } as PasswordAuthRequest);

    return data.token;
  },
};
