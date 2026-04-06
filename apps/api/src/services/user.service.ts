import type {
  User,
  UserPublicProfile,
  UserBookmark,
  UserBookmarkWithItinerary,
  PublicBookmark,
  RegisterInput,
  SyncBookmarksResponse,
  UpdateProfileInput,
  UpdatePasswordInput,
  UpdateProfileResponse,
} from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';
import { hashPassword, verifyPassword } from '../utils/password';

// register/login 用の内部型（id が必要なため UserPublicProfile を拡張）
type UserProfileWithId = UserPublicProfile & { id: string };

export class UserService {
  constructor(private db: D1Database) {}

  async register(input: RegisterInput): Promise<UserProfileWithId> {
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .bind(input.email, input.username)
      .first();

    if (existing) {
      const emailConflict = await this.db
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(input.email)
        .first();
      if (emailConflict) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw new Error('USERNAME_ALREADY_EXISTS');
    }

    const id = generateId();
    const now = getCurrentTimestamp();
    const password_hash = await hashPassword(input.password);

    await this.db
      .prepare(
        'INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(id, input.username, input.email, password_hash, now, now)
      .run();

    return { id, username: input.username, created_at: now };
  }

  async login(email: string, password: string): Promise<UserProfileWithId> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return { id: user.id, username: user.username, created_at: user.created_at };
  }

  async getByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE username = ?')
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

  // 自分の全しおり一覧（公開/非公開含む）
  async getMyBookmarks(userId: string): Promise<UserBookmarkWithItinerary[]> {
    const results = await this.db
      .prepare(`
        SELECT
          ub.user_id, ub.itinerary_id, ub.is_visible, ub.created_at, ub.updated_at,
          i.title, i.theme_id,
          CASE WHEN i.password IS NOT NULL THEN 1 ELSE 0 END as is_password_protected
        FROM user_bookmarks ub
        JOIN itineraries i ON ub.itinerary_id = i.id
        WHERE ub.user_id = ?
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
          AND ub.is_visible = 1
          AND i.password IS NULL
        ORDER BY i.created_at DESC
      `)
      .bind(username)
      .all<PublicBookmark>();

    return results.results ?? [];
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
        .prepare('INSERT OR IGNORE INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at) VALUES (?, ?, 1, ?, ?)')
        .bind(userId, id, now, now)
    );
    const results = await this.db.batch(stmts);

    const synced = results.filter(r => r.meta?.changes && r.meta.changes > 0).length;

    return { synced, skipped: skipped + (validIds.length - synced) };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UpdateProfileResponse> {
    if (input.username !== undefined) {
      if (input.username.length < 3 || input.username.length > 20) {
        throw new Error('USERNAME_INVALID_LENGTH');
      }
      const conflict = await this.db
        .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .bind(input.username, userId)
        .first();
      if (conflict) throw new Error('USERNAME_ALREADY_EXISTS');
    }

    if (input.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        throw new Error('EMAIL_INVALID_FORMAT');
      }
      const conflict = await this.db
        .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .bind(input.email, userId)
        .first();
      if (conflict) throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const now = getCurrentTimestamp();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.username !== undefined) {
      fields.push('username = ?');
      values.push(input.username);
    }
    if (input.email !== undefined) {
      fields.push('email = ?');
      values.push(input.email);
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.db
      .prepare('SELECT username, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<{ username: string; created_at: string }>();

    if (!updated) throw new Error('USER_NOT_FOUND');
    return { username: updated.username, created_at: updated.created_at };
  }

  async updatePassword(userId: string, input: UpdatePasswordInput): Promise<void> {
    const user = await this.db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first<{ password_hash: string }>();

    if (!user) throw new Error('USER_NOT_FOUND');

    const valid = await verifyPassword(input.current_password, user.password_hash);
    if (!valid) throw new Error('INVALID_CURRENT_PASSWORD');

    if (input.new_password.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const now = getCurrentTimestamp();
    const new_hash = await hashPassword(input.new_password);
    await this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(new_hash, now, userId)
      .run();
  }

  async addBookmark(userId: string, itineraryId: string): Promise<UserBookmark> {
    const now = getCurrentTimestamp();
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at) VALUES (?, ?, 1, ?, ?)'
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
