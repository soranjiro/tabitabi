import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class ItineraryService {
  constructor(private db: D1Database) {}

  async list(): Promise<Itinerary[]> {
    const result = await this.db
      .prepare('SELECT * FROM itineraries ORDER BY created_at DESC')
      .all();

    return result.results ? result.results.map(row => this.mapToItinerary(row)) : [];
  }

  async get(id: string): Promise<Itinerary | null> {
    const result = await this.db
      .prepare('SELECT * FROM itineraries WHERE id = ?')
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
      memo: input.memo,
      password: input.password,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare('INSERT INTO itineraries (id, title, theme_id, memo, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.theme_id, itinerary.memo, itinerary.password, itinerary.created_at, itinerary.updated_at)
      .run();

    return itinerary;
  }

  async update(id: string, input: UpdateItineraryInput): Promise<Itinerary | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const now = getCurrentTimestamp();
    const fields = ['updated_at = ?'];
    const values = [now];

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

    return await this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM itineraries WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  private mapToItinerary(row: any): Itinerary {
    return {
      id: row.id,
      title: row.title,
      theme_id: row.theme_id,
      memo: row.memo,
      password: row.password,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
