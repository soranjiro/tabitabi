import type { ComparisonOption } from './comparison';
import type { StepType } from './step';

/** A Step-like planning node. Edges form a directed acyclic graph. */
export interface PlanGraphNode {
  id: string;
  kind: 'step' | 'choices';
  title: string;
  type: StepType;
  start_local: string;
  end_local: string;
  location: string;
  notes: string;
  link: string;
  amount: number | null;
  currency: string;
  participants: string[];
  options: ComparisonOption[];
  selected_option_id: string | null;
}

export interface PlanGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface PlanGraph {
  itinerary_id: string;
  revision: number;
  nodes: PlanGraphNode[];
  edges: PlanGraphEdge[];
  updated_at: string | null;
}

export interface UpdatePlanGraphInput {
  revision: number;
  nodes: PlanGraphNode[];
  edges: PlanGraphEdge[];
}
