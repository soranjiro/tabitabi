export interface AuthToken {
  token: string;
  expiresAt: number;
}

export interface ShioriHistory {
  shioriId: string;
  title: string;
  accessedAt: number;
  token: string | null;
}

export interface PasswordAuthRequest {
  shioriId: string;
  password: string;
}

export interface PasswordAuthResponse {
  token: string;
}
