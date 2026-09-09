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
    memo: z.string().max(100000).refine(value => { try { return typeof JSON.parse(value).text === 'string'; } catch { return false; } }),
  }),
  steps: z.array(z.object({
    title: z.string().min(1).max(200),
    start_at: z.number().int().min(0).max(8640000000000000),
    end_at: z.number().int().min(0).max(8640000000000000),
    location: z.string().nullable().optional(),
    notes: z.string().max(100000).nullable().optional(),
    link: z.string().url().refine(value => /^https?:\/\//.test(value)).nullable().optional(),
    type: z.string().max(64),
    is_all_day: z.boolean().optional(),
  }).refine(step => step.end_at >= step.start_at)).max(1000),
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
        start_at: step.start_at, end_at: step.end_at, is_all_day: step.is_all_day })),
    };
  }

  async replace(id: string, content: BookContent, backgroundSourceId?: string) {
    const now = getCurrentTimestamp();
    const book = content.itinerary;
    await this.db.batch([
      this.db.prepare(`UPDATE itineraries SET title = ?, theme_id = COALESCE(?, theme_id), palette_id = COALESCE(?, palette_id),
        memo = ?, packing_enabled = ?, prefecture_slugs = ?, areas = ?, tags = ?, updated_at = ? WHERE id = ?`)
        .bind(book.title, book.theme_id ? normalizeThemeId(book.theme_id) : null, book.palette_id ?? null, book.memo, book.packing_enabled === false ? 0 : 1,
          JSON.stringify(book.prefecture_slugs ?? []), JSON.stringify(book.areas ?? []), JSON.stringify(book.tags ?? []), now, id),
      this.db.prepare('DELETE FROM steps WHERE itinerary_id = ?').bind(id),
      ...content.steps.map(step => this.db.prepare(`INSERT INTO steps
        (id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(generateId(), id, step.title, step.start_at, step.end_at, step.location ?? null, step.notes ?? '{"text":""}', step.link ?? null, step.type, step.is_all_day ? 1 : 0, now, now)),
      this.db.prepare('UPDATE itinerary_publications SET prefecture_slugs = ?, areas = ?, tags = ?, updated_at = ? WHERE shared_itinerary_id = ?')
        .bind(JSON.stringify(book.prefecture_slugs ?? []), JSON.stringify(book.areas ?? []), JSON.stringify(book.tags ?? []), now, id),
      ...(backgroundSourceId ? [this.db.prepare(`UPDATE itineraries SET
        background_image = (SELECT background_image FROM itineraries WHERE id = ?),
        background_display = (SELECT background_display FROM itineraries WHERE id = ?) WHERE id = ?`)
        .bind(backgroundSourceId, backgroundSourceId, id)] : []),
    ]);
  }
}
