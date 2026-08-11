<script lang="ts">
  import type { TripMember } from '@tabitabi/types';
  import { membersApi } from '$lib/api/members';
  import { demoStorage, getIsDemoMode } from '$lib/demo';

  interface Props { show: boolean; itineraryId: string; }
  let { show, itineraryId }: Props = $props();
  let members = $state<TripMember[]>([]);
  let name = $state('');
  let editingId = $state<string | null>(null);
  let editingName = $state('');
  let loaded = $state(false);
  let error = $state('');

  const isDemo = () => itineraryId === 'demo' || getIsDemoMode();

  async function load() {
    if (loaded) return;
    try { members = isDemo() ? demoStorage.getMembers() : await membersApi.get(itineraryId); }
    catch (e) { error = e instanceof Error ? e.message : 'メンバーを読み込めませんでした'; }
    finally { loaded = true; }
  }
  $effect(() => { if (show) void load(); else loaded = false; });

  function persist(next: TripMember[]) { members = next; demoStorage.setMembers(next); }

  async function add() {
    const value = name.trim();
    if (!value) return;
    try {
      const member = isDemo()
        ? { id: `demo-member-${Date.now()}`, itinerary_id: itineraryId, name: value, created_at: new Date().toISOString() }
        : await membersApi.add(itineraryId, value);
      if (isDemo()) persist([...members, member]); else members = [...members, member];
      name = '';
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバーを追加できませんでした'); }
  }

  async function save(member: TripMember) {
    const value = editingName.trim();
    if (!value) return;
    try {
      if (isDemo()) persist(members.map((item) => item.id === member.id ? { ...item, name: value } : item));
      else {
        const updated = await membersApi.update(itineraryId, member.id, value);
        members = members.map((item) => item.id === member.id ? updated : item);
      }
      editingId = null;
    } catch (e) { alert(e instanceof Error ? e.message : '名前を変更できませんでした'); }
  }

  async function remove(member: TripMember) {
    if (!confirm(`「${member.name}」を削除しますか？`)) return;
    try {
      if (isDemo()) {
        const money = demoStorage.getMoneyData();
        const packing = demoStorage.getPackingData();
        const referenced = money?.items.some((item) => item.paid_by_member_id === member.id || item.split_member_ids.includes(member.id))
          || packing?.items.some((item) => item.assignee_member_id === member.id);
        if (referenced) return alert('このメンバーが担当・参加している項目を先に変更してください。');
        persist(members.filter((item) => item.id !== member.id));
      } else {
        await membersApi.delete(itineraryId, member.id);
        members = members.filter((item) => item.id !== member.id);
      }
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバーを削除できませんでした'); }
  }
</script>

<div class="standard-member-editor">
  <div class="standard-member-add">
    <input aria-label="メンバー名" placeholder="メンバー名" bind:value={name} onkeydown={(event) => event.key === 'Enter' && add()} />
    <button type="button" onclick={add}>追加</button>
  </div>
  {#if error}<p class="standard-member-error">{error}</p>{/if}
  {#if loaded && !members.length}<p class="standard-member-empty">旅行に参加する人を追加してください。</p>{/if}
  <div class="standard-member-list">
    {#each members as member}
      <div class="standard-member-row">
        <span class="standard-member-avatar">{member.name.slice(0, 1)}</span>
        {#if editingId === member.id}
          <input aria-label={`${member.name}の名前`} bind:value={editingName} onkeydown={(event) => event.key === 'Enter' && save(member)} />
          <button type="button" onclick={() => save(member)}>保存</button>
          <button type="button" class="secondary" onclick={() => editingId = null}>戻す</button>
        {:else}
          <strong>{member.name}</strong>
          <button type="button" class="secondary" onclick={() => { editingId = member.id; editingName = member.name; }}>名前変更</button>
          <button type="button" class="delete" onclick={() => remove(member)}>削除</button>
        {/if}
      </div>
    {/each}
  </div>
</div>
