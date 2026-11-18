import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import schema from '../../db/schema.sql?raw';
import { ItineraryService } from '../src/services/itinerary.service';
import { StepService } from '../src/services/step.service';
import app from '../src/index';
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

async function trip() {
  const book = await books().create({ title: 'Storage regression', memo: '旅のメモ' });
  const first = await steps().create({ itinerary_id: book.id, title: 'First', start_at: 1800000000000,
    end_at: 1800003600000, notes: '最初の予定' });
  const second = await steps().create({ itinerary_id: book.id, title: 'Second', start_at: 1800090000000,
    end_at: 1800093600000, notes: '次の予定' });
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
    await steps().update(first.id, { notes: literal });
    const shared = await books().publish(book.id);
    expect((await steps().list(shared.id))[0].notes).toBe(literal);
    const fork = await books().fork(shared.id);
    expect((await steps().list(fork.itinerary.id))[0].notes).toBe(literal);
    expect((await steps().list(book.id))[0].notes).toBe(literal);
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
    const content = bookContentSchema.parse({ itinerary: { title: 'Copy', memo: '' },
      steps: [{ title: 'Candidate', start_at: null, end_at: null, notes: 'keep', type: 'normal:general' }] });
    const fork = await books().fork(book.id, content);
    expect((await steps().list(fork.itinerary.id))[0]).toMatchObject({ title: 'Candidate', start_at: null, notes: 'keep' });
  });

  it('publishes a sanitized independent planning graph and updates it on republish', async () => {
    const { book } = await trip();
    const node = {
      id: 'start', kind: 'step', title: '東京へ移動', type: 'transport:plane',
      start_local: '2026-12-10T10:00', end_local: '2026-12-10T11:00',
      location: '羽田空港', notes: '予約番号: ABCD1234 / 自由入力の秘密 PRIVATE-NODE-2718',
      link: 'https://example.com/booking?token=secret', amount: 15800, currency: 'JPY',
      participants: ['Alice'], options: [], selected_option_id: null,
    };
    await env.DB.prepare(
      'INSERT INTO itinerary_plan_graphs (itinerary_id, nodes_json, edges_json, revision, updated_at) VALUES (?, ?, ?, 1, ?)',
    ).bind(book.id, JSON.stringify([node]), JSON.stringify([]), '2026-11-16T00:00:00.000Z').run();
    const originalOption = {
      id: 'flight-1', title: '直行便', provider: '航空会社', amount: 15800,
      currency: 'JPY', start_local: '2026-12-10T10:00', end_local: '2026-12-10T11:00',
      from: '関西空港', to: '羽田空港', cancellation: '変更条件に秘密 PRIVATE-CANCEL-2718',
      url: 'https://example.com/booking?token=secret', notes: '番号なしの秘密 PRIVATE-OPTION-2718',
    };
    await env.DB.prepare(
      'INSERT INTO itinerary_comparison_groups (id, itinerary_id, title, kind, options_json, selected_option_id, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
    ).bind('test-group-' + book.id, book.id, '飛行機の候補', 'flight', JSON.stringify([originalOption]),
      originalOption.id, '2026-11-16', '2026-11-16').run();
    const published = await books().publish(book.id);
    const publishedGraph = await env.DB.prepare(
      'SELECT nodes_json, edges_json FROM itinerary_plan_graphs WHERE itinerary_id = ?',
    ).bind(published.id).first<{ nodes_json: string; edges_json: string }>();
    expect(publishedGraph).not.toBeNull();
    const [sanitized] = JSON.parse(publishedGraph!.nodes_json);
    expect(sanitized.title).toBe('東京へ移動');
    expect(sanitized.link).toBe('');
    expect(sanitized.participants).toEqual([]);
    expect(sanitized.notes).toBe('');
    const publicGroups = await env.DB.prepare(
      'SELECT options_json FROM itinerary_comparison_groups WHERE itinerary_id = ?',
    ).bind(published.id).all<{ options_json: string }>();
    expect(publicGroups.results).toHaveLength(1);
    const [publicOption] = JSON.parse(publicGroups.results[0].options_json);
    expect(publicOption.url).toBe('');
    expect(publicOption.notes).toBe('');
    expect(publicOption.cancellation).toBe('');
    // Anonymous published endpoints must not return confidential free text.
    const [graphResponse, candidatesResponse] = await Promise.all([
      app.request('/api/v1/itineraries/' + published.id + '/plan-graph', {}, env),
      app.request('/api/v1/itineraries/' + published.id + '/comparisons', {}, env),
    ]);
    expect(graphResponse.status).toBe(200);
    expect(candidatesResponse.status).toBe(200);
    const publicPayload = JSON.stringify([await graphResponse.json(), await candidatesResponse.json()]);
    for (const secret of ['PRIVATE-NODE-2718', 'PRIVATE-CANCEL-2718', 'PRIVATE-OPTION-2718', 'token=secret']) {
      expect(publicPayload).not.toContain(secret);
    }
    const preview = await publications().read(book.id, true);
    expect(preview.planGraph?.nodes[0].notes).toBe('');
    expect(preview.planGraph?.nodes[0].options).toEqual([]);
    expect((await env.DB.prepare('SELECT nodes_json FROM itinerary_plan_graphs WHERE itinerary_id = ?')
      .bind(book.id).first<{ nodes_json: string }>())!.nodes_json).toContain('token=secret');

    node.title = '移動先を変更';
    await env.DB.prepare('UPDATE itinerary_plan_graphs SET nodes_json = ? WHERE itinerary_id = ?')
      .bind(JSON.stringify([node]), book.id).run();
    const republished = await books().publish(book.id);
    expect(republished.id).toBe(published.id);
    const refreshed = await env.DB.prepare('SELECT nodes_json FROM itinerary_plan_graphs WHERE itinerary_id = ?')
      .bind(published.id).first<{ nodes_json: string }>();
    expect(JSON.parse(refreshed!.nodes_json)[0].title).toBe('移動先を変更');
  });

  it('keeps branching edges attached to copied Step IDs in a public snapshot', async () => {
    const { book, first, second } = await trip();
    const graphNode = (step: typeof first) => ({
      id: step.id, kind: 'step', title: step.title, type: 'normal:general',
      start_local: '', end_local: '', location: '', notes: '', link: '',
      amount: null, currency: 'JPY', participants: [], options: [], selected_option_id: null,
    });
    await env.DB.prepare(
      'INSERT INTO itinerary_plan_graphs (itinerary_id, nodes_json, edges_json, revision, updated_at) VALUES (?, ?, ?, 1, ?)',
    ).bind(book.id, JSON.stringify([graphNode(first), graphNode(second)]),
      JSON.stringify([{ id: 'e1', from: first.id, to: second.id, label: '' }]),
      '2026-11-16T00:00:00.000Z').run();
    const shared = await books().publish(book.id);
    const copied = await env.DB.prepare(
      'SELECT id, source_step_id FROM steps WHERE itinerary_id = ?',
    ).bind(shared.id).all<{ id: string; source_step_id: string }>();
    const bySource = new Map(copied.results.map(step => [step.source_step_id, step.id]));
    const data = await env.DB.prepare(
      'SELECT nodes_json, edges_json FROM itinerary_plan_graphs WHERE itinerary_id = ?',
    ).bind(shared.id).first<{ nodes_json: string; edges_json: string }>();
    const nodes = JSON.parse(data!.nodes_json) as { id: string }[];
    const edges = JSON.parse(data!.edges_json) as { from: string; to: string }[];
    expect(nodes.map(node => node.id)).toEqual([bySource.get(first.id), bySource.get(second.id)]);
    expect(edges).toEqual([{ id: 'e1', from: bySource.get(first.id), to: bySource.get(second.id), label: '' }]);
    expect(JSON.stringify(data)).not.toContain(first.id);
    expect(JSON.stringify(data)).not.toContain(second.id);
  });
});

describe('planning content snapshots', () => {
  it('carries edited preview graphs through publication and copy with remapped Step IDs', async () => {
    const { book, first, second } = await trip();
    const node = (id: string, title: string) => ({ id,title,kind:'step' as const,type:'normal:general' as const,
      start_local:'',end_local:'',location:'',notes:'',link:'',amount:null,currency:'JPY',participants:[],options:[],selected_option_id:null });
    const planGraph = { itinerary_id:book.id,updated_at:null,revision:0,
      nodes:[node(first.id,'First'),node(second.id,'Second'),node('preview-new','Preview stop')],
      edges:[{id:'route-one',from:first.id,to:second.id,label:'プラン A'},{id:'route-two',from:first.id,to:'preview-new',label:'プラン B'}] };
    const current = await publications().read(book.id);
    const content = bookContentSchema.parse({ ...current,planGraph,steps:[...current.steps,
      {id:'preview-new',title:'Preview stop',start_at:null,end_at:null,type:'normal:general',notes:''}] });
    const shared = await books().publish(book.id,undefined,undefined,content);
    const graphRow = await env.DB.prepare('SELECT nodes_json, edges_json FROM itinerary_plan_graphs WHERE itinerary_id = ?').bind(shared.id).first<{nodes_json:string;edges_json:string}>();
    const publishedSteps = await steps().list(shared.id);
    const graphNodes = JSON.parse(graphRow!.nodes_json);
    const graphEdges = JSON.parse(graphRow!.edges_json);
    expect(graphNodes).toHaveLength(3);
    expect(graphNodes.every((n: {id:string}) => publishedSteps.some(step=>step.id===n.id))).toBe(true);
    expect(graphEdges.every((e: {from:string;to:string}) => graphNodes.some((n:{id:string})=>n.id===e.from) && graphNodes.some((n:{id:string})=>n.id===e.to))).toBe(true);
    expect(await steps().list(book.id)).toHaveLength(2);
    const copy = await books().fork(shared.id);
    const copyContent = await publications().read(copy.itinerary.id);
    expect(copyContent.planGraph?.nodes).toHaveLength(3);
    expect(copyContent.planGraph?.edges).toHaveLength(2);
    expect(copyContent.planGraph?.nodes.every(node=>copyContent.steps.some(step=>step.id===node.id))).toBe(true);
  });

  it('sanitizes the graph in publication previews and retains it when the theme changes', async () => {
    const { book, first } = await trip();
    const graph = { id:first.id,title:'Hotel',kind:'choices',type:'normal:hotel',start_local:'',end_local:'',location:'Kyoto',
      notes:'予約番号: PRIVATE123',link:'https://example.com/?token=private',amount:9800,currency:'JPY',participants:['Member'],selected_option_id:'hotel-a',
      options:[{id:'hotel-a',title:'Hotel A',provider:'',amount:9800,currency:'JPY',start_local:'',end_local:'',from:'',to:'Kyoto',cancellation:'',notes:'',url:'https://example.com/?token=private'}] };
    await env.DB.prepare('INSERT INTO itinerary_plan_graphs (itinerary_id,nodes_json,edges_json,revision,updated_at) VALUES (?,?,?,1,?)').bind(book.id,JSON.stringify([graph]),'[]','2026-12-01').run();
    const preview = await publications().read(book.id,true);
    expect(JSON.stringify(preview.planGraph)).not.toContain('PRIVATE123');
    expect(JSON.stringify(preview.planGraph)).not.toContain('token=private');
    expect(preview.planGraph?.nodes[0].participants).toEqual([]);
    await books().update(book.id,{theme_id:'list'});
    await books().update(book.id,{theme_id:'planning-draft'});
    const restored = await publications().read(book.id);
    expect(restored.planGraph?.nodes[0].selected_option_id).toBe('hotel-a');
    expect(restored.planGraph?.nodes[0].participants).toEqual(['Member']);
  });

  it('copies multiple preview steps without IDs into distinct Steps', async () => {
    const { book } = await trip();
    const content = bookContentSchema.parse({ itinerary:{title:'Copy',memo:''},steps:[
      {title:'One',start_at:null,end_at:null,type:'normal:general'},
      {title:'Two',start_at:null,end_at:null,type:'normal:general'},
    ] });
    const copy = await books().fork(book.id,content);
    const copied = await steps().list(copy.itinerary.id);
    expect(copied).toHaveLength(2);
    expect(new Set(copied.map(step=>step.id)).size).toBe(2);
  });
});
