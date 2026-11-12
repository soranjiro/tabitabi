import { Hono } from 'hono';
import type { Env } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { StepService } from '../services/step.service';
import { mcpUserId, mcpResource } from './mcp-auth';

const mcp = new Hono<{ Bindings: Env }>();
const securitySchemes = [{ type: 'oauth2', scopes: ['itineraries:read', 'itineraries:write'] }];
const stringField = { type: 'string' } as const;
const tools = [
  {
    name: 'list_itineraries',
    title: 'アカウントのしおり一覧',
    description: 'tabitabiアカウントに保存したしおりと、編集権限を紐付けたしおりを一覧表示します。can_edit が true の場合だけ変更できます。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_itinerary',
    title: 'しおりと予定を確認',
    description: 'アカウントに保存したしおりのタイトル・URL・予定を取得します。編集権限がない保護付きしおりの予定や、未公開のシークレット予定は取得できません。can_edit が true の場合だけ変更できます。',
    inputSchema: { type: 'object', properties: { itinerary_id: stringField }, required: ['itinerary_id'], additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_step',
    title: 'しおりに予定を追加',
    description: '旅行の予定を1件作成します。start_at/end_at はUTC Unixミリ秒です。日付未定なら null にしてください。重複がないか先にget_itineraryで確認してください。',
    inputSchema: {
      type: 'object',
      properties: {
        itinerary_id: stringField,
        title: stringField,
        start_at: { type: ['number', 'null'], description: 'Unix時刻（ミリ秒）、未定ならnull' },
        end_at: { type: ['number', 'null'] },
        location: stringField,
        notes: stringField,
        time_unspecified: { type: 'boolean' },
      },
      required: ['itinerary_id', 'title', 'start_at'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'update_step',
    title: 'しおりの予定を変更',
    description: '対象予定を更新します。変更前にget_itineraryで必ずstep_idを確認してください。時刻はUnixミリ秒です。',
    inputSchema: {
      type: 'object',
      properties: {
        itinerary_id: stringField,
        step_id: stringField,
        title: stringField,
        start_at: { type: ['number', 'null'] },
        end_at: { type: ['number', 'null'] },
        location: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
        time_unspecified: { type: 'boolean' },
      },
      required: ['itinerary_id', 'step_id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
].map(tool => ({ ...tool, _meta: { securitySchemes } }));

function response(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } });
}
function failure(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: { 'Cache-Control': 'no-store' } });
}
function output(value: unknown, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError };
}
type Args = Record<string, unknown>;
function isString(value: unknown, max: number, nonempty = false): value is string {
  return typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0);
}
function isDate(value: unknown) {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}
function invalidFields(args: Args, fields: Array<[keyof Args, number]>) {
  return fields.some(([key, limit]) => args[key] !== undefined && args[key] !== null && !isString(args[key], limit));
}
async function accessFor(env: Env, userId: string, id: string) {
  const row = await env.DB.prepare(`
    SELECT
      EXISTS(SELECT 1 FROM user_bookmarks b WHERE b.itinerary_id = i.id AND b.user_id = ?) AS is_saved,
      EXISTS(SELECT 1 FROM itinerary_editor_grants g WHERE g.itinerary_id = i.id AND g.user_id = ?) AS can_edit
    FROM itineraries i WHERE i.id = ? AND i.source_itinerary_id IS NULL
  `).bind(userId, userId, id).first<{ is_saved: number; can_edit: number }>();
  return { isSaved: Boolean(row?.is_saved), canEdit: Boolean(row?.can_edit) };
}
async function invoke(env: Env, userId: string, name: string, args: Args) {
  if (name === 'list_itineraries') {
    const result = await env.DB.prepare(`
      SELECT i.id, i.title, i.updated_at,
        EXISTS(SELECT 1 FROM itinerary_editor_grants g WHERE g.itinerary_id = i.id AND g.user_id = ?) AS can_edit
      FROM itineraries i
      WHERE i.source_itinerary_id IS NULL
        AND (EXISTS(SELECT 1 FROM user_bookmarks b WHERE b.itinerary_id = i.id AND b.user_id = ?)
          OR EXISTS(SELECT 1 FROM itinerary_editor_grants g WHERE g.itinerary_id = i.id AND g.user_id = ?))
      ORDER BY i.updated_at DESC LIMIT 100
    `).bind(userId, userId, userId).all<{ id: string; title: string; updated_at: string; can_edit: number }>();
    return output((result.results ?? []).map(row => ({
      id: row.id, title: row.title, updated_at: row.updated_at,
      can_edit: Boolean(row.can_edit),
      url: (env.APP_ORIGIN || 'https://tabitabi.pages.dev') + '/itineraries/' + encodeURIComponent(row.id),
    })));
  }
  const id = args.itinerary_id;
  if (!isString(id, 128, true)) return output({ error: '正しいしおりIDを指定してください。' }, true);
  const access = await accessFor(env, userId, id);
  if (name === 'get_itinerary') {
    if (!access.isSaved && !access.canEdit) return output({ error: 'このアカウントに保存されていないしおりです。' }, true);
    const itineraryService = new ItineraryService(env.DB, env);
    const itinerary = await itineraryService.get(id);
    if (!itinerary) return output({ error: 'しおりが見つかりません。' }, true);
    const isProtected = Boolean(itinerary.password);
    const secret = itinerary.secret_settings?.enabled;
    const entries = (isProtected && !access.canEdit) ? [] : await new StepService(env.DB).list(id,
      secret && !access.canEdit ? { currentTime: Date.now(), offsetMinutes: itinerary.secret_settings?.offset_minutes ?? 60, maskSecrets: true } : undefined);
    return output({
      id, title: itinerary.title, can_edit: access.canEdit,
      url: (env.APP_ORIGIN || 'https://tabitabi.pages.dev') + '/itineraries/' + encodeURIComponent(id),
      ...(isProtected && !access.canEdit ? { notice: 'パスワード保護されたしおりです。予定を読むには編集権限をアカウントに紐付けてください。' } : {}),
      steps: entries.filter(s => access.canEdit || !s.is_hidden).map(s => ({
        id: s.id, title: s.title, start_at: s.start_at, end_at: s.end_at,
        time_unspecified: s.time_unspecified, location: s.location,
        ...(access.canEdit ? { notes: s.notes } : {}),
      })),
    });
  }
  if (!access.canEdit) {
    return output({ error: 'このアカウントには編集権限がありません。閲覧用に保存しただけでは編集できません。' }, true);
  }
  const steps = new StepService(env.DB);
  if (name === 'add_step') {
    if (!isString(args.title, 200, true) || !Object.hasOwn(args, 'start_at') || !isDate(args.start_at) ||
      (args.end_at !== undefined && !isDate(args.end_at)) ||
      invalidFields(args, [['location', 1000], ['notes', 10000]]) ||
      (args.time_unspecified !== undefined && typeof args.time_unspecified !== 'boolean')) {
      return output({ error: '予定の入力が不正です。' }, true);
    }
    const created = await steps.create({
      itinerary_id: id,
      title: args.title,
      start_at: args.start_at as number | null,
      ...(args.end_at !== undefined ? { end_at: args.end_at as number | null } : {}),
      ...(typeof args.location === 'string' ? { location: args.location } : {}),
      ...(typeof args.notes === 'string' ? { notes: args.notes } : {}),
      ...(typeof args.time_unspecified === 'boolean' ? { time_unspecified: args.time_unspecified } : {}),
    });
    return output({ id: created.id, title: created.title, itinerary_id: id, saved: true });
  }
  if (name === 'update_step') {
    if (!isString(args.step_id, 128, true) ||
      invalidFields(args, [['title', 200], ['location', 1000], ['notes', 10000]]) ||
      (args.title !== undefined && !isString(args.title, 200, true)) ||
      (args.start_at !== undefined && !isDate(args.start_at)) ||
      (args.end_at !== undefined && !isDate(args.end_at)) ||
      (args.time_unspecified !== undefined && typeof args.time_unspecified !== 'boolean')) {
      return output({ error: '更新内容が不正です。' }, true);
    }
    const existing = await steps.get(args.step_id);
    if (!existing || existing.itinerary_id !== id) return output({ error: '指定された予定が見つかりません。' }, true);
    const changes = Object.fromEntries(
      ['title', 'start_at', 'end_at', 'location', 'notes', 'time_unspecified']
        .filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]),
    );
    if (Object.keys(changes).length === 0) return output({ error: '更新する項目がありません。' }, true);
    const updated = await steps.update(args.step_id, changes);
    if (!updated) return output({ error: '更新対象の予定が見つかりません。' }, true);
    return output({ id: updated.id, title: updated.title, itinerary_id: id, saved: true });
  }
  return output({ error: '不明な操作です。' }, true);
}

// Stateless Streamable HTTP: one JSON-RPC response per POST; no server-initiated SSE.
mcp.post('/mcp', async c => {
  const len = Number(c.req.header('Content-Length') || '0');
  if (len > 32_768) return failure(null, -32600, 'Request too large');
  const raw = await c.req.text();
  if (raw.length > 32_768) return failure(null, -32600, 'Request too large');
  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: { name?: string; arguments?: Args } };
  try { body = JSON.parse(raw); } catch { return failure(null, -32700, 'Parse error'); }
  if (!body || body.jsonrpc !== '2.0') return failure(null, -32600, 'Invalid request');
  if (!Object.hasOwn(body, 'id')) return c.body(null, 202);
  if (body.method === 'initialize') return response(body.id, {
    protocolVersion: '2025-03-26',
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'tabitabi', version: '0.1.0' },
  });
  if (body.method === 'ping') return response(body.id, {});
  if (body.method === 'tools/list') return response(body.id, { tools });
  if (body.method !== 'tools/call') return failure(body.id, -32601, 'Method not found');
  const userId = await mcpUserId(c);
  if (!userId) {
    c.header('WWW-Authenticate', 'Bearer resource_metadata="' + new URL(c.req.url).origin + '/.well-known/oauth-protected-resource"');
    return c.json({ jsonrpc: '2.0', id: body.id, error: { code: -32001, message: 'Authorization required',
      data: { _meta: { 'mcp/www_authenticate': ['Bearer resource_metadata="' + new URL(c.req.url).origin + '/.well-known/oauth-protected-resource"'] } } } }, 401);
  }
  const name = body.params?.name;
  if (!name || !tools.some(tool => tool.name === name)) return failure(body.id, -32602, 'Unknown tool');
  const args = body.params?.arguments ?? {};
  if (!args || typeof args !== 'object' || Array.isArray(args)) return failure(body.id, -32602, 'Invalid arguments');
  try {
    return response(body.id, await invoke(c.env, userId, name, args));
  } catch {
    return response(body.id, output({ error: '更新に失敗しました。日付や入力値を確認してください。' }, true));
  }
});
mcp.get('/mcp', c => c.body(null, 405));
mcp.delete('/mcp', c => c.body(null, 405));

export default mcp;
