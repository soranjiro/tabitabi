import type { TripMember } from './trip-member';

export type PackingItemKind = 'personal' | 'shared';

export interface PackingGroup {
  id: string;
  itinerary_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  itinerary_id: string;
  name: string;
  quantity: number;
  kind: PackingItemKind;
  group_id: string;
  assignee_member_id: string | null;
  is_packed: boolean;
  checked_member_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PackingData {
  members: TripMember[];
  groups: PackingGroup[];
  items: PackingItem[];
}

export interface CreatePackingItemInput {
  name: string;
  quantity?: number;
  kind: PackingItemKind;
  group_id: string;
  assignee_member_id?: string | null;
}

export interface UpdatePackingItemInput extends Partial<CreatePackingItemInput> {}

export interface UpdatePackingCheckInput {
  member_id?: string | null;
  checked: boolean;
}

export interface CreatePackingGroupInput {
  name: string;
}

export interface UpdatePackingGroupInput {
  name: string;
}
