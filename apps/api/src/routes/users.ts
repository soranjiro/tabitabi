import { Hono } from 'hono';
import { Env, Variables } from '../utils';
import { UserService } from '../services/user.service';
import { userAuthMiddleware } from '../middleware/auth';
import { generateUserToken } from '../utils/jwt';
import type { RegisterInput, LoginInput, UpdateVisibilityInput, SyncBookmarksInput, UpdateProfileInput, UpdatePasswordInput } from '@tabitabi/types';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /users/register
users.post('/register', async (c) => {
  const input: RegisterInput = await c.req.json();

  if (!input.username || !input.email || !input.password) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'username, email, password are required' }
    }, 400);
  }

  const service = new UserService(c.env.DB);

  try {
    const profile = await service.register(input);
    const token = await generateUserToken(profile.id, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: { token, user: { username: profile.username, created_at: profile.created_at } }
    }, 201);
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'EMAIL_ALREADY_EXISTS' || code === 'USERNAME_ALREADY_EXISTS') {
      return c.json({ success: false, error: { code, message: code } }, 409);
    }
    throw err;
  }
});

// POST /users/login
users.post('/login', async (c) => {
  const input: LoginInput = await c.req.json();

  if (!input.email || !input.password) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'email and password are required' }
    }, 400);
  }

  const service = new UserService(c.env.DB);

  try {
    const profile = await service.login(input.email, input.password);
    const token = await generateUserToken(profile.id, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: { token, user: { username: profile.username, created_at: profile.created_at } }
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'INVALID_CREDENTIALS') {
      return c.json({ success: false, error: { code, message: 'Invalid email or password' } }, 401);
    }
    throw err;
  }
});

// ※ 静的ルート (/me/...) は動的ルート (/:username/...) より先に登録すること
// PATCH /users/me/profile (認証必須 - プロフィール更新)
users.patch('/me/profile', userAuthMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const input: UpdateProfileInput = await c.req.json();

  const usernameProvided = typeof input.username === 'string';
  const emailProvided = typeof input.email === 'string';

  if (!usernameProvided && !emailProvided) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'username or email is required' }
    }, 400);
  }

  const service = new UserService(c.env.DB);

  try {
    const updated = await service.updateProfile(userId, input);
    return c.json({ success: true, data: updated });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'USERNAME_INVALID_LENGTH' || code === 'EMAIL_INVALID_FORMAT' || code === 'USERNAME_ALREADY_EXISTS' || code === 'EMAIL_ALREADY_EXISTS') {
      const status = (code === 'USERNAME_ALREADY_EXISTS' || code === 'EMAIL_ALREADY_EXISTS') ? 409 : 400;
      return c.json({ success: false, error: { code, message: code } }, status);
    }
    throw err;
  }
});

// PATCH /users/me/password (認証必須 - パスワード変更)
users.patch('/me/password', userAuthMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const input: UpdatePasswordInput = await c.req.json();

  if (typeof input.current_password !== 'string' || typeof input.new_password !== 'string' || !input.current_password || !input.new_password) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'current_password and new_password are required' }
    }, 400);
  }

  const service = new UserService(c.env.DB);

  try {
    await service.updatePassword(userId, input);
    return c.json({ success: true, data: null });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'INVALID_CURRENT_PASSWORD' || code === 'PASSWORD_TOO_SHORT') {
      return c.json({ success: false, error: { code, message: code } }, 400);
    }
    throw err;
  }
});

// POST /users/me/sync-bookmarks (認証必須 - ログイン時の localStorage→server 同期)
users.post('/me/sync-bookmarks', userAuthMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const input: SyncBookmarksInput = await c.req.json();

  if (!Array.isArray(input.itinerary_ids)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'itinerary_ids must be an array' }
    }, 400);
  }

  if (input.itinerary_ids.length > 50) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Too many itinerary_ids (max 50)' }
    }, 400);
  }

  if (!input.itinerary_ids.every((id) => typeof id === 'string' && id.length > 0)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'itinerary_ids must contain only non-empty strings' }
    }, 400);
  }

  const service = new UserService(c.env.DB);
  const result = await service.syncBookmarks(userId, input.itinerary_ids);
  return c.json({ success: true, data: result });
});

// GET /users/me/bookmarks (認証必須 - 全しおり)
users.get('/me/bookmarks', userAuthMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const service = new UserService(c.env.DB);
  const bookmarks = await service.getMyBookmarks(userId);
  return c.json({ success: true, data: { bookmarks } });
});

// PATCH /users/me/bookmarks/:itineraryId/visibility (認証必須)
users.patch('/me/bookmarks/:itineraryId/visibility', userAuthMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const itineraryId = c.req.param('itineraryId');
  const input: UpdateVisibilityInput = await c.req.json();

  if (typeof input.is_visible !== 'boolean') {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'is_visible must be a boolean' }
    }, 400);
  }

  const service = new UserService(c.env.DB);
  const result = await service.updateBookmarkVisibility(userId, itineraryId, input.is_visible);

  if (!result) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bookmark not found' } }, 404);
  }

  return c.json({ success: true, data: result });
});

// GET /users/:username/profile (認証不要)
users.get('/:username/profile', async (c) => {
  const username = c.req.param('username');
  const service = new UserService(c.env.DB);

  const user = await service.getByUsername(username);
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  return c.json({
    success: true,
    data: { username: user.username, created_at: user.created_at }
  });
});

// GET /users/:username/bookmarks (認証不要 - 公開しおりのみ)
users.get('/:username/bookmarks', async (c) => {
  const username = c.req.param('username');
  const service = new UserService(c.env.DB);

  const user = await service.getByUsername(username);
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const bookmarks = await service.getPublicBookmarks(username);
  return c.json({ success: true, data: { username, bookmarks } });
});

export default users;
