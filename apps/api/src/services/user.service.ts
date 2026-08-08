import type {
  User,
  UserSessionProfile,
  UserBookmark,
  UserBookmarkWithItinerary,
  PublicBookmark,
  PublicFeedItem,
  PublicFeedResponse,
  BootstrapProfileInput,
  SyncBookmarksResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
  UserSearchResult,
} from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { getCurrentTimestamp } from '../utils';

type UserProfileWithId = UserSessionProfile & { id: string };

export class UserService {
  constructor(private db: D1Database) {}

  async bootstrapFirebaseUser(userId: string, email: string, input: BootstrapProfileInput): Promise<UserProfileWithId> {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.getById(userId);
    const now = getCurrentTimestamp();

    if (existing) {
      if (input.username && input.username !== existing.username) await this.assertUsernameAvailable(input.username, userId);
      const fields = ['email = ?', 'email_verified_at = COALESCE(email_verified_at, ?)', 'updated_at = ?'];
      const values: unknown[] = [normalizedEmail, now, now];
      if (input.username) { fields.push('username = ?'); values.push(input.username); }
      if (input.prefecture) { fields.push('prefecture = ?'); values.push(input.prefecture); }
      values.push(userId);

      try {
        await this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      } catch (error) {
        this.rethrowConstraint(error);
      }
    } else {
      if (!input.username || !input.prefecture) throw new Error('PROFILE_SETUP_REQUIRED');
      await this.assertUsernameAvailable(input.username);
      try {
        await this.db.prepare(`INSERT INTO users
          (id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(userId, input.username, normalizedEmail, '!firebase-managed!', input.prefecture, now, now, now)
          .run();
      } catch (error) {
        this.rethrowConstraint(error);
      }
    }

    return this.getSessionProfile(userId);
  }

  async getSessionProfile(userId: string): Promise<UserProfileWithId> {
    const user = await this.getById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    return this.toSessionProfile(user);
  }

  async getByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE username = ? AND email_verified_at IS NOT NULL')
      .bind(username)
      .first<User>();
    return result ?? null;
  }

  async getById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    return result ?? null;
  }

  // 自分の全しおり一覧（公開/非公開含む、元のしおりのみ）
  async getMyBookmarks(userId: string): Promise<UserBookmarkWithItinerary[]> {
    const results = await this.db
      .prepare(`
        SELECT
          ub.user_id, ub.itinerary_id, ub.is_visible, ub.created_at, ub.updated_at,
          i.title, i.theme_id,
          CASE WHEN i.password IS NOT NULL THEN 1 ELSE 0 END as is_password_protected,
          i.updated_at as itinerary_updated_at,
          i.source_itinerary_id,
          (SELECT id FROM itineraries WHERE source_itinerary_id = ub.itinerary_id LIMIT 1) as shared_itinerary_id,
          (SELECT updated_at FROM itineraries WHERE source_itinerary_id = ub.itinerary_id LIMIT 1) as shared_updated_at
        FROM user_bookmarks ub
        JOIN itineraries i ON ub.itinerary_id = i.id
        WHERE ub.user_id = ?
          AND i.source_itinerary_id IS NULL
        ORDER BY ub.created_at DESC
      `)
      .bind(userId)
      .all<Record<string, unknown>>();

    return (results.results ?? []).map(row => ({
      user_id: row.user_id as string,
      itinerary_id: row.itinerary_id as string,
      is_visible: row.is_visible === 1,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      title: row.title as string,
      theme_id: row.theme_id as string,
      is_password_protected: row.is_password_protected === 1,
      itinerary_updated_at: row.itinerary_updated_at as string,
      source_itinerary_id: (row.source_itinerary_id as string | null) ?? null,
      shared_itinerary_id: (row.shared_itinerary_id as string | null) ?? null,
      shared_updated_at: (row.shared_updated_at as string | null) ?? null,
    }));
  }

  // 公開しおり一覧（is_visible:true かつ鍵なし）
  async getPublicBookmarks(username: string): Promise<PublicBookmark[]> {
    const results = await this.db
      .prepare(`
        SELECT
          ub.itinerary_id, i.title, i.theme_id, i.created_at
        FROM user_bookmarks ub
        JOIN itineraries i ON ub.itinerary_id = i.id
        JOIN users u ON ub.user_id = u.id
        WHERE u.username = ?
          AND u.email_verified_at IS NOT NULL
          AND ub.is_visible = 1
          AND i.password IS NULL
          AND i.source_itinerary_id IS NOT NULL
        ORDER BY i.created_at DESC
      `)
      .bind(username)
      .all<PublicBookmark>();

    return results.results ?? [];
  }

  // 全ユーザーの公開しおりフィード（is_visible:true かつ鍵なし、最新順）
  async getPublicFeed(offset: number, limit: number): Promise<PublicFeedResponse> {
    const fetchLimit = limit + 1; // hasMore 判定用に1件多く取得
    const results = await this.db
      .prepare(`
        SELECT
          ub.itinerary_id, i.title, i.theme_id, i.created_at, u.username
        FROM user_bookmarks ub
        JOIN itineraries i ON ub.itinerary_id = i.id
        JOIN users u ON ub.user_id = u.id
        WHERE ub.is_visible = 1
          AND u.email_verified_at IS NOT NULL
          AND i.password IS NULL
          AND i.source_itinerary_id IS NOT NULL
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(fetchLimit, offset)
      .all<PublicFeedItem>();

    const rows = results.results ?? [];
    const hasMore = rows.length > limit;
    return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
  }

  async updateBookmarkVisibility(userId: string, itineraryId: string, isVisible: boolean): Promise<UserBookmark | null> {
    const now = getCurrentTimestamp();
    await this.db
      .prepare('UPDATE user_bookmarks SET is_visible = ?, updated_at = ? WHERE user_id = ? AND itinerary_id = ?')
      .bind(isVisible ? 1 : 0, now, userId, itineraryId)
      .run();

    const result = await this.db
      .prepare('SELECT * FROM user_bookmarks WHERE user_id = ? AND itinerary_id = ?')
      .bind(userId, itineraryId)
      .first<Record<string, unknown>>();

    if (!result) return null;

    return {
      user_id: result.user_id as string,
      itinerary_id: result.itinerary_id as string,
      is_visible: result.is_visible === 1,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    };
  }

  // ログイン時の localStorage→server 同期
  // 存在する itinerary_id のみ user_bookmarks に追加、既存はスキップ（INSERT OR IGNORE で重複排除）
  async syncBookmarks(userId: string, itineraryIds: string[]): Promise<SyncBookmarksResponse> {
    if (itineraryIds.length === 0) return { synced: 0, skipped: 0 };

    const uniqueItineraryIds = Array.from(new Set(itineraryIds));

    // 1. 存在する itinerary を一括確認
    const placeholders = uniqueItineraryIds.map(() => '?').join(', ');
    const existing = await this.db
      .prepare(`SELECT id FROM itineraries WHERE id IN (${placeholders})`)
      .bind(...uniqueItineraryIds)
      .all<{ id: string }>();

    const validIds = (existing.results ?? []).map(r => r.id);
    const skipped = uniqueItineraryIds.length - validIds.length;

    if (validIds.length === 0) return { synced: 0, skipped };

    // 2. INSERT OR IGNORE で一括追加（複合主キーの重複は自動スキップ）
    const now = getCurrentTimestamp();
    const stmts = validIds.map(id =>
      this.db
        .prepare('INSERT OR IGNORE INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
        .bind(userId, id, now, now)
    );
    const results = await this.db.batch(stmts);

    const synced = results.filter(r => r.meta?.changes && r.meta.changes > 0).length;

    return { synced, skipped: skipped + (validIds.length - synced) };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UpdateProfileResponse> {
    const currentUser = await this.getById(userId);
    if (!currentUser) throw new Error('USER_NOT_FOUND');
    if (typeof input.username === 'string') {
      if (input.username.length < 3 || input.username.length > 20) {
        throw new Error('USERNAME_INVALID_LENGTH');
      }
      await this.assertUsernameAvailable(input.username, userId);
    }

    const now = getCurrentTimestamp();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (typeof input.username === 'string') {
      fields.push('username = ?');
      values.push(input.username);
    }
    if (typeof input.prefecture === 'string') {
      fields.push('prefecture = ?');
      values.push(input.prefecture);
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    try {
      await this.db
        .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('UNIQUE constraint failed: users.username')) throw new Error('USERNAME_ALREADY_EXISTS');
      throw err;
    }

    const updated = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!updated) throw new Error('USER_NOT_FOUND');
    return this.toSessionProfile(updated);
  }

  private toSessionProfile(user: User): UserProfileWithId {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      prefecture: user.prefecture,
      email_verified: Boolean(user.email_verified_at),
      profile_complete: Boolean(user.prefecture),
      created_at: user.created_at,
    };
  }

  private async assertUsernameAvailable(username: string, userId?: string): Promise<void> {
    const query = userId
      ? this.db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(username, userId)
      : this.db.prepare('SELECT id FROM users WHERE username = ?').bind(username);
    if (await query.first()) throw new Error('USERNAME_ALREADY_EXISTS');
  }

  private rethrowConstraint(error: unknown): never {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('users.username')) throw new Error('USERNAME_ALREADY_EXISTS');
    if (message.includes('users.email')) throw new Error('EMAIL_ALREADY_EXISTS');
    throw error;
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  async searchUsers(query: string, limit: number = 20): Promise<UserSearchResult[]> {
    const escapedQuery = this.escapeLikePattern(query);
    const results = await this.db
      .prepare("SELECT username, created_at FROM users WHERE email_verified_at IS NOT NULL AND username LIKE ? ESCAPE '\\' LIMIT ?")
      .bind(`%${escapedQuery}%`, limit)
      .all<UserSearchResult>();
    return results.results ?? [];
  }

  async addBookmark(userId: string, itineraryId: string): Promise<UserBookmark> {
    const now = getCurrentTimestamp();
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at) VALUES (?, ?, 0, ?, ?)'
      )
      .bind(userId, itineraryId, now, now)
      .run();

    const result = await this.db
      .prepare('SELECT * FROM user_bookmarks WHERE user_id = ? AND itinerary_id = ?')
      .bind(userId, itineraryId)
      .first<Record<string, unknown>>();

    if (!result) {
      throw new Error('Failed to create bookmark');
    }

    return {
      user_id: result.user_id as string,
      itinerary_id: result.itinerary_id as string,
      is_visible: result.is_visible === 1,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string,
    };
  }
}
