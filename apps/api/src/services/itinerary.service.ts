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
      createdAt: now,
    };

    await this.db
      .prepare('INSERT INTO itineraries (id, title, created_at) VALUES (?, ?, ?)')
      .bind(itinerary.id, itinerary.title, itinerary.createdAt)
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

    await this.db
      .prepare('UPDATE itineraries SET title = ? WHERE id = ?')
      .bind(updated.title, id)
      .run();

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
      createdAt: row.created_at,
    };
  }
}
