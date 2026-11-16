import { describe, expect, it } from 'vitest';
import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';
import { moveStop } from './graph';
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
