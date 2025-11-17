import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class StepService {
  constructor(private db: D1Database) {}

  async list(itineraryId: string): Promise<Step[]> {
    const result = await this.db
      .prepare('SELECT * FROM steps WHERE itinerary_id = ? ORDER BY date ASC, time ASC')
      .bind(itineraryId)
      .all();

    return (result.results || []).map(row => this.mapToStep(row));
  }

  async get(stepId: string): Promise<Step | null> {
    const result = await this.db
      .prepare('SELECT * FROM steps WHERE id = ?')
      .bind(stepId)
      .first();

    return result ? this.mapToStep(result) : null;
  }

  async create(input: CreateStepInput): Promise<Step> {
    const id = generateId(32);
    const now = getCurrentTimestamp();

    const step: Step = {
      id,
      itinerary_id: input.itinerary_id,
      title: input.title,
      date: input.date,
      time: input.time,
      location: input.location ?? null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare(
        'INSERT INTO steps (id, itinerary_id, title, date, time, location, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        step.id,
        step.itinerary_id,
        step.title,
        step.date,
        step.time,
        step.location,
        step.notes,
        step.created_at,
        step.updated_at
      )
      .run();

    return step;
  }

  async update(stepId: string, input: UpdateStepInput): Promise<Step | null> {
    const existing = await this.get(stepId);
    if (!existing) return null;

    const now = getCurrentTimestamp();
    const fields = ['updated_at = ?'];
    const values: any[] = [now];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.date !== undefined) {
      fields.push('date = ?');
      values.push(input.date);
    }
    if (input.time !== undefined) {
      fields.push('time = ?');
      values.push(input.time);
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location);
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?');
      values.push(input.notes);
    }

    values.push(stepId);
    await this.db
      .prepare(`UPDATE steps SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return await this.get(stepId);
  }

  async delete(stepId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM steps WHERE id = ?')
      .bind(stepId)
      .run();

    return result.success;
  }

  private mapToStep(row: any): Step {
    return {
      id: row.id,
      itinerary_id: row.itinerary_id,
      title: row.title,
      date: row.date,
      time: row.time,
      location: row.location,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
