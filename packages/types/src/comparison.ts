/** A comparison is a private planning workspace, not an itinerary Step. */
export type ComparisonKind = 'flight' | 'stay' | 'transport' | 'other';

/** Time strings are local to each departure/arrival city; do not convert without a time zone. */
export interface ComparisonOption {
  id: string;
  title: string;
  provider: string;
  amount: number | null;
  currency: string;
  start_local: string;
  end_local: string;
  from: string;
  to: string;
  cancellation: string;
  url: string;
  notes: string;
}

export interface ComparisonGroup {
  id: string;
  itinerary_id: string;
  title: string;
  kind: ComparisonKind;
  options: ComparisonOption[];
  selected_option_id: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface CreateComparisonGroupInput {
  title: string;
  kind: ComparisonKind;
}

export interface UpdateComparisonGroupInput {
  revision: number;
  title?: string;
  options?: ComparisonOption[];
  selected_option_id?: string | null;
}
