import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class ItineraryService {
  constructor(private db: D1Database) {}

  async get(id: string): Promise<Itinerary | null> {
    const result = await this.db
      .prepare('SELECT * FROM itineraries WHERE id = ?')
      .bind(id)
      .first();

    return result ? this.mapToItinerary(result) : null;
  }

  async create(input: CreateItineraryInput): Promise<Itinerary> {
    const id = generateId(8);
    const now = getCurrentTimestamp();

    const itinerary: Itinerary = {
      id,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      themeId: input.themeId || 'standard',
      createdAt: now,
    };

    await this.db
      .prepare('INSERT INTO itineraries (id, title, start_date, end_date, theme_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.startDate, itinerary.endDate, itinerary.themeId, itinerary.createdAt)
      .run();

    return itinerary;
  }

  async update(id: string, input: UpdateItineraryInput): Promise<Itinerary | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: Itinerary = {
      ...existing,
      ...input,
    };

    const fields = [];
    const values = [];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.startDate !== undefined) {
      fields.push('start_date = ?');
      values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      fields.push('end_date = ?');
      values.push(input.endDate);
    }
    if (input.themeId !== undefined) {
      fields.push('theme_id = ?');
      values.push(input.themeId);
    }

    if (fields.length > 0) {
      values.push(id);
      await this.db
        .prepare(`UPDATE itineraries SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return updated;
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
      startDate: row.start_date,
      endDate: row.end_date,
      themeId: row.theme_id,
      createdAt: row.created_at,
    };
  }
}
