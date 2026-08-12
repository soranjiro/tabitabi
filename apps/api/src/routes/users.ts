import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, Variables } from '../utils';
import { UserService } from '../services/user.service';
import { ItineraryService } from '../services/itinerary.service';
import { userAuthMiddleware, userProfileMiddleware } from '../middleware/auth';
import { bootstrapProfileSchema, publishItinerarySchema, syncBookmarksSchema, updateProfileSchema, updateVisibilitySchema } from '../validators';
import { validationHook } from '../validators/hook';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /users/search?q=:query (認証不要 - username 部分一致検索)
users.get('/search', async (c) => {
  const trimmedQ = (c.req.query('q') ?? '').trim();
  if (!trimmedQ) {
    return c.json({ success: true, data: { users: [] } });
  }
  if (trimmedQ.length > 50) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'q must be 50 characters or less' } }, 400);
  }

  const service = new UserService(c.env.DB);
  const results = await service.searchUsers(trimmedQ);
  return c.json({ success: true, data: { users: results } });
});

// GET /users (認証不要 - 全ユーザーの公開しおりフィード)
users.get('/', async (c) => {
  const offsetParam = c.req.query('offset') ?? '0';
  const offset = Math.max(0, parseInt(offsetParam, 10) || 0);
  const LIMIT = 30;
  const prefecture = (c.req.query('prefecture') ?? '').trim();
  const tag = (c.req.query('tag') ?? '').trim();
  if (prefecture.length > 32 || tag.length > 24) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid feed filter' } }, 400);
  }

  const service = new UserService(c.env.DB);
  const result = await service.getPublicFeed(offset, LIMIT, {
    prefecture: prefecture || undefined,
    tag: tag || undefined,
  });
  return c.json({ success: true, data: result });
});

// ※ 静的ルート (/me/...) は動的ルート (/:username/...) より先に登録すること
users.post('/me/bootstrap', userAuthMiddleware, zValidator('json', bootstrapProfileSchema, validationHook), async (c) => {
  const service = new UserService(c.env.DB);
  try {
    const profile = await service.bootstrapFirebaseUser(
      c.get('userId')!,
      c.get('firebaseEmail')!,
      c.req.valid('json'),
    );
    return c.json({ success: true, data: profileForClient(profile) });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'PROFILE_SETUP_REQUIRED') {
      return c.json({ success: false, error: { code, message: code } }, 409);
    }
    if (code === 'USERNAME_ALREADY_EXISTS' || code === 'EMAIL_ALREADY_EXISTS') {
      return c.json({ success: false, error: { code, message: code } }, 409);
    }
    throw err;
  }
});

users.get('/me/account', userAuthMiddleware, async (c) => {
  try {
    const profile = await new UserService(c.env.DB).bootstrapFirebaseUser(
      c.get('userId')!,
      c.get('firebaseEmail')!,
      {},
    );
    return c.json({ success: true, data: profileForClient(profile) });
  } catch (err) {
    if (err instanceof Error && err.message === 'PROFILE_SETUP_REQUIRED') {
      return c.json({ success: false, error: { code: 'PROFILE_SETUP_REQUIRED', message: 'Profile setup is required' } }, 409);
    }
    throw err;
  }
});

// PATCH /users/me/profile (認証必須 - プロフィール更新)
users.patch('/me/profile', userAuthMiddleware, userProfileMiddleware, zValidator('json', updateProfileSchema, validationHook), async (c) => {
  const userId = c.get('userId')!;
  const input = c.req.valid('json');
  const service = new UserService(c.env.DB);

  try {
    const updated = await service.updateProfile(userId, input);
    return c.json({ success: true, data: updated });
  } catch (err) {
    const code = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (code === 'USERNAME_INVALID_LENGTH' || code === 'USERNAME_ALREADY_EXISTS') {
      const status = code === 'USERNAME_ALREADY_EXISTS' ? 409 : 400;
      return c.json({ success: false, error: { code, message: code } }, status);
    }
    throw err;
  }
});

// POST /users/me/sync-bookmarks (認証必須 - ログイン時の localStorage→server 同期)
users.post('/me/sync-bookmarks', userAuthMiddleware, userProfileMiddleware, zValidator('json', syncBookmarksSchema, validationHook), async (c) => {
  const userId = c.get('userId')!;
  const input = c.req.valid('json');

  const service = new UserService(c.env.DB);
  const result = await service.syncBookmarks(userId, input.itinerary_ids);
  return c.json({ success: true, data: result });
});

// GET /users/me/bookmarks (認証必須 - 全しおり)
users.get('/me/bookmarks', userAuthMiddleware, userProfileMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const service = new UserService(c.env.DB);
  const bookmarks = await service.getMyBookmarks(userId);
  return c.json({ success: true, data: { bookmarks } });
});

// POST /users/me/bookmarks/:itineraryId/publish
// Creates/refreshes the immutable public-ID snapshot and lists it in discovery.
users.post(
  '/me/bookmarks/:itineraryId/publish',
  userAuthMiddleware,
  userProfileMiddleware,
  zValidator('json', publishItinerarySchema, validationHook),
  async (c) => {
    const userId = c.get('userId')!;
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');
    const userService = new UserService(c.env.DB);
    const itineraryService = new ItineraryService(c.env.DB, c.env);

    try {
      if (!await userService.hasBookmark(userId, itineraryId)) {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Saved itinerary not found' } }, 404);
      }
      const snapshot = await itineraryService.publish(itineraryId);
      await userService.publishBookmark(userId, itineraryId, snapshot.id, input);
      return c.json({ success: true, data: { id: snapshot.id } });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (code === 'NOT_FOUND' || code === 'BOOKMARK_NOT_FOUND') {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Saved itinerary not found' } }, 404);
      }
      if (code === 'CANNOT_PUBLISH_SNAPSHOT') {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot publish a shared snapshot' } }, 403);
      }
      throw error;
    }
  },
);

// DELETE /users/me/bookmarks/:itineraryId
// Removes only the current account's saved-itinerary relation. The itinerary remains intact.
users.delete('/me/bookmarks/:itineraryId', userAuthMiddleware, userProfileMiddleware, async (c) => {
  try {
    await new UserService(c.env.DB).unlinkBookmark(c.get('userId')!, c.req.param('itineraryId')!);
    return c.json({ success: true, data: { unlinked: true } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    if (code === 'BOOKMARK_NOT_FOUND') {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Saved itinerary not found' } }, 404);
    }
    if (code === 'PUBLISHED_ITINERARY') {
      return c.json({ success: false, error: { code, message: 'Published itineraries cannot be unlinked' } }, 409);
    }
    throw error;
  }
});

users.delete('/me/bookmarks/:itineraryId/publication', userAuthMiddleware, userProfileMiddleware, async (c) => {
  const removed = await new UserService(c.env.DB).unpublishBookmark(
    c.get('userId')!,
    c.req.param('itineraryId')!,
  );
  if (!removed) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Publication not found' } }, 404);
  }
  return c.json({ success: true, data: { unpublished: true } });
});

// PATCH /users/me/bookmarks/:itineraryId/visibility (認証必須)
users.patch('/me/bookmarks/:itineraryId/visibility', userAuthMiddleware, userProfileMiddleware, zValidator('json', updateVisibilitySchema, validationHook), async (c) => {
  const userId = c.get('userId')!;
  const itineraryId = c.req.param('itineraryId');
  const input = c.req.valid('json');
  const service = new UserService(c.env.DB);
  if (input.is_visible) {
    return c.json({
      success: false,
      error: { code: 'PUBLICATION_METADATA_REQUIRED', message: 'Use the publish endpoint with destination metadata' },
    }, 400);
  }

  const result = await service.updateBookmarkVisibility(userId, itineraryId, false);

  if (!result) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bookmark not found' } }, 404);
  }

  await service.unpublishBookmark(userId, itineraryId);

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

function profileForClient(profile: { username: string; email: string; prefecture: unknown; email_verified: boolean; profile_complete: boolean; created_at: string }) {
  return {
    username: profile.username,
    email: profile.email,
    prefecture: profile.prefecture,
    email_verified: profile.email_verified,
    profile_complete: profile.profile_complete,
    created_at: profile.created_at,
  };
}
