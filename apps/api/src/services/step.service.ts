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

function normalizeLegacyNotes(
  notes: string,
  state: Pick<Step, 'start_at' | 'time_unspecified' | 'sort_order' | 'pin_latitude' | 'pin_longitude' | 'is_priority'>,
  currentLegacy?: unknown,
): string {
  let data: Record<string, unknown> = {};
  try {
    const parsed = typeof currentLegacy === 'string' ? JSON.parse(currentLegacy) : JSON.parse(notes);
    if (typeof parsed === 'object' && parsed !== null) data = { ...parsed };
  } catch {}
  data.text = notes;
  data.tabitabi_schedule = {
    precision: state.start_at === null ? 'undecided' : state.time_unspecified ? 'day' : 'time',
    ...(state.sort_order === null || state.sort_order === undefined ? {} : { order: state.sort_order }),
  };
  if (state.pin_latitude !== null && state.pin_latitude !== undefined
    && state.pin_longitude !== null && state.pin_longitude !== undefined) {
    data.tabitabi_place = {
      lat: state.pin_latitude,
      lng: state.pin_longitude,
      priority: Boolean(state.is_priority),
    };
  } else {
    delete data.tabitabi_place;
  }
  return JSON.stringify(data);
}

export class StepService {
  constructor(private db: D1Database) {}

  async list(itineraryId: string, options?: { currentTime?: number; offsetMinutes?: number; maskSecrets?: boolean }): Promise<Step[]> {
    let query = 'SELECT * FROM steps WHERE itinerary_id = ?';
    const bindings: (string | number)[] = [itineraryId];

    if (options?.currentTime && options?.offsetMinutes !== undefined) {
      query = `
        SELECT *,
        (scheduled_start_at > ? + ? * 60000) as is_hidden_flag
        FROM steps
        WHERE itinerary_id = ?
      `;

      bindings.length = 0;
      bindings.push(options.currentTime);
      bindings.push(options.offsetMinutes);
      bindings.push(itineraryId);
    }

    query += ' ORDER BY scheduled_start_at IS NULL, scheduled_start_at ASC, sort_order ASC, created_at ASC';

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

    const sourceNotes = input.notes ?? '';

    const step: Step = {
      id,
      itinerary_id: input.itinerary_id,
      title: input.title,
      start_at: startAt,
      end_at: endAt,
      time_unspecified: input.time_unspecified ?? false,
      location: input.location ?? null,
      notes: sourceNotes,
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
    const legacyNotes = normalizeLegacyNotes(step.notes, step);
    const legacyStart = step.start_at ?? Date.now();
    const legacyEnd = step.end_at ?? legacyStart;

    await this.db
      .prepare(
        `INSERT INTO steps (id, itinerary_id, title, start_at, end_at,
          scheduled_start_at, scheduled_end_at, time_unspecified, location, notes,
          notes_text, link, type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        step.id,
        step.itinerary_id,
        step.title,
        legacyStart,
        legacyEnd,
        step.start_at,
        step.end_at,
        step.time_unspecified ? 1 : 0,
        step.location,
        legacyNotes,
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
    const existingRow = await this.db.prepare('SELECT * FROM steps WHERE id = ?').bind(stepId).first<Record<string, unknown>>();
    if (!existingRow) return null;
    const existing = this.mapToStep(existingRow, false);

    const now = getCurrentTimestamp();
    const nextStart = input.start_at === undefined ? existing.start_at : parseToUnixMs(input.start_at);
    const nextEnd = input.end_at === undefined ? existing.end_at : parseToUnixMs(input.end_at);
    const nextTimeUnspecified = input.time_unspecified === undefined ? Boolean(existing.time_unspecified) : input.time_unspecified;
    const nextAllDay = input.is_all_day === undefined ? Boolean(existing.is_all_day) : input.is_all_day;
    this.assertDates(nextStart, nextEnd);
    this.assertTimeState(nextStart, nextTimeUnspecified, nextAllDay);
    const nextLatitude = input.pin_latitude === undefined ? existing.pin_latitude ?? null : input.pin_latitude;
    const nextLongitude = input.pin_longitude === undefined ? existing.pin_longitude ?? null : input.pin_longitude;
    this.assertPin(nextLatitude, nextLongitude);
    const nextPriority = input.is_priority === undefined ? Boolean(existing.is_priority) : input.is_priority;
    const nextOrder = input.sort_order === undefined ? existing.sort_order ?? null : input.sort_order;
    const sourceNotes = input.notes === undefined ? existing.notes : input.notes ?? '';
    const nextLegacyNotes = normalizeLegacyNotes(sourceNotes, {
      start_at: nextStart,
      time_unspecified: nextTimeUnspecified,
      sort_order: nextOrder,
      pin_latitude: nextLatitude,
      pin_longitude: nextLongitude,
      is_priority: nextPriority,
    }, existingRow.notes);
    const legacyStart = nextStart ?? Number(existingRow.start_at);
    const legacyEnd = nextEnd ?? Number(existingRow.end_at);

    const fields = [
      'updated_at = ?', 'start_at = ?', 'end_at = ?',
      'scheduled_start_at = ?', 'scheduled_end_at = ?', 'time_unspecified = ?',
      'notes = ?', 'notes_text = ?', 'is_all_day = ?', 'pin_latitude = ?', 'pin_longitude = ?',
      'is_priority = ?', 'sort_order = ?',
    ];
    const values: (string | number | null)[] = [
      now, legacyStart, legacyEnd, nextStart, nextEnd, nextTimeUnspecified ? 1 : 0,
      nextLegacyNotes, sourceNotes, nextAllDay ? 1 : 0, nextLatitude, nextLongitude,
      nextPriority ? 1 : 0, nextOrder,
    ];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location);
    }
    if (input.link !== undefined) {
      fields.push('link = ?');
      values.push(normalizeLink(input.link));
    }
    if (input.type !== undefined) {
      fields.push('type = ?');
      values.push(input.type);
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
    const [current, rawRows] = await Promise.all([
      Promise.all(updates.map((update) => this.get(update.id))),
      Promise.all(updates.map((update) => this.db.prepare('SELECT notes FROM steps WHERE id = ?')
        .bind(update.id).first<{ notes: string | null }>())),
    ]);
    await this.db.batch(updates.map((update, index) => {
      const step = current[index];
      const notesText = step?.notes ?? '';
      const notes = normalizeLegacyNotes(notesText, {
        start_at: update.start_at,
        time_unspecified: step?.time_unspecified,
        sort_order: step?.sort_order,
        pin_latitude: step?.pin_latitude,
        pin_longitude: step?.pin_longitude,
        is_priority: step?.is_priority,
      }, rawRows[index]?.notes);
      return this.db.prepare(`UPDATE steps SET start_at = ?, end_at = ?,
        scheduled_start_at = ?, scheduled_end_at = ?, notes = ?, notes_text = ?, updated_at = ?
        WHERE id = ? AND itinerary_id = ?`)
        .bind(update.start_at, update.end_at, update.start_at, update.end_at, notes, notesText, now, update.id, itineraryId);
    }));
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
      start_at: (row.scheduled_start_at as number | null) ?? null,
      end_at: (row.scheduled_end_at as number | null) ?? null,
      time_unspecified: row.time_unspecified === 1,
      location: row.location as string | null,
      notes: (row.notes_text as string | null) ?? '',
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
