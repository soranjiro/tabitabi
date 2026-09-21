import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import schema from '../../db/schema.sql?raw';
import { ItineraryService } from '../src/services/itinerary.service';
import { StepService } from '../src/services/step.service';
import { PublicationService, bookContentSchema } from '../src/services/publication.service';

// Exercise the actual production schema, including the legacy synchronization
// triggers. Hand-written fixture tables cannot detect trigger-induced data loss.
beforeAll(async () => {
  const statements = schema.split(/;\s*\n(?=CREATE )/).map(sql => sql.trim()).filter(Boolean);
  await env.DB.batch(statements.map(sql => env.DB.prepare(sql)));
});

const books = () => new ItineraryService(env.DB);
const steps = () => new StepService(env.DB);
const publications = () => new PublicationService(env.DB);
const note = (text: string) => JSON.stringify({ text });

async function trip() {
  const book = await books().create({ title: 'Storage regression', memo: note('旅のメモ') });
  const first = await steps().create({ itinerary_id: book.id, title: 'First', start_at: 1800000000000,
    end_at: 1800003600000, notes: note('最初の予定') });
  const second = await steps().create({ itinerary_id: book.id, title: 'Second', start_at: 1800090000000,
    end_at: 1800093600000, notes: note('次の予定') });
  return { book, first, second };
}

describe('normalized storage against production triggers', () => {
  it('allows the previous app to convert a date-only step to an all-day step', async () => {
    const { first } = await trip();
    await steps().update(first.id, { time_unspecified: true });
    await env.DB.prepare("UPDATE steps SET is_all_day = 1, notes = json_set(notes, '$.tabitabi_schedule.precision', 'time') WHERE id = ?")
      .bind(first.id).run();
    expect(await steps().get(first.id)).toMatchObject({ is_all_day: true, time_unspecified: false });
  });
  it('preserves literal JSON notes through publish and fork', async () => {
    const { book, first } = await trip();
    const literal = '{"text":"inner text","custom":"literal user text"}';
    await steps().update(first.id, { notes: note(literal) });
    const shared = await books().publish(book.id);
    expect(JSON.parse((await steps().list(shared.id))[0].notes).text).toBe(literal);
    const fork = await books().fork(shared.id);
    expect(JSON.parse((await steps().list(fork.itinerary.id))[0].notes).text).toBe(literal);
    expect(JSON.parse((await steps().list(book.id))[0].notes).text).toBe(literal);
  });

  it('persists priority independently of coordinates', async () => {
    const { first } = await trip();
    await steps().update(first.id, { is_priority: true });
    expect((await steps().get(first.id))?.is_priority).toBe(true);
  });

  it('does not resurrect a removed legacy booking link', async () => {
    const { first } = await trip();
    await env.DB.prepare("UPDATE steps SET notes = json_set(notes, '$.booking_url', 'https://example.com/old') WHERE id = ?")
      .bind(first.id).run();
    expect((await steps().get(first.id))?.link).toBe('https://example.com/old');
    await steps().update(first.id, { link: null });
    expect((await steps().get(first.id))?.link).toBeNull();
  });

  it('keeps source identity when publishing reordered or filtered preview content', async () => {
    const { book, first, second } = await trip();
    const preview = await publications().read(book.id, true);
    const content = bookContentSchema.parse({ ...preview, steps: [preview.steps.find(step => step.id === second.id)] });
    const shared = await books().publish(book.id, undefined, undefined, content);
    await publications().restore(book.id, shared.id);
    expect((await steps().get(first.id))?.title).toBe('First');
    expect((await steps().get(second.id))?.title).toBe('Second');
    expect(await steps().list(book.id)).toHaveLength(2);
  });

  it('preserves snapshot step identity after reordering a saved publication', async () => {
    const { book, first, second } = await trip();
    const shared = await books().publish(book.id);
    const content = await publications().read(shared.id);
    await publications().replace(shared.id, bookContentSchema.parse({ ...content, steps: [...content.steps].reverse() }));
    await publications().restore(book.id, shared.id);
    expect((await steps().get(first.id))?.title).toBe('First');
    expect((await steps().get(second.id))?.title).toBe('Second');
  });

  it('can fork preview content that omits optional normalized fields', async () => {
    const { book } = await trip();
    const content = bookContentSchema.parse({ itinerary: { title: 'Copy', memo: note('') },
      steps: [{ title: 'Candidate', start_at: null, end_at: null, notes: note('keep'), type: 'normal:general' }] });
    const fork = await books().fork(book.id, content);
    const copied = (await steps().list(fork.itinerary.id))[0];
    expect(copied).toMatchObject({ title: 'Candidate', start_at: null });
    expect(JSON.parse(copied.notes).text).toBe('keep');
  });
});
