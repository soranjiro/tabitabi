import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class StepService {
  constructor(private db: D1Database) {}

  async list(itineraryId: string): Promise<Step[]> {
    const result = await this.db
      .prepare('SELECT * FROM steps WHERE itinerary_id = ? ORDER BY order_num ASC')
      .bind(itineraryId)
      .all();

    return (result.results || []).map(row => this.mapToStep(row));
  }

  async create(itineraryId: string, input: CreateStepInput): Promise<Step> {
    const id = generateId(12);
    const now = getCurrentTimestamp();

    // 次の順番を取得
    const maxOrder = await this.db
      .prepare('SELECT MAX(order_num) as max_order FROM steps WHERE itinerary_id = ?')
      .bind(itineraryId)
      .first<{ max_order: number | null }>();

    const orderNum = (maxOrder?.max_order || 0) + 1;

    const step: Step = {
      id,
      itineraryId,
      orderNum,
      title: input.title,
      time: input.time ?? null,
      location: input.location ?? null,
      note: input.note ?? null,
      createdAt: now,
    };

    await this.db
      .prepare(
        'INSERT INTO steps (id, itinerary_id, order_num, title, time, location, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        step.id,
        step.itineraryId,
        step.orderNum,
        step.title,
        step.time ?? null,
        step.location ?? null,
        step.note ?? null,
        step.createdAt
      )
      .run();

    return step;
  }

  async update(stepId: string, input: UpdateStepInput): Promise<Step | null> {
    const existing = await this.db
      .prepare('SELECT * FROM steps WHERE id = ?')
      .bind(stepId)
      .first();

    if (!existing) return null;

    const updated: Step = {
      ...this.mapToStep(existing),
      ...input,
    };

    await this.db
      .prepare(
        'UPDATE steps SET title = ?, time = ?, location = ?, note = ? WHERE id = ?'
      )
      .bind(updated.title, updated.time, updated.location, updated.note, stepId)
      .run();

    return updated;
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
      itineraryId: row.itinerary_id,
      orderNum: row.order_num,
      title: row.title,
      time: row.time,
      location: row.location,
      note: row.note,
      createdAt: row.created_at,
    };
  }
}
