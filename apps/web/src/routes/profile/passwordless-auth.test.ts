import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Route-level guardrails: new users must never be forced to create a password.
const page = readFileSync(resolve(process.cwd(), 'src/routes/profile/+page.svelte'), 'utf8');
const auth = readFileSync(resolve(process.cwd(), 'src/lib/user-auth.ts'), 'utf8');
const action = readFileSync(resolve(process.cwd(), 'src/routes/auth/action/+page.svelte'), 'utf8');

describe('passwordless account flow', () => {
  it('allows registration by verified email link, without a password field', () => {
    expect(page).toContain('mode === "register" ? "メールで無料登録"');
    expect(page).toContain('onsubmit={(event) => { event.preventDefault(); sendEmailLink(); }}');
    expect(page).not.toContain('userAuth.signUp(email, password)');
    expect(page).not.toContain('mode === "register" ? "new-password"');
  });

  it('allows existing password users to sign in without making it the default', () => {
    expect(page).toContain('showLegacyPasswordLogin');
    expect(page).toContain('handlePasswordLogin()');
    expect(page).toContain('userAuth.signIn(email, password)');
  });

  it('supports cross-device email confirmation and safe callback handling', () => {
    expect(page).toContain('userAuth.isEmailSignInLink(window.location.href)');
    expect(page).toContain('mode = "email-link"');
    expect(page).toContain('userAuth.completeEmailLink(email, pendingEmailLink)');
    expect(auth).toContain('isSignInWithEmailLink(auth, url)');
    expect(auth).toContain("localStorage.setItem(PENDING_EMAIL_LINK_KEY, address)");
    expect(auth).toContain("new URL('/profile', window.location.origin)");
    expect(auth).not.toContain('email: address,');
    expect(action).toContain('mode === "signIn"');
  });

  it('keeps account recovery and optional passkey registration available', () => {
    expect(page).toContain('sendPasswordReset(email)');
    expect(page).toContain('パスキーを登録');
    expect(page).toContain('suggestPasskey && passkeyAvailable');
  });
});
