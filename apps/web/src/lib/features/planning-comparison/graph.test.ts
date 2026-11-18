import { describe, expect, it } from 'vitest';
import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';
import { moveStop, insertCreatedStop, placeExistingStop, chronologicalLinearEdges, isReverseTimeOrder } from './graph';
const nodes = ['start','a','a2','b','b2','end'].map(id => ({ id, start_local: '' }) as PlanGraphNode);
const edge = (from: string, to: string, label = ''): PlanGraphEdge => ({ id: from + to, from, to, label });
const edges = [edge('start','a','東山'),edge('a','a2'),edge('a2','end'),edge('start','b','嵐山'),edge('b','b2'),edge('b2','end')];
let counter = 0;
const newId = () => 'new-' + ++counter;
describe('move a stop between routes', () => {
  it('preserves both routes and inserts only the selected stop after the target', () => {
    const moved = moveStop(nodes, edges, 'a', 'b', newId);
    expect(moved.map(e => [e.from,e.to])).toEqual(expect.arrayContaining([['start','a2'],['b','a'],['a','b2'],['b2','end'],['a2','end']]));
    expect(moved.find(e => e.from === 'start' && e.to === 'a2')?.label).toBe('東山');
    expect(edges).toHaveLength(6); // source is immutable for conflict retries
  });
  it('rejects ambiguous junctions and impossible chronology', () => {
    expect(() => moveStop(nodes, edges, 'end','a',newId)).toThrow('分岐点・合流点');
    expect(() => moveStop(nodes, edges, 'a','start',newId)).toThrow('移動先の分岐');
    const dated = nodes.map(n => ({ ...n, start_local: n.id === 'b' ? '2026-12-10T12:00' : n.id === 'a' ? '2026-12-10T10:00' : '' }));
    expect(() => moveStop(dated,edges,'a','b',newId)).toThrow('時刻が前後');
  });
  it('can move a root while retaining all stops', () => {
    const moved = moveStop(nodes, [edge('a','a2'),edge('b','b2')], 'a','b',newId);
    expect(moved.map(e => [e.from,e.to])).toEqual([['b','a'],['a','b2']]);
  });
});


describe('insertion and merging without duplicating stops', () => {
  const route = ['first', 'second', 'third'].map(id => ({ id, start_local: '' }) as PlanGraphNode);
  const chain = [edge('first', 'second', '観光プラン'), edge('second', 'third')];
  it('inserts a new step between two existing steps and retains the route label', () => {
    const result = insertCreatedStop(
      [...route, { id: 'inserted', start_local: '' } as PlanGraphNode],
      chain, 'inserted', 'first', 'second', newId,
    );
    expect(result.map(value => [value.from, value.to])).toEqual(
      expect.arrayContaining([['first', 'inserted'], ['inserted', 'second'], ['second', 'third']]),
    );
    expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining({ from: 'first', to: 'second' })]));
    expect(result.find(value => value.from === 'first')?.label).toBe('観光プラン');
    expect(chain).toHaveLength(2);
  });
  it('allows insertion before the first and after the last step', () => {
    const newNode = { id: 'new', start_local: '' } as PlanGraphNode;
    const before = insertCreatedStop([...route, newNode], chain, 'new', null, 'first', newId);
    expect(before.some(value => value.from === 'new' && value.to === 'first')).toBe(true);
    const after = insertCreatedStop([...route, newNode], chain, 'new', 'third', null, newId);
    expect(after.some(value => value.from === 'third' && value.to === 'new')).toBe(true);
    expect(() => insertCreatedStop([...route, newNode], chain, 'new', null, 'second', newId)).toThrow('先頭');
  });
  it('moves an existing step before another without leaving its old route broken', () => {
    const moved = placeExistingStop(route, chain, 'third', null, 'first', newId);
    expect(moved.map(value => [value.from, value.to])).toEqual(
      expect.arrayContaining([['third', 'first'], ['first', 'second']]),
    );
    expect(moved).toHaveLength(2);
  });
  it('moves an existing step to an edge without duplicating it', () => {
    const four = [...route, { id: 'other', start_local: '' } as PlanGraphNode];
    const moved = placeExistingStop(four, [...chain], 'other', 'first', 'second', newId);
    expect(moved.map(value => [value.from, value.to])).toEqual(
      expect.arrayContaining([['first', 'other'], ['other', 'second'], ['second', 'third']]),
    );
    expect(moved.filter(value => value.to === 'other')).toHaveLength(1);
  });
  it('rejects ambiguous joins, chronological reversal, and cycles', () => {
    const junction = [...route, { id: 'alternate', start_local: '' } as PlanGraphNode];
    const joined = [...chain, edge('alternate','second')];
    expect(() => placeExistingStop(junction, joined, 'second', 'first', 'third', newId)).toThrow('分岐点・合流点');
    const dated = [...route, { id: 'late', start_local: '2026-12-12T12:00' } as PlanGraphNode]
      .map(node => node.id === 'second' ? { ...node, start_local: '2026-12-11T12:00' } : node);
    expect(() => insertCreatedStop(dated, chain, 'late', 'first', 'second', newId)).toThrow('時刻が前後');
    expect(() => insertCreatedStop([...route, { id: 'new', start_local: '' } as PlanGraphNode],
      chain, 'new', 'third', 'first', newId)).toThrow('接続');
  });
});

describe('chronological sorting of ordinary linear plans', () => {
  it('reorders a linear plan to match its latest step date order', () => {
    const reordered = chronologicalLinearEdges(['third','first','second'],
      [edge('first','second','旅程A'),edge('second','third')], i => 'auto-'+i)!;
    expect(reordered.map(value => [value.from, value.to]))
      .toEqual([['third','first'],['first','second']]);
    expect(reordered[0].label).toBe('旅程A');
  });
  it('does not silently change an actual branch or merge', () => {
    expect(chronologicalLinearEdges(['start','a','b','end'], [
      edge('start','a'),edge('start','b'),edge('a','end'),edge('b','end'),
    ], i => 'auto-'+i)).toBeNull();
  });
});


describe('calendar-only time precision', () => {
  it('accepts unknown times on the same day and rejects backward days', () => {
    expect(isReverseTimeOrder('2026-12-10T18:00', '2026-12-10')).toBe(false);
    expect(isReverseTimeOrder('2026-12-10', '2026-12-10T09:00')).toBe(false);
    expect(isReverseTimeOrder('2026-12-11', '2026-12-10T22:00')).toBe(true);
    expect(isReverseTimeOrder('2026-12-10T18:00', '2026-12-10T09:00')).toBe(true);
  });
  it('does not invent noon for an inserted date-only step', () => {
    const day = [
      { id: 'a', start_local: '2026-12-10T18:00' },
      { id: 'b', start_local: '2026-12-10' },
    ] as PlanGraphNode[];
    expect(insertCreatedStop(day, [], 'b', 'a', null, newId)).toHaveLength(1);
  });
});
