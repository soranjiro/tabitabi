const USER_TOKEN_KEY = 'user_token';
const USER_KEY = 'user_info';

interface UserInfo {
  username: string;
  created_at: string;
}

export const userAuth = {
  getToken(): string | null {
    try {
      return localStorage.getItem(USER_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getUser(): UserInfo | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSession(token: string, user: UserInfo): void {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  },
};
