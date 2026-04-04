import { Hono } from 'hono';
import { Env, Variables } from '../utils';
import { UserService } from '../services/user.service';
import { userAuthMiddleware } from '../middleware/auth';
import { generateUserToken } from '../utils/jwt';
import type { RegisterInput, LoginInput, UpdateVisibilityInput } from '@tabitabi/types';

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
    const user = await service.register(input);
    const token = await generateUserToken(user.id, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: {
        token,
        user: { username: user.username, created_at: user.created_at }
      }
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
    const user = await service.login(input.email, input.password);
    const token = await generateUserToken(user.id, c.env.JWT_SECRET);

    return c.json({
      success: true,
      data: {
        token,
        user: { username: user.username, created_at: user.created_at }
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'INVALID_CREDENTIALS') {
      return c.json({ success: false, error: { code, message: 'Invalid email or password' } }, 401);
    }
    throw err;
  }
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

// GET /users/me/bookmarks (認証必須 - 全しおり)
users.get('/me/bookmarks', userAuthMiddleware, async (c) => {
  const userId = c.get('userId');
  const service = new UserService(c.env.DB);

  const bookmarks = await service.getMyBookmarks(userId);

  return c.json({ success: true, data: { bookmarks } });
});

// PATCH /users/me/bookmarks/:itineraryId/visibility (認証必須)
users.patch('/me/bookmarks/:itineraryId/visibility', userAuthMiddleware, async (c) => {
  const userId = c.get('userId');
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

export default users;
