import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class ItineraryService {
  constructor(private db: D1Database) {}

  async list(): Promise<Itinerary[]> {
    const result = await this.db
      .prepare(`
        SELECT i.*, s.enabled as secret_enabled, s.offset_minutes as secret_offset
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        ORDER BY i.created_at DESC
      `)
      .all();

    return result.results ? result.results.map(row => this.mapToItinerary(row)) : [];
  }

  async get(id: string): Promise<Itinerary | null> {
    const result = await this.db
      .prepare(`
        SELECT i.*, s.enabled as secret_enabled, s.offset_minutes as secret_offset
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        WHERE i.id = ?
      `)
      .bind(id)
      .first();

    return result ? this.mapToItinerary(result) : null;
  }

  async create(input: CreateItineraryInput): Promise<Itinerary> {
    const id = generateId(32);
    const now = getCurrentTimestamp();

    const itinerary: Itinerary = {
      id,
      title: input.title,
      theme_id: input.theme_id || 'minimal',
      memo: input.memo ?? null,
      walica_id: input.walica_id ?? null,
      password: input.password ?? null,
      secret_settings: input.secret_settings ? {
        enabled: input.secret_settings.enabled,
        offset_minutes: input.secret_settings.offset_minutes
      } : null,
      created_at: now,
      updated_at: now,
    };

    // Insert into main table
    await this.db
      .prepare('INSERT INTO itineraries (id, title, theme_id, memo, walica_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.theme_id, itinerary.memo, itinerary.walica_id, itinerary.password, itinerary.created_at, itinerary.updated_at)
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
    const values: any[] = [now];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.theme_id !== undefined) {
      fields.push('theme_id = ?');
      values.push(input.theme_id);
    }
    if (input.memo !== undefined) {
      fields.push('memo = ?');
      values.push(input.memo);
    }
    if (input.walica_id !== undefined) {
      fields.push('walica_id = ?');
      values.push(input.walica_id);
    }
    if (input.password !== undefined) {
      fields.push('password = ?');
      values.push(input.password);
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

  async delete(id: string): Promise<boolean> {
    // Foreign key cascade should handle the secrets table, but let's be safe or rely on DB
    // Since we defined ON DELETE CASCADE in migration, deleting from itineraries is enough.
    const result = await this.db
      .prepare('DELETE FROM itineraries WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  private mapToItinerary(row: any): Itinerary {
    const itinerary: Itinerary = {
      id: row.id,
      title: row.title,
      theme_id: row.theme_id,
      memo: row.memo,
      walica_id: row.walica_id,
      password: row.password,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    if (row.secret_enabled !== null && row.secret_enabled !== undefined) {
      itinerary.secret_settings = {
        enabled: row.secret_enabled === 1,
        offset_minutes: row.secret_offset
      };
    }

    return itinerary;
  }
}
