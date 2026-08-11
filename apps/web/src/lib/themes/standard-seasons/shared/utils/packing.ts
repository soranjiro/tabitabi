export function shouldPromptForPackingIdentity(memberCount: number, selectedMemberId: string): boolean {
  return memberCount > 0 && !selectedMemberId;
}
