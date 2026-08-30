import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';
import type { Env } from '../utils';
import { validateMemoJson } from '../utils/memo';
import { createPublicMemoSnapshot, createPublicStepSnapshot, createPublicTextSnapshot } from '../utils/publication';
import { hashPassword } from '../utils/password';

const DEFAULT_THEME_ID = 'planning-draft';
const DEFAULT_PALETTE_ID = 'neutral';

export class ItineraryService {
  constructor(private db: D1Database, private env?: Partial<Env>) {}

  async list(): Promise<Itinerary[]> {
    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               COALESCE(f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
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
               COALESCE(f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
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
      palette_id: input.palette_id || DEFAULT_PALETTE_ID,
      packing_enabled: input.packing_enabled ?? true,
      prefecture_slugs: [],
      areas: [],
      tags: [],
      metadata_initialized: false,
      memo,
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
      .prepare('INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.theme_id, itinerary.palette_id, itinerary.packing_enabled ? 1 : 0, '[]', '[]', '[]', 0, itinerary.memo, itinerary.password, itinerary.created_at, itinerary.updated_at)
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
    if (input.palette_id !== undefined) {
      fields.push('palette_id = ?');
      values.push(input.palette_id || DEFAULT_PALETTE_ID);
    }
    if (input.packing_enabled !== undefined) {
      fields.push('packing_enabled = ?');
      values.push(input.packing_enabled ? 1 : 0);
    }
    for (const [field, value] of [
      ['prefecture_slugs', input.prefecture_slugs],
      ['areas', input.areas],
      ['tags', input.tags],
    ] as const) {
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(JSON.stringify(value));
      }
    }
    if (input.metadata_initialized !== undefined) {
      fields.push('metadata_initialized = ?');
      values.push(input.metadata_initialized ? 1 : 0);
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

    return await this.get(id);
  }

  async fork(sourceId: string): Promise<{ itinerary: Itinerary; steps: number }> {
    const source = await this.get(sourceId);
    if (!source) throw new Error('NOT_FOUND');
    if (source.password) throw new Error('FORBIDDEN');

    const newId = generateId();
    const now = getCurrentTimestamp();

    // Fetch source steps before batch to generate new IDs
    // Feature-specific settings are intentionally excluded from forks.
    const sourceSteps = await this.db
      .prepare('SELECT id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day FROM steps WHERE itinerary_id = ? ORDER BY start_at ASC')
      .bind(sourceId)
      .all();

    const rows = sourceSteps.results ?? [];

    // Use batch() for atomic execution: all inserts + fork_count upsert succeed or fail together
    const stepStatements = rows.map(row =>
      this.db
        .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(generateId(), newId, row.title, row.start_at, row.end_at, row.location, row.notes, row.link, row.type, row.is_all_day, now, now)
    );

    await this.db.batch([
      this.db
        .prepare('INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?)')
        .bind(newId, `${source.title}（コピー）`, source.theme_id, source.palette_id ?? DEFAULT_PALETTE_ID, source.packing_enabled !== false ? 1 : 0, JSON.stringify(source.prefecture_slugs ?? []), JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []), source.memo, now, now),
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

    const [sourceSteps, sourceMembers] = await Promise.all([
      this.db
        .prepare('SELECT title, start_at, end_at, location, notes, link, type, is_all_day FROM steps WHERE itinerary_id = ? ORDER BY start_at ASC')
        .bind(sourceId)
        .all(),
      this.db
        .prepare('SELECT name FROM itinerary_members WHERE itinerary_id = ?')
        .bind(sourceId)
        .all<{ name: string }>(),
    ]);
    const memberNames = (sourceMembers.results ?? []).map((member) => member.name);
    const rows = (sourceSteps.results ?? []).map(row => createPublicStepSnapshot(row, this.env, memberNames));
    const publicTitle = createPublicTextSnapshot(source.title, memberNames) || '旅のしおり';
    const publicMemo = createPublicMemoSnapshot(source.memo, memberNames);

    let existing = await this.db
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
      .bind(sourceId)
      .first<{ id: string }>();

    if (!existing) {
      const newId = generateId();
      const stepStatements = rows.map(row =>
        this.db
          .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(generateId(), newId, row.title, row.start_at, row.end_at, row.location, row.notes, row.link, row.type, row.is_all_day, now, now)
      );

      try {
        await this.db.batch([
          this.db
          .prepare('INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?, ?)')
            .bind(newId, publicTitle, source.theme_id, source.palette_id ?? DEFAULT_PALETTE_ID, source.packing_enabled !== false ? 1 : 0, JSON.stringify(source.prefecture_slugs ?? []), JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []), publicMemo, sourceId, now, now),
          ...stepStatements,
        ]);
        return (await this.get(newId))!;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (!msg.includes('UNIQUE constraint failed')) throw e;
        // Concurrent publish race: fall through to update the snapshot created by the other request
        const concurrent = await this.db
          .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
          .bind(sourceId)
          .first<{ id: string }>();
        if (!concurrent) throw e;
        existing = concurrent;
      }
    }

    {
      const sharedId = existing.id;
      const stepStatements = rows.map(row =>
        this.db
          .prepare('INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(generateId(), sharedId, row.title, row.start_at, row.end_at, row.location, row.notes, row.link, row.type, row.is_all_day, now, now)
      );

      await this.db.batch([
        this.db
          .prepare('UPDATE itineraries SET title = ?, theme_id = ?, palette_id = ?, packing_enabled = ?, prefecture_slugs = ?, areas = ?, tags = ?, metadata_initialized = 1, memo = ?, updated_at = ? WHERE id = ?')
          .bind(publicTitle, source.theme_id, source.palette_id ?? DEFAULT_PALETTE_ID, source.packing_enabled !== false ? 1 : 0, JSON.stringify(source.prefecture_slugs ?? []), JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []), publicMemo, now, sharedId),
        this.db
          .prepare('DELETE FROM steps WHERE itinerary_id = ?')
          .bind(sharedId),
        ...stepStatements,
      ]);

      return (await this.get(sharedId))!;
    }
  }

  async delete(id: string): Promise<boolean> {
    // Foreign keys handle dependent rows; a trigger also deletes the published snapshot.
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
      palette_id: (row.palette_id as string) || DEFAULT_PALETTE_ID,
      packing_enabled: row.packing_enabled !== 0,
      prefecture_slugs: this.parseStringArray(row.prefecture_slugs),
      areas: this.parseStringArray(row.areas),
      tags: this.parseStringArray(row.tags),
      metadata_initialized: row.metadata_initialized !== 0,
      memo: row.memo as string,
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

  private parseStringArray(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
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
