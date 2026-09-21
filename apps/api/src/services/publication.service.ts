import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { updateItinerarySchema } from '../validators';
import { ItineraryService } from './itinerary.service';
import { StepService } from './step.service';
import { generateId, getCurrentTimestamp, type Env } from '../utils';
import { createPublicMemoSnapshot, createPublicStepSnapshot, createPublicTextSnapshot } from '../utils/publication';
import { normalizeThemeId } from '../utils/theme';

export const bookContentSchema = z.object({
  itinerary: updateItinerarySchema.omit({ password: true, secret_settings: true }).extend({
    title: z.string().min(1).max(100),
    memo: z.string().max(100000).refine(value => {
      try { return typeof JSON.parse(value).text === 'string'; } catch { return false; }
    }),
  }),
  steps: z.array(z.object({
    id: z.string().min(1).max(100).optional(),
    title: z.string().min(1).max(200),
    start_at: z.number().int().min(0).max(8640000000000000).nullable(),
    end_at: z.number().int().min(0).max(8640000000000000).nullable(),
    time_unspecified: z.boolean().optional().default(false),
    location: z.string().nullable().optional(),
    notes: z.string().max(100000).refine(value => {
      try { return typeof JSON.parse(value).text === 'string'; } catch { return false; }
    }).nullable().optional(),
    link: z.string().url().refine(value => /^https?:\/\//.test(value)).nullable().optional(),
    type: z.string().max(64),
    is_all_day: z.boolean().optional(),
    pin_latitude: z.number().min(-90).max(90).nullable().optional(),
    pin_longitude: z.number().min(-180).max(180).nullable().optional(),
    is_priority: z.boolean().optional().default(false),
    sort_order: z.number().nullable().optional(),
  }).refine(step => (step.start_at === null && step.end_at === null)
    || (step.start_at !== null && step.end_at !== null && step.end_at >= step.start_at),
  { message: 'start_at and end_at must both be null, or form a valid range' })
    .refine(step => (step.pin_latitude == null) === (step.pin_longitude == null),
      { message: 'pin_latitude and pin_longitude must be provided together' })
    .refine(step => !(step.time_unspecified && step.start_at === null),
      { message: 'time_unspecified requires a decided date' })
    .refine(step => !(step.time_unspecified && step.is_all_day),
      { message: 'time_unspecified and is_all_day cannot both be true' })).max(1000)
    .refine(steps => {
      const ids = steps.flatMap(step => step.id ? [step.id] : []);
      return new Set(ids).size === ids.length;
    }, { message: 'Step IDs must be unique' }),
});
export type BookContent = z.infer<typeof bookContentSchema>;

function normalizedLegacyNotes(step: BookContent['steps'][number]): string {
  const raw = step.notes ?? '{"text":""}';
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    data = typeof parsed === 'object' && parsed !== null ? { ...parsed } : { text: raw };
  } catch {
    data = { text: raw };
  }
  data.tabitabi_schedule = {
    precision: step.start_at === null ? 'undecided' : step.time_unspecified ? 'day' : 'time',
    ...(step.sort_order == null ? {} : { order: step.sort_order }),
  };
  if (step.pin_latitude != null && step.pin_longitude != null) {
    data.tabitabi_place = { lat: step.pin_latitude, lng: step.pin_longitude, priority: Boolean(step.is_priority) };
  } else {
    data.tabitabi_place = { priority: Boolean(step.is_priority) };
  }
  if (Object.hasOwn(data, 'booking_url')) data.booking_url = step.link ?? null;
  return JSON.stringify(data);
}

export class PublicationService {
  constructor(private db: D1Database, private env?: Partial<Env>) {}

  async owned(sourceId: string, userId: string) {
    return this.db.prepare('SELECT shared_itinerary_id AS id FROM itinerary_publications WHERE source_itinerary_id = ? AND user_id = ?')
      .bind(sourceId, userId).first<{ id: string }>();
  }

  async read(id: string, sanitize = false) {
    const service = new ItineraryService(this.db, this.env);
    const itinerary = await service.get(id);
    if (!itinerary) throw new Error('NOT_FOUND');
    const steps = await new StepService(this.db).list(id);
    if (!sanitize) return { itinerary: service.toResponseItinerary(itinerary), steps };
    const members = await this.db.prepare('SELECT name FROM itinerary_members WHERE itinerary_id = ?').bind(id).all<{ name: string }>();
    const names = members.results.map(member => member.name);
    return {
      itinerary: { ...service.toResponseItinerary(itinerary), title: createPublicTextSnapshot(itinerary.title, names) || '旅のしおり',
        memo: createPublicMemoSnapshot(itinerary.memo, names), source_itinerary_id: id, is_password_protected: false, secret_settings: null },
      steps: steps.map(step => ({ ...step, ...createPublicStepSnapshot({ ...step }, this.env, names),
        start_at: step.start_at, end_at: step.end_at, time_unspecified: step.time_unspecified,
        is_all_day: step.is_all_day, pin_latitude: step.pin_latitude,
        pin_longitude: step.pin_longitude, is_priority: step.is_priority,
        sort_order: step.sort_order })),
    };
  }

  async replace(id: string, content: BookContent, backgroundSourceId?: string) {
    const now = getCurrentTimestamp();
    const book = content.itinerary;
    const existingSteps = await this.db.prepare(`SELECT id, source_step_id, start_at, end_at FROM steps
      WHERE itinerary_id = ? ORDER BY scheduled_start_at IS NULL, scheduled_start_at, sort_order, created_at`)
      .bind(id).all<{ id: string; source_step_id: string | null; start_at: number; end_at: number }>();
    const previous = existingSteps.results ?? [];
    const previousById = new Map(previous.map(step => [step.id, step]));
    const retainedIds = new Set(content.steps.flatMap(step => step.id ? [step.id] : []));
    const stepStatements = content.steps.map(step => {
      const existing = step.id ? previousById.get(step.id) : undefined;
      const legacyStart = step.start_at ?? existing?.start_at ?? Date.now();
      const legacyEnd = step.end_at ?? existing?.end_at ?? legacyStart;
      const notes = normalizedLegacyNotes(step);
      if (existing) return this.db.prepare(`UPDATE steps SET title = ?, start_at = ?, end_at = ?,
        scheduled_start_at = ?, scheduled_end_at = ?, time_unspecified = ?, location = ?, notes = ?, link = ?, type = ?, is_all_day = ?,
        pin_latitude = ?, pin_longitude = ?, is_priority = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND itinerary_id = ?`).bind(step.title, legacyStart, legacyEnd,
        step.start_at, step.end_at, step.time_unspecified ? 1 : 0, step.location ?? null, notes, step.link ?? null,
        step.type, step.is_all_day ? 1 : 0, step.pin_latitude ?? null, step.pin_longitude ?? null,
        step.is_priority ? 1 : 0, step.sort_order ?? null, now, existing.id, id);
      return this.db.prepare(`INSERT INTO steps
        (id, itinerary_id, title, start_at, end_at, scheduled_start_at, scheduled_end_at, time_unspecified, location, notes,
          link, type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
          created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(step.id ?? generateId(), id, step.title, legacyStart, legacyEnd, step.start_at, step.end_at,
          step.time_unspecified ? 1 : 0, step.location ?? null, notes,
          step.link ?? null, step.type, step.is_all_day ? 1 : 0,
          step.pin_latitude ?? null, step.pin_longitude ?? null,
          step.is_priority ? 1 : 0, step.sort_order ?? null, now, now);
    });
    await this.db.batch([
      this.db.prepare(`UPDATE itineraries SET title = ?, theme_id = COALESCE(?, theme_id), palette_id = COALESCE(?, palette_id),
        memo = ?, packing_enabled = ?, prefecture_slugs = ?, areas = ?, tags = ?, updated_at = ? WHERE id = ?`)
        .bind(book.title, book.theme_id ? normalizeThemeId(book.theme_id) : null, book.palette_id ?? null, book.memo, book.packing_enabled === false ? 0 : 1,
          JSON.stringify(book.prefecture_slugs ?? []), JSON.stringify(book.areas ?? []), JSON.stringify(book.tags ?? []), now, id),
      ...stepStatements,
      ...previous.filter(step => !retainedIds.has(step.id)).map(step => this.db.prepare('DELETE FROM steps WHERE id = ? AND itinerary_id = ?').bind(step.id, id)),
      this.db.prepare('UPDATE itinerary_publications SET prefecture_slugs = ?, areas = ?, tags = ?, updated_at = ? WHERE shared_itinerary_id = ?')
        .bind(JSON.stringify(book.prefecture_slugs ?? []), JSON.stringify(book.areas ?? []), JSON.stringify(book.tags ?? []), now, id),
      ...(backgroundSourceId ? [this.db.prepare(`UPDATE itineraries SET
        background_image = (SELECT background_image FROM itineraries WHERE id = ?),
        background_display = (SELECT background_display FROM itineraries WHERE id = ?) WHERE id = ?`)
        .bind(backgroundSourceId, backgroundSourceId, id)] : []),
    ]);
  }

  async restore(sourceId: string, sharedId: string) {
    const now = getCurrentTimestamp();
    const [book, snapshotSteps] = await Promise.all([
      this.db.prepare(`SELECT title, theme_id, palette_id, packing_enabled, prefecture_slugs,
        areas, tags, memo, background_image, page_background_image, background_display
        FROM itineraries WHERE id = ? AND source_itinerary_id = ?`)
        .bind(sharedId, sourceId).first<Record<string, unknown>>(),
      this.db.prepare(`SELECT id, title, start_at AS legacy_start_at, end_at AS legacy_end_at,
        scheduled_start_at, scheduled_end_at, time_unspecified, location, notes, link,
        type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order, source_step_id
        FROM steps WHERE itinerary_id = ? ORDER BY scheduled_start_at IS NULL, scheduled_start_at, sort_order`)
        .bind(sharedId).all<Record<string, unknown>>(),
    ]);
    if (!book) throw new Error('NOT_FOUND');
    const statements = [this.db.prepare(`UPDATE itineraries SET title = ?, theme_id = ?,
      palette_id = ?, packing_enabled = ?, prefecture_slugs = ?, areas = ?, tags = ?, memo = ?,
      background_image = ?, page_background_image = ?, background_display = ?, updated_at = ?
      WHERE id = ?`).bind(book.title, book.theme_id, book.palette_id,
      book.packing_enabled, book.prefecture_slugs, book.areas, book.tags, book.memo,
      book.background_image ?? null, book.page_background_image ?? null,
      book.background_display ?? 'cover', now, sourceId)];
    for (const step of snapshotSteps.results ?? []) {
      const sourceStepId = typeof step.source_step_id === 'string' ? step.source_step_id : null;
      const existing = sourceStepId ? await this.db.prepare('SELECT start_at, end_at FROM steps WHERE id = ? AND itinerary_id = ?')
        .bind(sourceStepId, sourceId).first<{ start_at: number; end_at: number }>() : null;
      const scheduledStart = (step.scheduled_start_at as number | null) ?? null;
      const scheduledEnd = (step.scheduled_end_at as number | null) ?? null;
      const legacyStart = scheduledStart ?? existing?.start_at ?? Number(step.legacy_start_at) ?? Date.now();
      const legacyEnd = scheduledEnd ?? existing?.end_at ?? Number(step.legacy_end_at) ?? legacyStart;
      const values = [step.title, legacyStart, legacyEnd, scheduledStart, scheduledEnd, step.time_unspecified,
        step.location ?? null, step.notes ?? '{"text":""}', step.link ?? null, step.type, step.is_all_day,
        step.pin_latitude ?? null, step.pin_longitude ?? null, step.is_priority,
        step.sort_order ?? null, now];
      if (existing) {
        statements.push(this.db.prepare(`UPDATE steps SET title = ?, start_at = ?, end_at = ?,
          scheduled_start_at = ?, scheduled_end_at = ?, time_unspecified = ?, location = ?, notes = ?, link = ?, type = ?, is_all_day = ?,
          pin_latitude = ?, pin_longitude = ?, is_priority = ?, sort_order = ?, updated_at = ?
          WHERE id = ? AND itinerary_id = ?`).bind(...values, sourceStepId, sourceId));
      } else {
        const newSourceStepId = generateId();
        statements.push(this.db.prepare(`INSERT INTO steps (id, itinerary_id, title, start_at,
          end_at, scheduled_start_at, scheduled_end_at, time_unspecified, location, notes, link, type, is_all_day, pin_latitude,
          pin_longitude, is_priority, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(newSourceStepId, sourceId, ...values.slice(0, -1), now, now));
        statements.push(this.db.prepare('UPDATE steps SET source_step_id = ? WHERE id = ? AND itinerary_id = ?')
          .bind(newSourceStepId, step.id, sharedId));
      }
    }
    await this.db.batch(statements);
  }
}
