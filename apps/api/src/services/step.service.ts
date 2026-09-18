import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import { STEP_TYPE } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

function parseToUnixMs(value: unknown): number | null {
  // Only accept numeric Unix timestamps in milliseconds.
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function normalizeLink(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
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

    query += ' ORDER BY start_at IS NULL, start_at ASC, sort_order ASC, created_at ASC';

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

    const startAt = parseToUnixMs(input.start_at);
    const endAt = input.end_at !== undefined
      ? parseToUnixMs(input.end_at)
      : startAt === null ? null : startAt + 60 * 60 * 1000;
    this.assertDates(startAt, endAt);
    this.assertTimeState(startAt, input.time_unspecified ?? false, input.is_all_day ?? false);
    this.assertPin(input.pin_latitude ?? null, input.pin_longitude ?? null);

    const step: Step = {
      id,
      itinerary_id: input.itinerary_id,
      title: input.title,
      start_at: startAt,
      end_at: endAt,
      time_unspecified: input.time_unspecified ?? false,
      location: input.location ?? null,
      notes: input.notes ?? '',
      link: normalizeLink(input.link),
      type: input.type ?? STEP_TYPE.NORMAL_GENERAL,
      is_all_day: input.is_all_day ?? false,
      pin_latitude: input.pin_latitude ?? null,
      pin_longitude: input.pin_longitude ?? null,
      is_priority: input.is_priority ?? false,
      sort_order: input.sort_order ?? null,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare(
        `INSERT INTO steps (id, itinerary_id, title, start_at, end_at, time_unspecified,
          location, notes, link, type, is_all_day, pin_latitude, pin_longitude,
          is_priority, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        step.id,
        step.itinerary_id,
        step.title,
        step.start_at,
        step.end_at,
        step.time_unspecified ? 1 : 0,
        step.location,
        step.notes,
        step.link,
        step.type,
        step.is_all_day ? 1 : 0,
        step.pin_latitude,
        step.pin_longitude,
        step.is_priority ? 1 : 0,
        step.sort_order,
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

    const nextStart = input.start_at === undefined ? existing.start_at : parseToUnixMs(input.start_at);
    const nextEnd = input.end_at === undefined ? existing.end_at : parseToUnixMs(input.end_at);
    this.assertDates(nextStart, nextEnd);
    this.assertTimeState(nextStart,
      input.time_unspecified === undefined ? Boolean(existing.time_unspecified) : input.time_unspecified,
      input.is_all_day === undefined ? Boolean(existing.is_all_day) : input.is_all_day);
    const nextLatitude = input.pin_latitude === undefined ? existing.pin_latitude ?? null : input.pin_latitude;
    const nextLongitude = input.pin_longitude === undefined ? existing.pin_longitude ?? null : input.pin_longitude;
    this.assertPin(nextLatitude, nextLongitude);

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.start_at !== undefined) {
      fields.push('start_at = ?');
      values.push(nextStart);
    }
    if (input.end_at !== undefined) {
      fields.push('end_at = ?');
      values.push(nextEnd);
    }
    if (input.time_unspecified !== undefined) {
      fields.push('time_unspecified = ?');
      values.push(input.time_unspecified ? 1 : 0);
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location);
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?');
      values.push(input.notes ?? '');
    }
    if (input.link !== undefined) {
      fields.push('link = ?');
      values.push(normalizeLink(input.link));
    }
    if (input.type !== undefined) {
      fields.push('type = ?');
      values.push(input.type);
    }
    if (input.is_all_day !== undefined) {
      fields.push('is_all_day = ?');
      values.push(input.is_all_day ? 1 : 0);
    }
    for (const [field, value] of [
      ['pin_latitude', input.pin_latitude],
      ['pin_longitude', input.pin_longitude],
      ['sort_order', input.sort_order],
    ] as const) {
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(value);
      }
    }
    if (input.is_priority !== undefined) {
      fields.push('is_priority = ?');
      values.push(input.is_priority ? 1 : 0);
    }

    values.push(stepId);
    await this.db
      .prepare(`UPDATE steps SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return await this.get(stepId);
  }

  async updateDates(itineraryId: string, updates: Array<{ id: string; start_at: number; end_at: number }>): Promise<Step[]> {
    const now = getCurrentTimestamp();
    await this.db.batch(updates.map((update) => this.db
      .prepare('UPDATE steps SET start_at = ?, end_at = ?, updated_at = ? WHERE id = ? AND itinerary_id = ?')
      .bind(update.start_at, update.end_at, now, update.id, itineraryId)));
    const result = await Promise.all(updates.map((update) => this.get(update.id)));
    return result.filter((step): step is Step => !!step);
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
      start_at: (row.start_at as number | null) ?? null,
      end_at: (row.end_at as number | null) ?? null,
      time_unspecified: row.time_unspecified === 1,
      location: row.location as string | null,
      notes: (row.notes as string | null) ?? '',
      link: (row.link as string | null | undefined) ?? null,
      type: (row.type as any) ?? STEP_TYPE.NORMAL_GENERAL,
      is_all_day: !!(row.is_all_day as number),
      pin_latitude: (row.pin_latitude as number | null) ?? null,
      pin_longitude: (row.pin_longitude as number | null) ?? null,
      is_priority: row.is_priority === 1,
      sort_order: (row.sort_order as number | null) ?? null,
      is_hidden: !!row.is_hidden_flag,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    if (step.is_hidden && maskSecrets) {
      step.title = '?????';
      step.location = null;
      step.notes = '';
      step.link = null;
    }

    return step;
  }

  private assertDates(startAt: number | null, endAt: number | null): void {
    if ((startAt === null) !== (endAt === null)) {
      throw new Error('start_at and end_at must both be null or both be timestamps');
    }
    if (startAt !== null && endAt !== null && endAt < startAt) {
      throw new Error('end_at must be greater than or equal to start_at');
    }
  }

  private assertPin(latitude: number | null, longitude: number | null): void {
    if ((latitude === null) !== (longitude === null)) {
      throw new Error('pin_latitude and pin_longitude must both be null or both be numbers');
    }
    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      throw new Error('pin_latitude is invalid');
    }
    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      throw new Error('pin_longitude is invalid');
    }
  }

  private assertTimeState(startAt: number | null, timeUnspecified: boolean, isAllDay: boolean): void {
    if (timeUnspecified && startAt === null) {
      throw new Error('time_unspecified requires a decided date');
    }
    if (timeUnspecified && isAllDay) {
      throw new Error('time_unspecified and is_all_day cannot both be true');
    }
  }
}
