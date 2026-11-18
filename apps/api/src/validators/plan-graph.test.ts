import { describe, expect, it } from 'vitest';
import { STEP_TYPE } from '@tabitabi/types';
import { graphSchema } from './plan-graph';

const node = (id: string, start_local: string) => ({
  id, kind: 'step', title: id, type: STEP_TYPE.NORMAL_GENERAL,
  start_local, end_local: '', location: '', notes: '', link: '',
  amount: null, currency: 'JPY', participants: [], options: [], selected_option_id: null,
});
const graph = (from: string, to: string) => graphSchema.safeParse({
  revision: 0,
  nodes: [node('from', from), node('to', to)],
  edges: [{ id: 'connection', from: 'from', to: 'to', label: '' }],
});

describe('plan graph date precision', () => {
  it('allows a date-only stop and timed stop in the same day in either order', () => {
    expect(graph('2026-12-10T18:00', '2026-12-10').success).toBe(true);
    expect(graph('2026-12-10', '2026-12-10T09:00').success).toBe(true);
  });

  it('rejects actual reverse date or precise time connections', () => {
    expect(graph('2026-12-11', '2026-12-10T23:00').success).toBe(false);
    expect(graph('2026-12-10T18:00', '2026-12-10T09:00').success).toBe(false);
  });
});
