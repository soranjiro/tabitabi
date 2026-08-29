import type { PackingGroup } from '@tabitabi/types';

export function shouldPromptForPackingIdentity(memberCount: number, selectedMemberId: string): boolean {
  return memberCount > 0 && !selectedMemberId;
}

export function orderPackingGroups(groups: PackingGroup[]): PackingGroup[] {
  return [...groups].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export function movePackingGroup(groups: PackingGroup[], groupId: string, destinationIndex: number): PackingGroup[] {
  const ordered = orderPackingGroups(groups);
  const currentIndex = ordered.findIndex((group) => group.id === groupId);
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= ordered.length || currentIndex === destinationIndex) return ordered;
  const [group] = ordered.splice(currentIndex, 1);
  ordered.splice(destinationIndex, 0, group);
  return ordered.map((current, sort_order) => ({ ...current, sort_order }));
}
