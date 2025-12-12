export interface ShioriHistory {
  shioriId: string;
  title: string;
  accessedAt: number;
  token: string | null;
  is_password_protected?: boolean;
}

export interface PasswordAuthRequest {
  shioriId: string;
  password: string;
}

export interface PasswordAuthResponse {
  token: string;
}
