import { describe, expect, it } from 'vitest';
import type { PlanGraphNode, PlanGraphEdge } from '@tabitabi/types';
import { buildMobileComparisonGrid, type MobileDrawNode } from './mobile-grid-layout';

const node = (id: string, x: number, y: number): MobileDrawNode => ({
  node: { id, title: id, start_local: '2026-11-19T10:00' } as PlanGraphNode,
  x, y, color: '#6499be', label: '',
});
const edge = (from: string, to: string, label = ''): PlanGraphEdge =>
  ({ id: from + '-' + to, from, to, label });

describe('mobile comparison layout', () => {
  it('shows each Step once after repeated branching and joining (no cartesian product)', () => {
    const nodes = [
      node('start', 495, 100), node('a', 310, 200), node('b', 680, 200),
      node('join', 495, 300), node('c', 310, 400), node('d', 680, 400),
      node('end', 495, 500),
    ];
    const edges = [
      edge('start', 'a', 'プランA'), edge('start', 'b', 'プランB'),
      edge('a', 'join'), edge('b', 'join'),
      edge('join', 'c', 'プランC'), edge('join', 'd', 'プランD'),
      edge('c', 'end'), edge('d', 'end'),
    ];
    const result = buildMobileComparisonGrid(nodes, edges);
    expect(result.laneCount).toBe(2);
    expect(result.laneLabels).toEqual(['プランA', 'プランB']);
    const entries = result.rows.flatMap(row => row.entries);
    expect(entries.map(entry => entry.item.node.id)).toEqual(['start', 'a', 'b', 'join', 'c', 'd', 'end']);
    expect(new Set(entries.map(entry => entry.item.node.id)).size).toBe(nodes.length);
    expect(entries.filter(entry => entry.shared).map(entry => entry.item.node.id))
      .toEqual(['start', 'join', 'end']);
    expect(entries.filter(entry => ['a', 'b', 'c', 'd'].includes(entry.item.node.id))
      .map(entry => entry.column)).toEqual([0, 1, 0, 1]);
  });

  it('does not wrongly mark independent schedules as shared', () => {
    const result = buildMobileComparisonGrid(
      [node('first', 310, 100), node('second', 680, 200)], [],
    );
    expect(result.laneCount).toBe(2);
    expect(result.rows.flatMap(row => row.entries.map(entry => entry.shared))).toEqual([false, false]);
    expect(result.rows.flatMap(row => row.entries.map(entry => entry.column))).toEqual([0, 1]);
  });

  it('uses three lanes when three events are parallel and keeps each one unique', () => {
    const result = buildMobileComparisonGrid([
      node('start', 500, 100), node('a', 310, 200),
      node('b', 500, 200), node('c', 690, 200),
    ], [edge('start', 'a'), edge('start', 'b'), edge('start', 'c')]);
    expect(result.laneCount).toBe(3);
    expect(result.rows[1].entries.map(entry => entry.column)).toEqual([0, 1, 2]);
    expect(result.rows[0].entries[0].shared).toBe(true);
  });

  it('does not duplicate a partially shared stop even when other branches exist', () => {
    const result = buildMobileComparisonGrid([
      node('root', 500, 100), node('a', 310, 200), node('b', 680, 200),
      node('a1', 310, 300), node('b1', 680, 300),
      node('a2', 310, 400), node('end', 500, 500),
    ], [
      edge('root', 'a'), edge('root', 'b'), edge('a', 'a1'),
      edge('a1', 'a2'), edge('b', 'b1'),
      edge('a2', 'end'), edge('b1', 'end'),
    ]);
    const entries = result.rows.flatMap(row => row.entries);
    expect(entries.map(entry => entry.item.node.id).filter(id => id === 'a1')).toHaveLength(1);
    expect(entries.find(entry => entry.item.node.id === 'a1')?.shared).toBe(false);
    expect(entries.find(entry => entry.item.node.id === 'end')?.shared).toBe(true);
  });
});
