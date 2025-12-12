import { auth } from './index';
import { authApi } from '$lib/api/auth';

export interface PasswordAuthParams {
  shioriId: string;
  title: string;
  password: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  setAuthenticating: (value: boolean) => void;
}

export async function handlePasswordAuth(params: PasswordAuthParams): Promise<void> {
  const { shioriId, title, password, onSuccess, onError, setAuthenticating } = params;

  // 1. Check if itinerary is password-protected
  if (!auth.isPasswordProtected(shioriId)) {
    onSuccess();
    return;
  }

  // 2. Validate password is not empty
  if (!password.trim()) {
    onError('パスワードを入力してください');
    return;
  }

  setAuthenticating(true);
  try {
    // 3. Get token from backend
    const token = await authApi.authenticateWithPassword(shioriId, password);

    // 4. Save token
    auth.setToken(shioriId, title, token);

    // 5. Success callback
    onSuccess();
  } catch (error) {
    // 6. Error handling
    onError('パスワードが正しくありません');
  } finally {
    // 7. Reset authenticating state
    setAuthenticating(false);
  }
}
