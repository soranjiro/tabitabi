export type MoneyItemStatus = 'paid' | 'planned';

import type { TripMember } from './trip-member';

/** @deprecated Use TripMember. Kept as an alias for existing money consumers. */
export type MoneyMember = TripMember;

export interface MoneyItem {
  id: string;
  itinerary_id: string;
  title: string;
  amount: number;
  paid_by_member_id: string | null;
  status: MoneyItemStatus;
  /** Whether the reimbursement for this confirmed expense has been settled. */
  is_settled: boolean;
  occurred_on: string | null;
  step_id: string | null;
  split_member_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface MoneyData {
  budget_amount: number | null;
  members: MoneyMember[];
  items: MoneyItem[];
}

export interface CreateMoneyItemInput {
  title: string;
  amount: number;
  paid_by_member_id?: string | null;
  status: MoneyItemStatus;
  is_settled?: boolean;
  occurred_on?: string | null;
  step_id?: string | null;
  split_member_ids: string[];
}

export interface UpdateMoneyItemInput extends Partial<CreateMoneyItemInput> {}
