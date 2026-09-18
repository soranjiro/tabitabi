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
    memo: z.string().max(100000),
  }),
  steps: z.array(z.object({
    title: z.string().min(1).max(200),
    start_at: z.number().int().min(0).max(8640000000000000).nullable(),
    end_at: z.number().int().min(0).max(8640000000000000).nullable(),
    time_unspecified: z.boolean().optional().default(false),
    location: z.string().nullable().optional(),
    notes: z.string().max(100000).nullable().optional(),
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
      { message: 'pin_latitude and pin_longitude must be provided together' })).max(1000),
});
export type BookContent = z.infer<typeof bookContentSchema>;

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
    const existingSteps = await this.db.prepare(`SELECT id, source_step_id FROM steps
      WHERE itinerary_id = ? ORDER BY start_at IS NULL, start_at, sort_order, created_at`).bind(id).all<{ id: string; source_step_id: string | null }>();
    const previous = existingSteps.results ?? [];
    const stepStatements = content.steps.map((step, index) => {
      const existing = previous[index];
      if (existing) return this.db.prepare(`UPDATE steps SET title = ?, start_at = ?, end_at = ?,
        time_unspecified = ?, location = ?, notes = ?, link = ?, type = ?, is_all_day = ?,
        pin_latitude = ?, pin_longitude = ?, is_priority = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND itinerary_id = ?`).bind(step.title, step.start_at, step.end_at,
        step.time_unspecified ? 1 : 0, step.location ?? null, step.notes ?? '', step.link ?? null,
        step.type, step.is_all_day ? 1 : 0, step.pin_latitude ?? null, step.pin_longitude ?? null,
        step.is_priority ? 1 : 0, step.sort_order ?? null, now, existing.id, id);
      return this.db.prepare(`INSERT INTO steps
        (id, itinerary_id, title, start_at, end_at, time_unspecified, location, notes,
          link, type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
          created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(generateId(), id, step.title, step.start_at, step.end_at,
          step.time_unspecified ? 1 : 0, step.location ?? null, step.notes ?? '',
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
      ...previous.slice(content.steps.length).map(step => this.db.prepare('DELETE FROM steps WHERE id = ? AND itinerary_id = ?').bind(step.id, id)),
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
      this.db.prepare(`SELECT id, title, start_at, end_at, time_unspecified, location, notes, link,
        type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order, source_step_id
        FROM steps WHERE itinerary_id = ? ORDER BY start_at IS NULL, start_at, sort_order`)
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
      const existing = sourceStepId ? await this.db.prepare('SELECT 1 FROM steps WHERE id = ? AND itinerary_id = ?')
        .bind(sourceStepId, sourceId).first() : null;
      const values = [step.title, step.start_at ?? null, step.end_at ?? null, step.time_unspecified,
        step.location ?? null, step.notes ?? '', step.link ?? null, step.type, step.is_all_day,
        step.pin_latitude ?? null, step.pin_longitude ?? null, step.is_priority,
        step.sort_order ?? null, now];
      if (existing) {
        statements.push(this.db.prepare(`UPDATE steps SET title = ?, start_at = ?, end_at = ?,
          time_unspecified = ?, location = ?, notes = ?, link = ?, type = ?, is_all_day = ?,
          pin_latitude = ?, pin_longitude = ?, is_priority = ?, sort_order = ?, updated_at = ?
          WHERE id = ? AND itinerary_id = ?`).bind(...values, sourceStepId, sourceId));
      } else {
        const newSourceStepId = generateId();
        statements.push(this.db.prepare(`INSERT INTO steps (id, itinerary_id, title, start_at,
          end_at, time_unspecified, location, notes, link, type, is_all_day, pin_latitude,
          pin_longitude, is_priority, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(newSourceStepId, sourceId, ...values.slice(0, -1), now, now));
        statements.push(this.db.prepare('UPDATE steps SET source_step_id = ? WHERE id = ? AND itinerary_id = ?')
          .bind(newSourceStepId, step.id, sharedId));
      }
    }
    await this.db.batch(statements);
  }
}
