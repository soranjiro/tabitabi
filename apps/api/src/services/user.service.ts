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
          (SELECT updated_at FROM itineraries WHERE source_itinerary_id = ub.itinerary_id LIMIT 1) as shared_updated_at,
          i.prefecture_slugs,
          i.areas,
          i.tags,
          CASE WHEN publication.source_itinerary_id IS NULL THEN 0 ELSE 1 END as is_published
        FROM user_bookmarks ub
        JOIN itineraries i ON ub.itinerary_id = i.id
        LEFT JOIN itinerary_publications publication
          ON publication.source_itinerary_id = ub.itinerary_id
         AND publication.user_id = ub.user_id
        WHERE ub.user_id = ?
          AND i.source_itinerary_id IS NULL
        ORDER BY ub.created_at DESC
      `)
      .bind(userId)
      .all<Record<string, unknown>>();

    return (results.results ?? []).map(row => ({
      user_id: row.user_id as string,
      itinerary_id: row.itinerary_id as string,
      is_visible: row.is_published === 1,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      title: row.title as string,
      theme_id: row.theme_id as string,
      is_password_protected: row.is_password_protected === 1,
      itinerary_updated_at: row.itinerary_updated_at as string,
      source_itinerary_id: (row.source_itinerary_id as string | null) ?? null,
      shared_itinerary_id: (row.shared_itinerary_id as string | null) ?? null,
      shared_updated_at: (row.shared_updated_at as string | null) ?? null,
      prefecture_slugs: this.parseStringArray(row.prefecture_slugs),
      areas: this.parseStringArray(row.areas),
      tags: this.parseStringArray(row.tags),
    }));
  }

  // 公開しおり一覧（is_visible:true かつ鍵なし）
  async getPublicBookmarks(username: string): Promise<PublicBookmark[]> {
    const results = await this.db
      .prepare(`
        SELECT
          publication.shared_itinerary_id as itinerary_id,
          i.title, i.theme_id, publication.published_at as created_at,
          publication.prefecture_slugs, publication.areas, publication.tags,
          (SELECT COUNT(*) FROM steps WHERE itinerary_id = i.id) as stops,
          COALESCE(stats.fork_count, 0) as copies,
          (SELECT MIN(start_at) FROM steps WHERE itinerary_id = i.id) as start_at,
          (SELECT MAX(end_at) FROM steps WHERE itinerary_id = i.id) as end_at,
          '' as description
        FROM itinerary_publications publication
        JOIN itineraries i ON i.id = publication.shared_itinerary_id
        JOIN users u ON publication.user_id = u.id
        LEFT JOIN itinerary_fork_stats stats ON stats.itinerary_id = i.id
        WHERE u.username = ?
          AND u.email_verified_at IS NOT NULL
          AND i.password IS NULL
          AND i.source_itinerary_id IS NOT NULL
        ORDER BY publication.published_at DESC
      `)
      .bind(username)
      .all<PublicBookmark>();

    return (results.results ?? []).map((row) => this.mapPublicBookmark(row as unknown as Record<string, unknown>));
  }

  // 全ユーザーの公開しおりフィード（is_visible:true かつ鍵なし、最新順）
  async getPublicFeed(
    offset: number,
    limit: number,
    filters: { prefecture?: string; tag?: string } = {},
  ): Promise<PublicFeedResponse> {
    const fetchLimit = limit + 1; // hasMore 判定用に1件多く取得
    const conditions = [
      'u.email_verified_at IS NOT NULL',
      'i.password IS NULL',
      'i.source_itinerary_id IS NOT NULL',
    ];
    const values: string[] = [];
    if (filters.prefecture) {
      conditions.push('EXISTS (SELECT 1 FROM json_each(publication.prefecture_slugs) WHERE value = ?)');
      values.push(filters.prefecture);
    }
    if (filters.tag) {
      conditions.push('EXISTS (SELECT 1 FROM json_each(publication.tags) WHERE value = ?)');
      values.push(filters.tag);
    }
    const where = conditions.join(' AND ');
    const results = await this.db
      .prepare(`
        SELECT
          publication.shared_itinerary_id as itinerary_id,
          i.title, i.theme_id, publication.published_at as created_at, u.username,
          publication.prefecture_slugs, publication.areas, publication.tags,
          (SELECT COUNT(*) FROM steps WHERE itinerary_id = i.id) as stops,
          COALESCE(stats.fork_count, 0) as copies,
          (SELECT MIN(start_at) FROM steps WHERE itinerary_id = i.id) as start_at,
          (SELECT MAX(end_at) FROM steps WHERE itinerary_id = i.id) as end_at,
          '' as description
        FROM itinerary_publications publication
        JOIN itineraries i ON i.id = publication.shared_itinerary_id
        JOIN users u ON publication.user_id = u.id
        LEFT JOIN itinerary_fork_stats stats ON stats.itinerary_id = i.id
        WHERE ${where}
        ORDER BY publication.published_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, fetchLimit, offset)
      .all<Record<string, unknown>>();

    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total
      FROM itinerary_publications publication
      JOIN itineraries i ON i.id = publication.shared_itinerary_id
      JOIN users u ON publication.user_id = u.id
      WHERE ${where}
    `).bind(...values).first<{ total: number }>();

    const destinationResults = await this.db.prepare(`
      SELECT destination.value as slug, COUNT(*) as count
      FROM itinerary_publications publication, json_each(publication.prefecture_slugs) destination
      JOIN itineraries i ON i.id = publication.shared_itinerary_id
      JOIN users u ON publication.user_id = u.id
      WHERE u.email_verified_at IS NOT NULL
        AND i.password IS NULL
        AND i.source_itinerary_id IS NOT NULL
      GROUP BY destination.value
    `).all<{ slug: string; count: number }>();

    const rows = results.results ?? [];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      ...this.mapPublicBookmark(row),
      username: row.username as string,
    } satisfies PublicFeedItem));
    const destinationCounts = Object.fromEntries(
      (destinationResults.results ?? []).map((row) => [row.slug, Number(row.count)]),
    );
    return { items, hasMore, total: Number(countResult?.total ?? 0), destinationCounts };
  }

  // 自分がお気に入りに登録した、現在公開中のしおり一覧
  async getFavoriteItineraries(userId: string): Promise<PublicFeedItem[]> {
    const results = await this.db.prepare(`
      SELECT
        publication.shared_itinerary_id as itinerary_id,
        i.title, i.theme_id, publication.published_at as created_at, u.username,
        publication.prefecture_slugs, publication.areas, publication.tags,
        (SELECT COUNT(*) FROM steps WHERE itinerary_id = i.id) as stops,
        COALESCE(stats.fork_count, 0) as copies,
        (SELECT MIN(start_at) FROM steps WHERE itinerary_id = i.id) as start_at,
        (SELECT MAX(end_at) FROM steps WHERE itinerary_id = i.id) as end_at,
        '' as description
      FROM itinerary_favorites favorite
      JOIN itineraries i ON i.id = favorite.itinerary_id
      JOIN itinerary_publications publication
        ON publication.shared_itinerary_id = i.id
      JOIN users u ON u.id = publication.user_id
      LEFT JOIN itinerary_fork_stats stats ON stats.itinerary_id = i.id
      WHERE favorite.user_id = ?
        AND u.email_verified_at IS NOT NULL
        AND i.password IS NULL
        AND i.source_itinerary_id IS NOT NULL
      ORDER BY favorite.created_at DESC
    `).bind(userId).all<Record<string, unknown>>();

    return (results.results ?? []).map((row) => ({
      ...this.mapPublicBookmark(row),
      username: row.username as string,
    } satisfies PublicFeedItem));
  }

  async publishBookmark(
    userId: string,
    sourceItineraryId: string,
    sharedItineraryId: string,
  ): Promise<void> {
    const bookmark = await this.db.prepare(
      'SELECT 1 FROM user_bookmarks WHERE user_id = ? AND itinerary_id = ?',
    ).bind(userId, sourceItineraryId).first();
    if (!bookmark) throw new Error('BOOKMARK_NOT_FOUND');

    const metadata = await this.db.prepare(
      'SELECT prefecture_slugs, areas, tags FROM itineraries WHERE id = ?',
    ).bind(sourceItineraryId).first<Record<string, unknown>>();
    if (!metadata) throw new Error('BOOKMARK_NOT_FOUND');
    const now = getCurrentTimestamp();
    const prefectureSlugs = String(metadata.prefecture_slugs ?? '[]');
    const areas = String(metadata.areas ?? '[]');
    const tags = String(metadata.tags ?? '[]');
    await this.db.batch([
      this.db.prepare(`
        INSERT INTO itinerary_publications (
          source_itinerary_id, shared_itinerary_id, user_id,
          prefecture_slugs, areas, tags, published_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_itinerary_id, user_id) DO UPDATE SET
          shared_itinerary_id = excluded.shared_itinerary_id,
          prefecture_slugs = excluded.prefecture_slugs,
          areas = excluded.areas,
          tags = excluded.tags,
          updated_at = excluded.updated_at
      `).bind(
        sourceItineraryId,
        sharedItineraryId,
        userId,
        prefectureSlugs,
        areas,
        tags,
        now,
        now,
      ),
      this.db.prepare(
        `UPDATE user_bookmarks SET is_visible = 1, updated_at = ?
         WHERE user_id = ? AND itinerary_id = ?`,
      ).bind(now, userId, sourceItineraryId),
    ]);
  }

  async hasBookmark(userId: string, itineraryId: string): Promise<boolean> {
    const bookmark = await this.db.prepare(
      'SELECT 1 FROM user_bookmarks WHERE user_id = ? AND itinerary_id = ?',
    ).bind(userId, itineraryId).first();
    return Boolean(bookmark);
  }

  async unlinkBookmark(userId: string, itineraryId: string): Promise<void> {
    const bookmark = await this.db.prepare(`
      SELECT
        i.source_itinerary_id,
        EXISTS(
          SELECT 1 FROM itinerary_publications publication
          WHERE publication.user_id = ub.user_id
            AND publication.source_itinerary_id = ub.itinerary_id
        ) AS is_published
      FROM user_bookmarks ub
      JOIN itineraries i ON i.id = ub.itinerary_id
      WHERE ub.user_id = ? AND ub.itinerary_id = ?
    `).bind(userId, itineraryId).first<{ source_itinerary_id: string | null; is_published: number }>();

    if (!bookmark) throw new Error('BOOKMARK_NOT_FOUND');
    if (bookmark.source_itinerary_id || bookmark.is_published === 1) {
      throw new Error('PUBLISHED_ITINERARY');
    }

    await this.db.prepare(
      'DELETE FROM user_bookmarks WHERE user_id = ? AND itinerary_id = ?',
    ).bind(userId, itineraryId).run();
  }

  async unpublishBookmark(userId: string, sourceItineraryId: string): Promise<boolean> {
    const now = getCurrentTimestamp();
    const [deleted] = await this.db.batch([
      this.db.prepare(
        'DELETE FROM itinerary_publications WHERE user_id = ? AND source_itinerary_id = ?',
      ).bind(userId, sourceItineraryId),
      this.db.prepare(
        'UPDATE user_bookmarks SET is_visible = 0, updated_at = ? WHERE user_id = ? AND itinerary_id = ?',
      ).bind(now, userId, sourceItineraryId),
    ]);
    return Number(deleted.meta?.changes ?? 0) > 0;
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
      prefecture_slugs: this.parseStringArray(result.prefecture_slugs),
      areas: this.parseStringArray(result.areas),
      tags: this.parseStringArray(result.tags),
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
      .prepare(`SELECT id FROM itineraries WHERE id IN (${placeholders}) AND source_itinerary_id IS NULL`)
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

  private parseStringArray(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private mapPublicBookmark(row: Record<string, unknown>): PublicBookmark {
    return {
      itinerary_id: row.itinerary_id as string,
      title: row.title as string,
      theme_id: row.theme_id as string,
      created_at: row.created_at as string,
      prefecture_slugs: this.parseStringArray(row.prefecture_slugs),
      areas: this.parseStringArray(row.areas),
      tags: this.parseStringArray(row.tags),
      stops: Number(row.stops ?? 0),
      copies: Number(row.copies ?? 0),
      start_at: row.start_at == null ? null : Number(row.start_at),
      end_at: row.end_at == null ? null : Number(row.end_at),
      description: typeof row.description === 'string' ? row.description : '',
    };
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
      prefecture_slugs: [],
      areas: [],
      tags: [],
    };
  }
}
