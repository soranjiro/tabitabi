export type MoneyItemStatus = 'paid' | 'planned';

import type { TripMember } from './trip-member';

/** @deprecated Use TripMember. Kept as an alias for existing money consumers. */
export type MoneyMember = TripMember;

export interface MoneyItemSplit {
  member_id: string;
  amount: number;
}

export interface MoneyItem {
  id: string;
  itinerary_id: string;
  title: string;
  amount: number;
  paid_by_member_id: string | null;
  /** Whether this expense was paid out of the shared trip fund. */
  paid_from_fund: boolean;
  status: MoneyItemStatus;
  /** Whether the reimbursement for this confirmed expense has been settled. */
  is_settled: boolean;
  occurred_on: string | null;
  step_id: string | null;
  /** Per-member responsibility. Amounts always add up to the item total. */
  splits: MoneyItemSplit[];
  /** @deprecated Use splits. Kept for older clients. */
  split_member_ids: string[];
  created_at: string;
  updated_at: string;
}

export type MoneyFundTransactionKind = 'contribution' | 'refund';

export interface MoneyFundTransaction {
  id: string;
  itinerary_id: string;
  member_id: string;
  kind: MoneyFundTransactionKind;
  amount: number;
  note: string | null;
  occurred_on: string;
  created_at: string;
}

export interface MoneyData {
  budget_amount: number | null;
  members: MoneyMember[];
  items: MoneyItem[];
  fund_transactions: MoneyFundTransaction[];
}

export interface CreateMoneyItemInput {
  title: string;
  amount: number;
  paid_by_member_id?: string | null;
  paid_from_fund?: boolean;
  status: MoneyItemStatus;
  is_settled?: boolean;
  occurred_on?: string | null;
  step_id?: string | null;
  splits?: MoneyItemSplit[];
  /** @deprecated Use splits. When supplied alone, the amount is split evenly. */
  split_member_ids?: string[];
}

export interface UpdateMoneyItemInput extends Partial<CreateMoneyItemInput> {}

export interface CreateMoneyFundTransactionInput {
  member_id: string;
  kind: MoneyFundTransactionKind;
  amount: number;
  note?: string | null;
  occurred_on?: string;
}
