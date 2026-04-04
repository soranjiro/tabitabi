import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import { STEP_TYPE } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';
import { validateMemoJson } from '../utils/memo';

function parseToUnixMs(value: unknown): number | null {
  // Only accept numeric Unix timestamps in milliseconds.
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

export class StepService {
  constructor(private db: D1Database) {}

  async list(itineraryId: string, options?: { currentTime?: number; offsetMinutes?: number; maskSecrets?: boolean }): Promise<Step[]> {
    let query = 'SELECT * FROM steps WHERE itinerary_id = ?';
    const bindings: (string | number)[] = [itineraryId];

    if (options?.currentTime && options?.offsetMinutes !== undefined) {
      query = `
        SELECT *,
        (start_at > ? + ? * 60000) as is_hidden_flag
        FROM steps
        WHERE itinerary_id = ?
      `;

      bindings.length = 0;
      bindings.push(options.currentTime);
      bindings.push(options.offsetMinutes);
      bindings.push(itineraryId);
    }

    query += ' ORDER BY start_at ASC';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all();

    return (result.results || []).map(row => this.mapToStep(row, options?.maskSecrets));
  }

  async get(stepId: string): Promise<Step | null> {
    const result = await this.db
      .prepare('SELECT * FROM steps WHERE id = ?')
      .bind(stepId)
      .first();

    return result ? this.mapToStep(result) : null;
  }

  async create(input: CreateStepInput): Promise<Step> {
    const id = generateId();
    const now = getCurrentTimestamp();

    const notes = input.notes ?? '{"text":""}';
    const validation = validateMemoJson(notes);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const startAt = parseToUnixMs(input.start_at);
    if (startAt === null) {
      throw new Error('start_at is required and must be a numeric timestamp (milliseconds)');
    }
    const endAt = input.end_at !== undefined ? parseToUnixMs(input.end_at) : startAt + 60 * 60 * 1000;
    if (endAt === null) {
      throw new Error('end_at must be a numeric timestamp (milliseconds)');
    }

    const step: Step = {
      id,
      itinerary_id: input.itinerary_id,
      title: input.title,
      start_at: startAt,
      end_at: endAt!,
      location: input.location ?? null,
      notes,
      type: input.type ?? STEP_TYPE.NORMAL_GENERAL,
      is_all_day: input.is_all_day ?? false,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare(
        'INSERT INTO steps (id, itinerary_id, title, start_at, end_at, location, notes, type, is_all_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        step.id,
        step.itinerary_id,
        step.title,
        step.start_at,
        step.end_at,
        step.location,
        step.notes,
        step.type,
        step.is_all_day ? 1 : 0,
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
    const values: (string | number | null)[] = [now];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.start_at !== undefined) {
      const startAt = parseToUnixMs(input.start_at);
      if (startAt !== null) {
        fields.push('start_at = ?');
        values.push(startAt);
      }
    }
    if (input.end_at !== undefined) {
      const endAt = parseToUnixMs(input.end_at);
      if (endAt !== null) {
        fields.push('end_at = ?');
        values.push(endAt);
      }
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location);
    }
    if (input.notes !== undefined) {
      const notes = input.notes ?? '{"text":""}';
      const validation = validateMemoJson(notes);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      fields.push('notes = ?');
      values.push(notes);
    }
    if (input.type !== undefined) {
      fields.push('type = ?');
      values.push(input.type);
    }
    if (input.is_all_day !== undefined) {
      fields.push('is_all_day = ?');
      values.push(input.is_all_day ? 1 : 0);
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

  private mapToStep(row: Record<string, unknown>, maskSecrets: boolean = true): Step {
    const step: Step = {
      id: row.id as string,
      itinerary_id: row.itinerary_id as string,
      title: row.title as string,
      start_at: row.start_at as number,
      end_at: row.end_at as number,
      location: row.location as string | null,
      notes: row.notes as string,
      type: (row.type as any) ?? STEP_TYPE.NORMAL_GENERAL,
      is_all_day: !!(row.is_all_day as number),
      is_hidden: !!row.is_hidden_flag,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    if (step.is_hidden && maskSecrets) {
      step.title = '?????';
      step.location = null;
      step.notes = '{"text":""}';
    }

    return step;
  }
}
