<script lang="ts">
  import type { PackingData, PackingItem, PackingItemKind, TripMember } from '@tabitabi/types';
  import { packingApi } from '$lib/api/packing';
  import { membersApi } from '$lib/api/members';
  import { demoStorage, getIsDemoMode } from '$lib/demo';
  import { CloseIcon } from './icons/index.svelte';

  interface Props { show: boolean; itineraryId: string; canEdit: boolean; onClose: () => void; }
  let { show, itineraryId, canEdit, onClose }: Props = $props();
  let data = $state<PackingData>({ members: [], items: [] });
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state('');
  let tab = $state<'mine' | 'everyone'>('mine');
  let meId = $state('');
  let showIdentity = $state(false);
  let showForm = $state(false);
  let editingId = $state<string | null>(null);
  let itemName = $state('');
  let itemKind = $state<PackingItemKind>('personal');
  let assigneeId = $state('');
  let newMemberName = $state('');

  const isDemo = () => itineraryId === 'demo' || getIsDemoMode();
  const me = $derived(data.members.find((member) => member.id === meId));
  const personalItems = $derived(data.items.filter((item) => item.kind === 'personal'));
  const sharedItems = $derived(data.items.filter((item) => item.kind === 'shared'));
  const myPersonal = $derived(personalItems);
  const myAssigned = $derived(sharedItems.filter((item) => item.assignee_member_id === meId));
  const donePersonal = $derived(myPersonal.filter((item) => item.checked_member_ids.includes(meId)).length);
  const doneAssigned = $derived(myAssigned.filter((item) => item.is_packed).length);
  const doneShared = $derived(sharedItems.filter((item) => item.is_packed).length);

  function demoMembers(): TripMember[] {
    const created_at = '2026-08-01T09:00:00.000Z';
    return [
      { id: 'demo-money-miki', itinerary_id: itineraryId, name: '美咲', created_at },
      { id: 'demo-money-haru', itinerary_id: itineraryId, name: '陽介', created_at },
      { id: 'demo-money-yui', itinerary_id: itineraryId, name: '結衣', created_at },
    ];
  }

  function demoData(members: TripMember[]): PackingData {
    const now = '2026-08-01T09:00:00.000Z';
    const item = (id: string, name: string, kind: PackingItemKind, assignee: string | null, packed = false, checked: string[] = []): PackingItem => ({
      id, itinerary_id: itineraryId, name, kind, assignee_member_id: assignee, is_packed: packed,
      checked_member_ids: checked, created_at: now, updated_at: now,
    });
    return { members, items: [
      item('demo-pack-passport', 'パスポート', 'personal', null, false, [members[0]?.id].filter(Boolean) as string[]),
      item('demo-pack-wallet', '財布', 'personal', null, false, members.slice(0, 2).map((member) => member.id)),
      item('demo-pack-phone', 'スマートフォン', 'personal', null),
      item('demo-pack-battery', 'モバイルバッテリー', 'personal', null),
      item('demo-pack-clothes', '着替え', 'personal', null),
      item('demo-pack-camera', 'カメラ', 'shared', members[0]?.id ?? null, true),
      item('demo-pack-wifi', 'Wi-Fiルーター', 'shared', members[1]?.id ?? null),
      item('demo-pack-medicine', '常備薬', 'shared', members[2]?.id ?? null, true),
      item('demo-pack-umbrella', '折りたたみ傘', 'shared', null),
    ] };
  }

  async function load() {
    if (loading || loaded) return;
    loading = true;
    try {
      if (isDemo()) {
        let members = demoStorage.getMembers();
        if (!members.length) { members = demoMembers(); demoStorage.setMembers(members); }
        data = demoStorage.getPackingData() ?? demoData(members);
        data = { ...data, members };
        demoStorage.setPackingData(data);
      } else data = await packingApi.get(itineraryId);
      meId = localStorage.getItem(`tabitabi:packing:me:${itineraryId}`) ?? '';
      if (!data.members.some((member) => member.id === meId)) meId = '';
      showIdentity = !meId;
    } catch (e) { error = e instanceof Error ? e.message : '持ち物を読み込めませんでした'; }
    finally { loading = false; loaded = true; }
  }
  $effect(() => { if (show) void load(); else loaded = false; });

  function persist(next: PackingData) { data = next; demoStorage.setPackingData(next); }
  function selectMe(id: string) { meId = id; localStorage.setItem(`tabitabi:packing:me:${itineraryId}`, id); showIdentity = false; }
  function isChecked(item: PackingItem, memberId = meId) { return item.kind === 'shared' ? item.is_packed : item.checked_member_ids.includes(memberId); }

  async function toggle(item: PackingItem, memberId: string | null = meId) {
    if (!canEdit || (item.kind === 'personal' && !memberId)) return;
    const checked = !isChecked(item, memberId ?? '');
    try {
      if (!isDemo()) await packingApi.updateCheck(itineraryId, item.id, { member_id: item.kind === 'personal' ? memberId : null, checked });
      const items = data.items.map((current) => current.id !== item.id ? current : current.kind === 'shared'
        ? { ...current, is_packed: checked }
        : { ...current, checked_member_ids: checked ? [...current.checked_member_ids, memberId as string] : current.checked_member_ids.filter((id) => id !== memberId) });
      if (isDemo()) persist({ ...data, items }); else data = { ...data, items };
    } catch (e) { alert(e instanceof Error ? e.message : 'チェックを更新できませんでした'); }
  }

  function openAdd() { editingId = null; itemName = ''; itemKind = 'personal'; assigneeId = ''; showForm = true; }
  function openEdit(item: PackingItem) { editingId = item.id; itemName = item.name; itemKind = item.kind; assigneeId = item.assignee_member_id ?? ''; showForm = true; }
  function closeForm() { showForm = false; editingId = null; }

  async function saveItem() {
    const name = itemName.trim();
    if (!name) return;
    const input = { name, kind: itemKind, assignee_member_id: itemKind === 'shared' ? assigneeId || null : null };
    try {
      let item: PackingItem;
      if (isDemo()) {
        const existing = data.items.find((current) => current.id === editingId);
        const now = new Date().toISOString();
        item = existing
          ? { ...existing, ...input, checked_member_ids: itemKind === 'shared' ? [] : existing.checked_member_ids, updated_at: now }
          : { id: `demo-pack-${Date.now()}`, itinerary_id: itineraryId, ...input, is_packed: false, checked_member_ids: [], created_at: now, updated_at: now };
      } else item = editingId ? await packingApi.updateItem(itineraryId, editingId, input) : await packingApi.addItem(itineraryId, input);
      const items = editingId ? data.items.map((current) => current.id === editingId ? item : current) : [...data.items, item];
      if (isDemo()) persist({ ...data, items }); else data = { ...data, items };
      closeForm();
    } catch (e) { alert(e instanceof Error ? e.message : '持ち物を保存できませんでした'); }
  }

  async function remove(item: PackingItem) {
    if (!confirm(`「${item.name}」を削除しますか？`)) return;
    try {
      if (!isDemo()) await packingApi.deleteItem(itineraryId, item.id);
      const next = { ...data, items: data.items.filter((current) => current.id !== item.id) };
      if (isDemo()) persist(next); else data = next;
      closeForm();
    } catch (e) { alert(e instanceof Error ? e.message : '削除できませんでした'); }
  }

  async function changeAssignee(item: PackingItem, id: string) {
    try {
      const updated = isDemo() ? { ...item, assignee_member_id: id || null } : await packingApi.updateItem(itineraryId, item.id, { assignee_member_id: id || null });
      const next = { ...data, items: data.items.map((current) => current.id === item.id ? updated : current) };
      if (isDemo()) persist(next); else data = next;
    } catch (e) { alert(e instanceof Error ? e.message : '担当者を変更できませんでした'); }
  }

  async function addMember() {
    const name = newMemberName.trim();
    if (!name) return;
    try {
      const member: TripMember = isDemo()
        ? { id: `demo-member-${Date.now()}`, itinerary_id: itineraryId, name, created_at: new Date().toISOString() }
        : await membersApi.add(itineraryId, name);
      const next = { ...data, members: [...data.members, member] };
      if (isDemo()) persist(next); else data = next;
      newMemberName = '';
      selectMe(member.id);
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバーを追加できませんでした'); }
  }
</script>

{#if show}
  <div class="standard-packing-overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose()}>
    <div class="standard-packing-panel" role="dialog" aria-modal="true" aria-label="持ち物リスト">
      <header class="standard-packing-header">
        <div><p>TRIP CHECKLIST</p><h2>持ち物</h2></div>
        <button onclick={onClose} aria-label="閉じる">{@html CloseIcon}</button>
      </header>
      {#if loading}<p class="standard-packing-status">読み込み中…</p>
      {:else if error}<p class="standard-packing-status">{error}</p>
      {:else if !data.members.length}
        <div class="standard-packing-empty"><span>👥</span><h3>旅行メンバーを登録しましょう</h3><p>しおり設定の「旅行メンバー」から追加すると、持ち物とお金の管理で共通して使えます。</p></div>
      {:else}
        <button class="standard-packing-me" onclick={() => showIdentity = true}><span>👤 自分</span><strong>{me?.name ?? '選択してください'}</strong><i>⌄</i></button>
        <div class="standard-packing-tabs" role="tablist"><button class:active={tab === 'mine'} onclick={() => tab = 'mine'}>自分</button><button class:active={tab === 'everyone'} onclick={() => tab = 'everyone'}>みんな</button></div>
        {#if canEdit}<button class="standard-packing-add" onclick={openAdd}><span>＋</span> 持ち物を追加</button>{/if}

        {#if tab === 'mine' && me}
          <div class="standard-packing-content">
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>自分の持ち物</h3><span>{donePersonal} / {myPersonal.length}</span></div>
              <div class="standard-packing-list">{#each myPersonal as item}<div class:done={isChecked(item)} class="standard-packing-row"><button class="check" aria-label={`${item.name}をチェック`} onclick={() => toggle(item)}>{isChecked(item) ? '✓' : ''}</button><span>{item.name}</span>{#if canEdit}<button class="more" aria-label={`${item.name}を編集`} onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div>
            </section>
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>自分が担当</h3><span>{doneAssigned} / {myAssigned.length}</span></div>
              {#if myAssigned.length}<div class="standard-packing-list">{#each myAssigned as item}<div class:done={item.is_packed} class="standard-packing-row"><button class="check" onclick={() => toggle(item)}>{item.is_packed ? '✓' : ''}</button><span>{item.name}</span>{#if canEdit}<button class="more" onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div>{:else}<p class="standard-packing-note">担当している共通の持ち物はありません。</p>{/if}
            </section>
          </div>
        {:else if tab === 'everyone'}
          <div class="standard-packing-content">
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>準備状況</h3></div>
              <div class="standard-packing-progress-list">{#each data.members as member}{@const count = personalItems.filter((item) => item.checked_member_ids.includes(member.id)).length}<details><summary><span><i>{member.name.slice(0, 1)}</i>{member.name}</span><b>{count} / {personalItems.length}</b></summary><div>{#each personalItems as item}<button class:done={item.checked_member_ids.includes(member.id)} onclick={() => toggle(item, member.id)}><i>{item.checked_member_ids.includes(member.id) ? '✓' : ''}</i>{item.name}</button>{/each}</div></details>{/each}</div>
            </section>
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>共通の持ち物</h3><span>{doneShared} / {sharedItems.length}</span></div>
              <div class="standard-packing-list">{#each sharedItems as item}<div class:done={item.is_packed} class="standard-packing-row shared"><button class="check" onclick={() => toggle(item)}>{item.is_packed ? '✓' : ''}</button><span>{item.name}</span><select class:undecided={!item.assignee_member_id} value={item.assignee_member_id ?? ''} disabled={!canEdit} aria-label={`${item.name}の担当者`} onchange={(event) => changeAssignee(item, event.currentTarget.value)}><option value="">未定</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>{#if canEdit}<button class="more" onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div>
            </section>
          </div>
        {/if}
      {/if}
    </div>

    {#if showIdentity}<div class="standard-packing-sheet-backdrop" onclick={() => meId && (showIdentity = false)}><div class="standard-packing-sheet" onclick={(event) => event.stopPropagation()}><span class="handle"></span><h3>この旅では誰ですか？</h3><p>この端末で表示する「自分」を選んでください。</p>{#each data.members as member}<button class:active={member.id === meId} onclick={() => selectMe(member.id)}><i>{member.id === meId ? '✓' : ''}</i><span>{member.name.slice(0, 1)}</span>{member.name}</button>{/each}{#if canEdit}<div class="standard-packing-member-add"><input placeholder="メンバー名" bind:value={newMemberName} onkeydown={(event) => event.key === 'Enter' && addMember()} /><button onclick={addMember}>＋ メンバーを追加</button></div>{/if}<small>あとから画面上部で変更できます</small></div></div>{/if}

    {#if showForm}<div class="standard-packing-sheet-backdrop" onclick={closeForm}><form class="standard-packing-sheet standard-packing-form" onclick={(event) => event.stopPropagation()} onsubmit={(event) => { event.preventDefault(); saveItem(); }}><span class="handle"></span><h3>{editingId ? '持ち物を編集' : '持ち物を追加'}</h3><label>持ち物名<input autofocus placeholder="例：Wi-Fiルーター" bind:value={itemName} /></label><fieldset><legend>誰が持つ？</legend><label><input type="radio" value="personal" bind:group={itemKind} /><span><b>各自で持つ</b><small>全員に同じチェック項目を作ります</small></span></label><label><input type="radio" value="shared" bind:group={itemKind} /><span><b>誰か1人が持つ</b><small>グループで1つだけ準備します</small></span></label></fieldset>{#if itemKind === 'shared'}<label>担当者<select bind:value={assigneeId}><option value="">未定</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}<div class="actions">{#if editingId}<button type="button" class="delete" onclick={() => { const item = data.items.find((current) => current.id === editingId); if (item) remove(item); }}>削除</button>{/if}<button type="button" class="secondary" onclick={closeForm}>キャンセル</button><button type="submit">保存</button></div></form></div>{/if}
  </div>
{/if}
