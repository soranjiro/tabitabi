import type { PlanGraphNode, PlanGraphEdge } from '@tabitabi/types';
import { createPublicTextSnapshot } from './publication';

export function publicGraph(nodes: PlanGraphNode[], edges: PlanGraphEdge[], names: string[] = []) {
  const clean = (text: string) => createPublicTextSnapshot(text, names);
  return {
    nodes: nodes.map(node => ({ ...node, title: clean(node.title) || '予定', location: clean(node.location),
      notes: clean(node.notes), link: '', participants: [], options: node.options.map(option => ({
        ...option, title: clean(option.title) || '候補', provider: clean(option.provider),
        from: clean(option.from), to: clean(option.to), cancellation: clean(option.cancellation), notes: clean(option.notes), url: '',
      })),
    })),
    edges: edges.map(edge => ({ ...edge, label: clean(edge.label) })),
  };
}
