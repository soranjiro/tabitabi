import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import type { D1Database, D1Result } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';
import type { Env } from '../utils';
import { createPublicMemoSnapshot, createPublicStepSnapshot, createPublicTextSnapshot } from '../utils/publication';
import { hashPassword } from '../utils/password';
import { normalizeThemeId } from '../utils/theme';
import type { BookContent } from './publication.service';

const DEFAULT_THEME_ID = 'planning-draft';
const DEFAULT_PALETTE_ID = 'neutral';

function legacyTextJson(text: string, current?: string | null): string {
  let data: Record<string, unknown> = {};
  if (current) {
    try {
      const parsed = JSON.parse(current);
      if (typeof parsed === 'object' && parsed !== null) data = { ...parsed };
    } catch {
      data = {};
    }
  }
  data.text = text;
  return JSON.stringify(data);
}

function normalizedLegacyStepNotes(row: Record<string, unknown>): string {
  const raw = typeof row.notes === 'string' ? row.notes : '{"text":""}';
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    data = typeof parsed === 'object' && parsed !== null ? { ...parsed } : { text: raw };
  } catch {
    data = { text: raw };
  }
  const startAt = (row.start_at as number | null | undefined) ?? null;
  data.tabitabi_schedule = {
    precision: startAt === null ? 'undecided' : row.time_unspecified ? 'day' : 'time',
    ...(row.sort_order == null ? {} : { order: row.sort_order }),
  };
  if (row.pin_latitude != null && row.pin_longitude != null) {
    data.tabitabi_place = {
      lat: row.pin_latitude,
      lng: row.pin_longitude,
      priority: Boolean(row.is_priority),
    };
  } else {
    delete data.tabitabi_place;
  }
  return JSON.stringify(data);
}

export class ItineraryService {
  constructor(private db: D1Database, private env?: Partial<Env>) {}

  async list(): Promise<Itinerary[]> {
    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               COALESCE(f.fork_count, 0) + COALESCE(source_f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        LEFT JOIN itinerary_fork_stats f ON i.id = f.itinerary_id
        LEFT JOIN itinerary_fork_stats source_f ON i.source_itinerary_id = source_f.itinerary_id
        ORDER BY i.created_at DESC
      `)
      .all();

    return result.results ? result.results.map(row => this.mapToItinerary(row)) : [];
  }

  async get(id: string): Promise<Itinerary | null> {
    if (id.startsWith('official-')) return this.getOfficialAlias(id);

    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               COALESCE(f.fork_count, 0) + COALESCE(source_f.fork_count, 0) as fork_count
        FROM itineraries i
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        LEFT JOIN itinerary_fork_stats f ON i.id = f.itinerary_id
        LEFT JOIN itinerary_fork_stats source_f ON i.source_itinerary_id = source_f.itinerary_id
        WHERE i.id = ?
      `)
      .bind(id)
      .first();

    return result ? this.mapToItinerary(result) : null;
  }

  /** Resolve an official, stable URL to the publisher's current public snapshot. */
  private async getOfficialAlias(alias: string): Promise<Itinerary | null> {
    const result = await this.db
      .prepare(`
        SELECT i.*,
               s.enabled as secret_enabled, s.offset_minutes as secret_offset,
               COALESCE(f.fork_count, 0) + COALESCE(source_f.fork_count, 0) as fork_count
        FROM official_itinerary_aliases a
        INNER JOIN itineraries i ON i.id = a.itinerary_id
        LEFT JOIN itinerary_secrets s ON i.id = s.itinerary_id
        LEFT JOIN itinerary_fork_stats f ON i.id = f.itinerary_id
        LEFT JOIN itinerary_fork_stats source_f ON i.source_itinerary_id = source_f.itinerary_id
        WHERE a.alias = ?
      `)
      .bind(alias)
      .first();

    return result ? this.mapToItinerary(result) : null;
  }

  async create(input: CreateItineraryInput): Promise<Itinerary> {
    const id = generateId();
    const now = getCurrentTimestamp();

    const memo = input.memo ?? '';

    const hashedPassword = input.password ? await hashPassword(input.password) : null;

    const itinerary: Itinerary = {
      id,
      title: input.title,
      theme_id: normalizeThemeId(input.theme_id || DEFAULT_THEME_ID),
      palette_id: input.palette_id || DEFAULT_PALETTE_ID,
      packing_enabled: input.packing_enabled ?? true,
      prefecture_slugs: [],
      areas: [],
      tags: [],
      metadata_initialized: false,
      memo,
      password: hashedPassword,
      secret_settings: input.secret_settings ? {
        enabled: input.secret_settings.enabled,
        offset_minutes: input.secret_settings.offset_minutes
      } : null,
      fork_count: 0,
      created_at: now,
      updated_at: now,
    };

    // Insert into main table
    await this.db
      .prepare(`INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled,
        prefecture_slugs, areas, tags, metadata_initialized, memo, memo_text, password,
        created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(itinerary.id, itinerary.title, itinerary.theme_id, itinerary.palette_id,
        itinerary.packing_enabled ? 1 : 0, '[]', '[]', '[]', 0,
        legacyTextJson(itinerary.memo), itinerary.memo, itinerary.password,
        itinerary.created_at, itinerary.updated_at)
      .run();

    // Insert into secrets table if settings exist
    if (itinerary.secret_settings) {
      await this.db
        .prepare('INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(
          itinerary.id,
          itinerary.secret_settings.enabled ? 1 : 0,
          itinerary.secret_settings.offset_minutes,
          now,
          now
        )
        .run();
    }

    return itinerary;
  }

  async update(id: string, input: UpdateItineraryInput): Promise<Itinerary | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const now = getCurrentTimestamp();
    const fields = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.theme_id !== undefined) {
      fields.push('theme_id = ?');
      values.push(normalizeThemeId(input.theme_id || DEFAULT_THEME_ID));
    }
    if (input.palette_id !== undefined) {
      fields.push('palette_id = ?');
      values.push(input.palette_id || DEFAULT_PALETTE_ID);
    }
    if (input.packing_enabled !== undefined) {
      fields.push('packing_enabled = ?');
      values.push(input.packing_enabled ? 1 : 0);
    }
    for (const [field, value] of [
      ['prefecture_slugs', input.prefecture_slugs],
      ['areas', input.areas],
      ['tags', input.tags],
    ] as const) {
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(JSON.stringify(value));
      }
    }
    if (input.metadata_initialized !== undefined) {
      fields.push('metadata_initialized = ?');
      values.push(input.metadata_initialized ? 1 : 0);
    }
    if (input.memo !== undefined) {
      const legacy = await this.db.prepare('SELECT memo FROM itineraries WHERE id = ?')
        .bind(id).first<{ memo: string | null }>();
      fields.push('memo = ?', 'memo_text = ?');
      values.push(legacyTextJson(input.memo, legacy?.memo), input.memo);
    }
    if (input.password !== undefined) {
      fields.push('password = ?');
      const hashedPassword = input.password ? await hashPassword(input.password) : null;
      values.push(hashedPassword);
    }

    if (fields.length > 1) {
      values.push(id);
      await this.db
        .prepare(`UPDATE itineraries SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    // Handle secret settings update
    if (input.secret_settings !== undefined) {
      if (input.secret_settings === null) {
        // Remove settings
        await this.db
          .prepare('DELETE FROM itinerary_secrets WHERE itinerary_id = ?')
          .bind(id)
          .run();
      } else {
        // Upsert settings
        await this.db
          .prepare(`
            INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(itinerary_id) DO UPDATE SET
            enabled = excluded.enabled,
            offset_minutes = excluded.offset_minutes,
            updated_at = excluded.updated_at
          `)
          .bind(
            id,
            input.secret_settings.enabled ? 1 : 0,
            input.secret_settings.offset_minutes,
            now,
            now
          )
          .run();
      }
    }

    return await this.get(id);
  }

  async fork(sourceId: string, content?: BookContent): Promise<{ itinerary: Itinerary; steps: number }> {
    const source = await this.get(sourceId);
    if (!source) throw new Error('NOT_FOUND');
    if (source.password) throw new Error('FORBIDDEN');
    if (content) Object.assign(source, content.itinerary);

    const newId = generateId();
    const now = getCurrentTimestamp();

    // Fetch source steps before batch to generate new IDs
    // Feature-specific settings are intentionally excluded from forks.
    const sourceSteps = await this.db
      .prepare(`SELECT id, itinerary_id, title, start_at AS legacy_start_at,
        end_at AS legacy_end_at, scheduled_start_at AS start_at,
        scheduled_end_at AS end_at, time_unspecified,
        location, notes_text AS notes, link, type, is_all_day, pin_latitude, pin_longitude,
        is_priority, sort_order FROM steps WHERE itinerary_id = ?
        ORDER BY scheduled_start_at IS NULL, scheduled_start_at ASC, sort_order ASC`)
      .bind(sourceId)
      .all();

    const rows = (content ? content.steps.map(step => ({ ...step, location: step.location ?? null,
      notes: step.notes ?? '', link: step.link ?? null, is_all_day: step.is_all_day ? 1 : 0,
      time_unspecified: step.time_unspecified ? 1 : 0, is_priority: step.is_priority ? 1 : 0,
      legacy_start_at: step.start_at ?? Date.now(), legacy_end_at: step.end_at ?? step.start_at ?? Date.now() }))
      : sourceSteps.results ?? []).map(row => ({ ...row,
        notes_text: typeof row.notes === 'string' ? row.notes : '',
        notes: normalizedLegacyStepNotes(row),
      }));

    // Use batch() for atomic execution: all inserts + fork_count upsert succeed or fail together
    const stepStatements = rows.map(row =>
      this.db
        .prepare(`INSERT INTO steps (id, itinerary_id, title, start_at, end_at,
          scheduled_start_at, scheduled_end_at, time_unspecified, location, notes, notes_text, link,
          type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
          created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(generateId(), newId, row.title, row.legacy_start_at, row.legacy_end_at,
          row.start_at, row.end_at, row.time_unspecified,
          row.location, row.notes, row.notes_text, row.link, row.type, row.is_all_day, row.pin_latitude,
          row.pin_longitude, row.is_priority, row.sort_order, now, now)
    );

    await this.db.batch([
      this.db
        .prepare(`INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled,
          prefecture_slugs, areas, tags, metadata_initialized, memo, memo_text, password, background_image,
          page_background_image, background_display, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL, ?, ?, ?, ?, ?)`)
        .bind(newId, `${source.title.slice(0, 95)}（コピー）`, source.theme_id,
          source.palette_id ?? DEFAULT_PALETTE_ID, 1, JSON.stringify(source.prefecture_slugs ?? []),
          JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []),
          legacyTextJson(source.memo), source.memo, source.background_image ?? null,
          source.page_background_image ?? null, source.background_display ?? 'cover', now, now),
      ...stepStatements,
      // Upsert fork_count in the dedicated stats table
      this.db
        .prepare(`
          INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)
          VALUES (?, 1)
          ON CONFLICT(itinerary_id) DO UPDATE SET fork_count = fork_count + 1
        `)
        .bind(sourceId),
    ]);

    const forked = await this.get(newId);
    return { itinerary: forked!, steps: rows.length };
  }

  async publish(sourceId: string, userId?: string, metadata?: Pick<Itinerary, 'prefecture_slugs' | 'areas' | 'tags'>, content?: BookContent): Promise<Itinerary> {
    const source = await this.get(sourceId);
    if (!source) throw new Error('NOT_FOUND');
    if (source.source_itinerary_id) throw new Error('CANNOT_PUBLISH_SNAPSHOT');
    if (content) Object.assign(source, content.itinerary);
    if (metadata) Object.assign(source, metadata);

    const now = getCurrentTimestamp();

    const [sourceSteps, sourceMembers] = await Promise.all([
      this.db
        .prepare(`SELECT id, title, start_at AS legacy_start_at, end_at AS legacy_end_at,
          scheduled_start_at AS start_at, scheduled_end_at AS end_at,
          time_unspecified, location, notes_text AS notes, link,
          type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order
          FROM steps WHERE itinerary_id = ?
          ORDER BY scheduled_start_at IS NULL, scheduled_start_at ASC, sort_order ASC`)
        .bind(sourceId)
        .all(),
      this.db
        .prepare('SELECT name FROM itinerary_members WHERE itinerary_id = ?')
        .bind(sourceId)
        .all<{ name: string }>(),
    ]);
    const memberNames = (sourceMembers.results ?? []).map((member) => member.name);
    const sourceStepRows = sourceSteps.results ?? [];
    const rows = (content ? content.steps.map((step, index) => ({ ...step,
      id: sourceStepRows[index]?.id, is_all_day: step.is_all_day ? 1 : 0 })) : sourceStepRows)
      .map(row => {
        const snapshot = createPublicStepSnapshot(row, this.env, memberNames);
        return { ...snapshot, notes_text: snapshot.notes, notes: normalizedLegacyStepNotes(snapshot),
          legacy_start_at: row.legacy_start_at, legacy_end_at: row.legacy_end_at,
          source_step_id: row.id as string | undefined, snapshot_step_id: generateId() };
      });
    const publicTitle = createPublicTextSnapshot(source.title, memberNames) || '旅のしおり';
    const publicMemo = createPublicMemoSnapshot(source.memo, memberNames);

    let existing = userId ? await this.db
      .prepare('SELECT shared_itinerary_id as id FROM itinerary_publications WHERE source_itinerary_id = ? AND user_id = ?')
      .bind(sourceId, userId)
      .first<{ id: string }>() : await this.db
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ? LIMIT 1')
      .bind(sourceId)
      .first<{ id: string }>();

    if (!existing) {
      const newId = generateId();
      const stepStatements = rows.map(row =>
        this.db
          .prepare(`INSERT INTO steps (id, itinerary_id, title, start_at, end_at,
            scheduled_start_at, scheduled_end_at, time_unspecified, location, notes, notes_text, link,
            type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
            source_step_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.snapshot_step_id, newId, row.title,
            row.start_at ?? row.legacy_start_at ?? Date.now(), row.end_at ?? row.legacy_end_at ?? row.start_at ?? Date.now(),
            row.start_at, row.end_at, row.time_unspecified ? 1 : 0,
            row.location, row.notes, row.notes_text, row.link, row.type, row.is_all_day, row.pin_latitude,
            row.pin_longitude, row.is_priority ? 1 : 0, row.sort_order, row.source_step_id ?? null, now, now)
      );
      const moneyStatements = await this.publicMoneyStatements(
        sourceId, newId, rows, memberNames, now, false,
      );

      try {
        await this.db.batch([
          this.db
          .prepare(`INSERT INTO itineraries (id, title, theme_id, palette_id, packing_enabled,
            prefecture_slugs, areas, tags, metadata_initialized, memo, memo_text, password,
            source_itinerary_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL, ?, ?, ?)`)
            .bind(newId, publicTitle, source.theme_id, source.palette_id ?? DEFAULT_PALETTE_ID,
              source.packing_enabled !== false ? 1 : 0, JSON.stringify(source.prefecture_slugs ?? []),
              JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []),
              legacyTextJson(publicMemo), publicMemo, sourceId, now, now),
          this.db.prepare(`UPDATE itineraries SET background_image = ?, page_background_image = ?,
            background_display = ? WHERE id = ?`).bind(source.background_image ?? null,
            source.page_background_image ?? null, source.background_display ?? 'cover', newId),
          ...stepStatements,
          ...moneyStatements,
          ...(userId ? [this.db.prepare(`INSERT INTO itinerary_publications
            (source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(sourceId, newId, userId,
              JSON.stringify(source.prefecture_slugs ?? []), JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []), now, now)] : []),
        ]);
        return (await this.get(newId))!;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (!msg.includes('UNIQUE constraint failed')) throw e;
        // Concurrent publish race: fall through to update the snapshot created by the other request
        const concurrent = await this.db
          .prepare('SELECT shared_itinerary_id as id FROM itinerary_publications WHERE source_itinerary_id = ? AND user_id = ?')
          .bind(sourceId, userId ?? '')
          .first<{ id: string }>();
        if (!concurrent) throw e;
        existing = concurrent;
      }
    }

    {
      const sharedId = existing.id;
      const stepStatements = rows.map(row =>
        this.db
          .prepare(`INSERT INTO steps (id, itinerary_id, title, start_at, end_at,
            scheduled_start_at, scheduled_end_at, time_unspecified, location, notes, notes_text, link,
            type, is_all_day, pin_latitude, pin_longitude, is_priority, sort_order,
            source_step_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.snapshot_step_id, sharedId, row.title,
            row.start_at ?? row.legacy_start_at ?? Date.now(), row.end_at ?? row.legacy_end_at ?? row.start_at ?? Date.now(),
            row.start_at, row.end_at, row.time_unspecified ? 1 : 0,
            row.location, row.notes, row.notes_text, row.link, row.type, row.is_all_day, row.pin_latitude,
            row.pin_longitude, row.is_priority ? 1 : 0, row.sort_order, row.source_step_id ?? null, now, now)
      );
      const moneyStatements = await this.publicMoneyStatements(
        sourceId, sharedId, rows, memberNames, now, true,
      );

      await this.db.batch([
        this.db
          .prepare(`UPDATE itineraries SET title = ?, theme_id = ?, palette_id = ?, packing_enabled = ?,
            prefecture_slugs = ?, areas = ?, tags = ?, metadata_initialized = 1,
            memo = ?, memo_text = ?,
            background_image = ?, page_background_image = ?, background_display = ?, updated_at = ? WHERE id = ?`)
          .bind(publicTitle, source.theme_id, source.palette_id ?? DEFAULT_PALETTE_ID,
            source.packing_enabled !== false ? 1 : 0, JSON.stringify(source.prefecture_slugs ?? []),
            JSON.stringify(source.areas ?? []), JSON.stringify(source.tags ?? []),
            legacyTextJson(publicMemo), publicMemo, source.background_image ?? null,
            source.page_background_image ?? null, source.background_display ?? 'cover', now, sharedId),
        this.db
          .prepare('DELETE FROM steps WHERE itinerary_id = ?')
          .bind(sharedId),
        ...stepStatements,
        ...moneyStatements,
      ]);

      return (await this.get(sharedId))!;
    }
  }

  async delete(id: string): Promise<boolean> {
    // Foreign keys handle dependent rows; a trigger also deletes the published snapshot.
    const result = await this.db
      .prepare('DELETE FROM itineraries WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  private async publicMoneyStatements(
    sourceId: string,
    sharedId: string,
    steps: Array<{ source_step_id?: string; snapshot_step_id: string }>,
    memberNames: string[],
    now: string,
    replace: boolean,
  ) {
    let settings: Record<string, unknown> | null;
    let members: D1Result<Record<string, unknown>>;
    let items: D1Result<Record<string, unknown>>;
    let splits: D1Result<Record<string, unknown>>;
    let fund: D1Result<Record<string, unknown>>;
    try {
      [settings, members, items, splits, fund] = await Promise.all([
        this.db.prepare('SELECT budget_amount FROM itinerary_money_settings WHERE itinerary_id = ?')
          .bind(sourceId).first<Record<string, unknown>>(),
        this.db.prepare('SELECT id FROM itinerary_members WHERE itinerary_id = ? ORDER BY created_at, id')
          .bind(sourceId).all<Record<string, unknown>>(),
        this.db.prepare('SELECT * FROM itinerary_money_items WHERE itinerary_id = ? ORDER BY created_at, id')
          .bind(sourceId).all<Record<string, unknown>>(),
        this.db.prepare('SELECT item_id, member_id, amount FROM itinerary_money_item_splits WHERE itinerary_id = ? ORDER BY rowid')
          .bind(sourceId).all<Record<string, unknown>>(),
        this.db.prepare('SELECT * FROM itinerary_money_fund_transactions WHERE itinerary_id = ? ORDER BY created_at, id')
          .bind(sourceId).all<Record<string, unknown>>(),
      ]);
    } catch (error) {
      // Some isolated tests and older development databases do not have the optional money tables yet.
      if (error instanceof Error && error.message.includes('no such table')) return [];
      throw error;
    }

    const memberMap = new Map<string, string>();
    const itemMap = new Map<string, string>();
    const stepMap = new Map(steps
      .filter((step) => step.source_step_id)
      .map((step) => [step.source_step_id!, step.snapshot_step_id]));
    const statements = replace ? [
      this.db.prepare('DELETE FROM itinerary_money_item_splits WHERE itinerary_id = ?').bind(sharedId),
      this.db.prepare('DELETE FROM itinerary_money_items WHERE itinerary_id = ?').bind(sharedId),
      this.db.prepare('DELETE FROM itinerary_money_fund_transactions WHERE itinerary_id = ?').bind(sharedId),
      this.db.prepare('DELETE FROM itinerary_money_settings WHERE itinerary_id = ?').bind(sharedId),
      this.db.prepare('DELETE FROM itinerary_members WHERE itinerary_id = ?').bind(sharedId),
    ] : [];

    (members.results ?? []).forEach((member, index) => {
      const id = generateId();
      memberMap.set(String(member.id), id);
      statements.push(this.db.prepare(
        'INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)',
      ).bind(id, sharedId, `${this.anonymousMemberLabel(index)}さん`, now));
    });

    if (settings) {
      statements.push(this.db.prepare(
        'INSERT INTO itinerary_money_settings (itinerary_id, budget_amount, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ).bind(sharedId, settings.budget_amount ?? null, now, now));
    }

    for (const item of items.results ?? []) {
      const id = generateId();
      itemMap.set(String(item.id), id);
      statements.push(this.db.prepare(`INSERT INTO itinerary_money_items
        (id, itinerary_id, title, amount, paid_by_member_id, paid_from_fund, status,
         occurred_on, step_id, is_settled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id,
        sharedId,
        createPublicTextSnapshot(String(item.title), memberNames) || '支出',
        item.amount,
        item.paid_by_member_id ? memberMap.get(String(item.paid_by_member_id)) ?? null : null,
        item.paid_from_fund,
        item.status,
        item.occurred_on,
        item.step_id ? stepMap.get(String(item.step_id)) ?? null : null,
        item.is_settled,
        now,
        now,
      ));
    }

    for (const split of splits.results ?? []) {
      const itemId = itemMap.get(String(split.item_id));
      const memberId = memberMap.get(String(split.member_id));
      if (itemId && memberId) {
        statements.push(this.db.prepare(`INSERT INTO itinerary_money_item_splits
          (item_id, member_id, itinerary_id, amount) VALUES (?, ?, ?, ?)`)
          .bind(itemId, memberId, sharedId, split.amount));
      }
    }

    for (const entry of fund.results ?? []) {
      const memberId = memberMap.get(String(entry.member_id));
      if (memberId) {
        statements.push(this.db.prepare(`INSERT INTO itinerary_money_fund_transactions
          (id, itinerary_id, member_id, kind, amount, note, occurred_on, created_at)
          VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`)
          .bind(generateId(), sharedId, memberId, entry.kind, entry.amount, entry.occurred_on, now));
      }
    }

    return statements;
  }

  private anonymousMemberLabel(index: number): string {
    let value = index + 1;
    let label = '';
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return label;
  }

  private mapToItinerary(row: Record<string, unknown>): Itinerary {
    const itinerary: Itinerary = {
      id: row.id as string,
      title: row.title as string,
      theme_id: normalizeThemeId(row.theme_id as string),
      palette_id: (row.palette_id as string) || DEFAULT_PALETTE_ID,
      packing_enabled: row.packing_enabled !== 0,
      prefecture_slugs: this.parseStringArray(row.prefecture_slugs),
      areas: this.parseStringArray(row.areas),
      tags: this.parseStringArray(row.tags),
      metadata_initialized: row.metadata_initialized !== 0,
      memo: (row.memo_text as string | null | undefined) ?? '',
      background_image: (row.background_image as string | null | undefined) ?? null,
      page_background_image: (row.page_background_image as string | null | undefined) ?? null,
      background_display: row.background_display === 'page' ? 'page' : 'cover',
      password: row.password as string | null | undefined,
      fork_count: (row.fork_count as number) ?? 0,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    if (row.secret_enabled !== null && row.secret_enabled !== undefined) {
      itinerary.secret_settings = {
        enabled: row.secret_enabled === 1,
        offset_minutes: row.secret_offset as number,
      };
    }

    if (row.source_itinerary_id) {
      itinerary.source_itinerary_id = row.source_itinerary_id as string;
    }

    return itinerary;
  }

  private parseStringArray(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  // フロントエンド用：パスワード除外したレスポンスを返す
  toResponseItinerary(itinerary: Itinerary, includePrivateSettings = false) {
    const { password: _, secret_settings, ...rest } = itinerary;
    return {
      ...rest,
      ...(includePrivateSettings && secret_settings ? { secret_settings } : {}),
      is_password_protected: !!itinerary.password,
    };
  }
}
