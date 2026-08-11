import type { TripMember } from './trip-member';

export type PackingItemKind = 'personal' | 'shared';

export interface PackingItem {
  id: string;
  itinerary_id: string;
  name: string;
  kind: PackingItemKind;
  assignee_member_id: string | null;
  is_packed: boolean;
  checked_member_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PackingData {
  members: TripMember[];
  items: PackingItem[];
}

export interface CreatePackingItemInput {
  name: string;
  kind: PackingItemKind;
  assignee_member_id?: string | null;
}

export interface UpdatePackingItemInput extends Partial<CreatePackingItemInput> {}

export interface UpdatePackingCheckInput {
  member_id?: string | null;
  checked: boolean;
}
