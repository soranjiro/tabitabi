import type { UserSessionProfile } from '@tabitabi/types';
import type { Auth, Unsubscribe, User } from 'firebase/auth';

const USER_KEY = 'user_info';
const PENDING_PROFILE_KEY = 'pending_firebase_profile';

export interface PendingProfile {
  uid: string;
  username: string;
  prefecture: string;
}

let authPromise: Promise<Auth> | null = null;

async function getAuthInstance(): Promise<Auth> {
  if (typeof window === 'undefined') throw new Error('AUTH_UNAVAILABLE');
  if (!authPromise) {
    authPromise = Promise.all([import('firebase/app'), import('firebase/auth')]).then(([appModule, authModule]) => {
      const config = {
        apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
        authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
        appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
      };
      if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
        throw new Error('FIREBASE_CONFIG_MISSING');
      }
      const app = appModule.getApps()[0] ?? appModule.initializeApp(config);
      return authModule.getAuth(app);
    });
  }
  return authPromise;
}

export const userAuth = {
  async ready(): Promise<User | null> {
    const auth = await getAuthInstance();
    await auth.authStateReady();
    return auth.currentUser;
  },

  async getToken(forceRefresh = false): Promise<string | null> {
    const user = await this.ready();
    return user ? user.getIdToken(forceRefresh) : null;
  },

  async getCurrentUser(): Promise<User | null> {
    return this.ready();
  },

  isLoggedIn(): boolean {
    return Boolean(this.getUser());
  },

  async signUp(email: string, password: string): Promise<User> {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    return (await createUserWithEmailAndPassword(await getAuthInstance(), email, password)).user;
  },

  async signIn(email: string, password: string): Promise<User> {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return (await signInWithEmailAndPassword(await getAuthInstance(), email, password)).user;
  },

  async signOut(): Promise<void> {
    const { signOut } = await import('firebase/auth');
    await signOut(await getAuthInstance());
    this.clearProfile();
  },

  async sendVerification(): Promise<void> {
    const { sendEmailVerification } = await import('firebase/auth');
    const user = await this.ready();
    if (!user) throw new Error('AUTH_REQUIRED');
    await sendEmailVerification(user);
  },

  async refreshUser(): Promise<User> {
    const { reload } = await import('firebase/auth');
    const user = await this.ready();
    if (!user) throw new Error('AUTH_REQUIRED');
    await reload(user);
    await user.getIdToken(true);
    return user;
  },

  async sendPasswordReset(email: string): Promise<void> {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(await getAuthInstance(), email);
  },

  async requestEmailChange(newEmail: string): Promise<void> {
    const { verifyBeforeUpdateEmail } = await import('firebase/auth');
    const user = await this.ready();
    if (!user) throw new Error('AUTH_REQUIRED');
    await verifyBeforeUpdateEmail(user, newEmail);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
    const user = await this.ready();
    if (!user?.email) throw new Error('AUTH_REQUIRED');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  },

  onChange(callback: (user: User | null) => void): Promise<Unsubscribe> {
    return getAuthInstance().then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth');
      return onAuthStateChanged(auth, callback);
    });
  },

  getUser(): UserSessionProfile | null {
    try {
      const value = localStorage.getItem(USER_KEY);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  },

  setUser(user: UserSessionProfile): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  updateUser(updates: Partial<UserSessionProfile>): void {
    const current = this.getUser();
    if (current) this.setUser({ ...current, ...updates });
  },

  clearProfile(): void {
    try { localStorage.removeItem(USER_KEY); } catch { /* storage unavailable */ }
  },

  setPendingProfile(profile: PendingProfile): void {
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
  },

  getPendingProfile(): PendingProfile | null {
    try {
      const value = localStorage.getItem(PENDING_PROFILE_KEY);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  },

  clearPendingProfile(): void {
    try { localStorage.removeItem(PENDING_PROFILE_KEY); } catch { /* storage unavailable */ }
  },
};
