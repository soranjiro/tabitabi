import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';
import { validateMemoJson } from '../utils/memo';
import { hashPassword } from '../utils/password';

const DEFAULT_THEME_ID = 'standard-autumn';

export class ItineraryService {
  constructor(private db: D1Database) {}

  async list(): Promise<Itinerary[]> {
    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               w.walica_id as walica_id,
               COALESCE(f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        LEFT JOIN itinerary_walica_settings w ON i.id = w.itinerary_id
        LEFT JOIN itinerary_fork_stats f ON i.id = f.itinerary_id
        ORDER BY i.created_at DESC
      `)
      .all();

    return result.results ? result.results.map(row => this.mapToItinerary(row)) : [];
  }

  async get(id: string): Promise<Itinerary | null> {
    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               w.walica_id as walica_id,
               COALESCE(f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        LEFT JOIN itinerary_walica_settings w ON i.id = w.itinerary_id
        LEFT JOIN itinerary_fork_stats f ON i.id = f.itinerary_id
        WHERE i.id = ?
      `)
      .bind(id)
      .first();

    return result ? this.mapToItinerary(result) : null;
  }

  async create(input: CreateItineraryInput): Promise<Itinerary> {
    const id = generateId();
    const now = getCurrentTimestamp();

    const memo = input.memo ?? '{"text":""}';
    const validation = validateMemoJson(memo);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const hashedPassword = input.password ? await hashPassword(input.password) : null;

    const itinerary: Itinerary = {
      id,
      title: input.title,
      theme_id: input.theme_id || DEFAULT_THEME_ID,
      memo,
      walica_id: input.walica_id ?? null,
      password: hashedPassword,
      secret_settings: input.secret_settings ? {
        enabled: input.secret_settings.enabled,
        offset_minutes: input.secret_settings.offset_minutes
      } : null,
      fork_count: 0,
      created_at: now,
      updated_at: now,
    };

    // Insert into main table
    await this.db
      .prepare('INSERT INTO itineraries (id, title, theme_id, memo, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.theme_id, itinerary.memo, itinerary.password, itinerary.created_at, itinerary.updated_at)
      .run();

    // Insert into secrets table if settings exist
    if (itinerary.secret_settings) {
      await this.db
        .prepare('INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(
          itinerary.id,
          itinerary.secret_settings.enabled ? 1 : 0,
          itinerary.secret_settings.offset_minutes,
          now,
          now
        )
        .run();
    }

    // Insert into walica table if exists
    if (itinerary.walica_id) {
      await this.db
        .prepare('INSERT INTO itinerary_walica_settings (itinerary_id, walica_id, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .bind(itinerary.id, itinerary.walica_id, now, now)
        .run();
    }

    return itinerary;
  }

  async update(id: string, input: UpdateItineraryInput): Promise<Itinerary | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const now = getCurrentTimestamp();
    const fields = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.theme_id !== undefined) {
      fields.push('theme_id = ?');
      values.push(input.theme_id || DEFAULT_THEME_ID);
    }
    if (input.memo !== undefined) {
      const validation = validateMemoJson(input.memo);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      fields.push('memo = ?');
      values.push(input.memo);
    }
    if (input.password !== undefined) {
      fields.push('password = ?');
      const hashedPassword = input.password ? await hashPassword(input.password) : null;
      values.push(hashedPassword);
    }

    if (fields.length > 1) {
      values.push(id);
      await this.db
        .prepare(`UPDATE itineraries SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    // Handle secret settings update
    if (input.secret_settings !== undefined) {
      if (input.secret_settings === null) {
        // Remove settings
        await this.db
          .prepare('DELETE FROM itinerary_secrets WHERE itinerary_id = ?')
          .bind(id)
          .run();
      } else {
        // Upsert settings
        await this.db
          .prepare(`
            INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(itinerary_id) DO UPDATE SET
            enabled = excluded.enabled,
            offset_minutes = excluded.offset_minutes,
            updated_at = excluded.updated_at
          `)
          .bind(
            id,
            input.secret_settings.enabled ? 1 : 0,
            input.secret_settings.offset_minutes,
            now,
            now
          )
          .run();
      }
    }

    // Handle walica settings update
    if (input.walica_id !== undefined) {
      if (input.walica_id === null) {
        // Remove settings
        await this.db
          .prepare('DELETE FROM itinerary_walica_settings WHERE itinerary_id = ?')
          .bind(id)
          .run();
      } else {
        // Upsert settings
        await this.db
          .prepare(`
            INSERT INTO itinerary_walica_settings (itinerary_id, walica_id, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(itinerary_id) DO UPDATE SET
            walica_id = excluded.walica_id,
            updated_at = excluded.updated_at
          `)
          .bind(id, input.walica_id, now, now)
          .run();
      }
    }

    return await this.get(id);
  }

  async fork(sourceId: string): Promise<{ itinerary: Itinerary; steps: number }> {
    const source = await this.get(sourceId);
    if (!source) throw new Error('NOT_FOUND');
    if (source.password) throw new Error('FORBIDDEN');

    const newId = generateId();
    const now = getCurrentTimestamp();

    // Fetch source steps before batch to generate new IDs
    // secret_settings and walica_id are intentionally excluded from forks (personal configuration)
    const sourceSteps = await this.db
      .prepare('SELECT id, itinerary_id, title, start_at, end_at, location, notes, type, is_all_day FROM steps WHERE itinerary_id = ? ORDER BY start_at ASC')
      .bind(sourceId)
      .all();

    const rows = sourceSteps.results ?? [];

    // Use batch() for atomic execution: all inserts + fork_count upsert succeed or fail together
    const stepStatements = rows.map(row =>
      this.db
        .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(generateId(), newId, row.title, row.start_at, row.end_at, row.location, row.notes, row.type, row.is_all_day, now, now)
    );

    await this.db.batch([
      this.db
        .prepare('INSERT INTO itineraries (id, title, theme_id, memo, password, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)')
        .bind(newId, `${source.title}（コピー）`, source.theme_id, source.memo, now, now),
      ...stepStatements,
      // Upsert fork_count in the dedicated stats table
      this.db
        .prepare(`
          INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
          VALUES (?, 1)
          ON CONFLICT(itinerary_id) DO UPDATE SET fork_count = fork_count + 1
        `)
        .bind(sourceId),
    ]);

    const forked = await this.get(newId);
    return { itinerary: forked!, steps: rows.length };
  }

  async publish(sourceId: string): Promise<Itinerary> {
    const source = await this.get(sourceId);
    if (!source) throw new Error('NOT_FOUND');
    if (source.source_itinerary_id) throw new Error('CANNOT_PUBLISH_SNAPSHOT');

    const now = getCurrentTimestamp();

    const sourceSteps = await this.db
      .prepare('SELECT title, start_at, end_at, location, notes, type, is_all_day FROM steps WHERE itinerary_id = ? ORDER BY start_at ASC')
      .bind(sourceId)
      .all();
    const rows = sourceSteps.results ?? [];

    const existing = await this.db
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
      .bind(sourceId)
      .first<{ id: string }>();

    if (!existing) {
      const newId = generateId();
      const stepStatements = rows.map(row =>
        this.db
          .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(generateId(), newId, row.title, row.start_at, row.end_at, row.location, row.notes, row.type, row.is_all_day, now, now)
      );

      await this.db.batch([
        this.db
          .prepare('INSERT INTO itineraries (id, title, theme_id, memo, password, source_itinerary_id, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)')
          .bind(newId, source.title, source.theme_id, source.memo, sourceId, now, now),
        ...stepStatements,
      ]);

      return (await this.get(newId))!;
    } else {
      const sharedId = existing.id;
      const stepStatements = rows.map(row =>
        this.db
          .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(generateId(), sharedId, row.title, row.start_at, row.end_at, row.location, row.notes, row.type, row.is_all_day, now, now)
      );

      await this.db.batch([
        this.db
          .prepare('UPDATE itineraries SET title = ?, theme_id = ?, memo = ?, updated_at = ? WHERE id = ?')
          .bind(source.title, source.theme_id, source.memo, now, sharedId),
        this.db
          .prepare('DELETE FROM steps WHERE itinerary_id = ?')
          .bind(sharedId),
        ...stepStatements,
      ]);

      return (await this.get(sharedId))!;
    }
  }

  async delete(id: string): Promise<boolean> {
    // Foreign key cascade handles secrets, walica, and fork_stats tables
    const result = await this.db
      .prepare('DELETE FROM itineraries WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  private mapToItinerary(row: Record<string, unknown>): Itinerary {
    const itinerary: Itinerary = {
      id: row.id as string,
      title: row.title as string,
      theme_id: row.theme_id as string,
      memo: row.memo as string,
      walica_id: row.walica_id as string | null | undefined,
      password: row.password as string | null | undefined,
      fork_count: (row.fork_count as number) ?? 0,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    if (row.secret_enabled !== null && row.secret_enabled !== undefined) {
      itinerary.secret_settings = {
        enabled: row.secret_enabled === 1,
        offset_minutes: row.secret_offset as number,
      };
    }

    if (row.source_itinerary_id) {
      itinerary.source_itinerary_id = row.source_itinerary_id as string;
    }

    return itinerary;
  }

  // フロントエンド用：パスワード除外したレスポンスを返す
  toResponseItinerary(itinerary: Itinerary) {
    const { password: _, ...rest } = itinerary;
    return {
      ...rest,
      is_password_protected: !!itinerary.password,
    };
  }
}
