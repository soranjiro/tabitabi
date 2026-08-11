<script lang="ts">
  import type { PackingData, PackingGroup, PackingItem, PackingItemKind, TripMember } from '@tabitabi/types';
  import { packingApi } from '$lib/api/packing';
  import { membersApi } from '$lib/api/members';
  import { demoStorage, getIsDemoMode } from '$lib/demo';
  import { shouldPromptForPackingIdentity } from '../utils/packing';
  import { CloseIcon } from './icons/index.svelte';

  interface Props { show: boolean; itineraryId: string; canEdit: boolean; onClose: () => void; }
  let { show, itineraryId, canEdit, onClose }: Props = $props();
  let data = $state<PackingData>({ members: [], groups: [], items: [] });
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state('');
  let tab = $state<'mine' | 'everyone'>('mine');
  let meId = $state('');
  let showIdentity = $state(false);
  let showForm = $state(false);
  let showGroups = $state(false);
  let editingId = $state<string | null>(null);
  let itemName = $state('');
  let itemQuantity = $state(1);
  let itemKind = $state<PackingItemKind>('personal');
  let assigneeId = $state('');
  let groupId = $state('');
  let newMemberName = $state('');
  let newGroupName = $state('');

  const isDemo = () => itineraryId === 'demo' || getIsDemoMode();
  const me = $derived(data.members.find((member) => member.id === meId));
  const personalItems = $derived(data.items.filter((item) => item.kind === 'personal'));
  const privateItems = $derived(data.items.filter((item) => item.kind === 'private' && item.owner_member_id === meId));
  const sharedItems = $derived(data.items.filter((item) => item.kind === 'shared'));
  const myPersonal = $derived([...personalItems, ...privateItems]);
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

  function demoGroups(): PackingGroup[] {
    const now = '2026-08-01T09:00:00.000Z';
    return ['貴重品', 'スマホ・電子機器', '洗面・ケアアイテム', '衣類', 'その他'].map((name, sort_order) => ({
      id: `demo-pack-group-${sort_order}`, itinerary_id: itineraryId, name, sort_order, created_at: now, updated_at: now,
    }));
  }

  function demoData(members: TripMember[]): PackingData {
    const now = '2026-08-01T09:00:00.000Z';
    const groups = demoGroups();
    const item = (id: string, name: string, kind: PackingItemKind, groupIndex: number, assignee: string | null, packed = false, checked: string[] = [], owner: string | null = null): PackingItem => ({
      id, itinerary_id: itineraryId, name, quantity: 1, kind, group_id: groups[groupIndex].id, assignee_member_id: assignee, is_packed: packed,
      owner_member_id: owner, checked_member_ids: checked, created_at: now, updated_at: now,
    });
    return { members, groups, items: [
      item('demo-pack-passport', 'パスポート', 'personal', 0, null, false, [members[0]?.id].filter(Boolean) as string[]),
      item('demo-pack-wallet', '財布', 'personal', 0, null, false, members.slice(0, 2).map((member) => member.id)),
      item('demo-pack-phone', 'スマートフォン', 'personal', 1, null),
      item('demo-pack-battery', 'モバイルバッテリー', 'personal', 1, null),
      item('demo-pack-clothes', '着替え', 'personal', 3, null),
      item('demo-pack-camera', 'カメラ', 'shared', 1, members[0]?.id ?? null, true),
      item('demo-pack-wifi', 'Wi-Fiルーター', 'shared', 1, members[1]?.id ?? null),
      item('demo-pack-medicine', '常備薬', 'shared', 2, members[2]?.id ?? null, true),
      item('demo-pack-umbrella', '折りたたみ傘', 'shared', 4, null),
    ] };
  }

  function normalizeDemoPacking(value: PackingData, members: TripMember[]): PackingData {
    const groups = value.groups?.length ? value.groups : demoGroups();
    const fallbackId = groups.find((group) => group.name === 'その他')?.id ?? groups[0].id;
    return { ...value, members, groups, items: value.items.map((item) => ({
      ...item, quantity: item.quantity ?? 1, group_id: groups.some((group) => group.id === item.group_id) ? item.group_id : fallbackId,
    })) };
  }

  async function load() {
    if (loading || loaded) return;
    loading = true;
    try {
      if (isDemo()) {
        let members = demoStorage.getMembers();
        if (!members.length) { members = demoMembers(); demoStorage.setMembers(members); }
        data = normalizeDemoPacking(demoStorage.getPackingData() ?? demoData(members), members);
        demoStorage.setPackingData(data);
      } else data = await packingApi.get(itineraryId);
      meId = localStorage.getItem(`tabitabi:packing:me:${itineraryId}`) ?? '';
      if (!data.members.some((member) => member.id === meId)) meId = '';
      showIdentity = shouldPromptForPackingIdentity(data.members.length, meId);
    } catch (e) { error = e instanceof Error ? e.message : '持ち物を読み込めませんでした'; }
    finally { loading = false; loaded = true; }
  }
  $effect(() => { if (show) void load(); else loaded = false; });

  function persist(next: PackingData) { data = next; demoStorage.setPackingData(next); }
  function selectMe(id: string) { meId = id; localStorage.setItem(`tabitabi:packing:me:${itineraryId}`, id); showIdentity = false; }
  function isChecked(item: PackingItem, memberId = meId) { return item.kind === 'shared' ? item.is_packed : item.checked_member_ids.includes(memberId); }
  function itemLabel(item: PackingItem) { return item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name; }

  async function toggle(item: PackingItem, memberId: string | null = meId) {
    if (!canEdit || (item.kind !== 'shared' && !memberId)) return;
    const checked = !isChecked(item, memberId ?? '');
    try {
      if (!isDemo()) await packingApi.updateCheck(itineraryId, item.id, { member_id: item.kind !== 'shared' ? memberId : null, checked });
      const items = data.items.map((current) => current.id !== item.id ? current : current.kind === 'shared'
        ? { ...current, is_packed: checked }
        : { ...current, checked_member_ids: checked ? [...current.checked_member_ids, memberId as string] : current.checked_member_ids.filter((id) => id !== memberId) });
      if (isDemo()) persist({ ...data, items }); else data = { ...data, items };
    } catch (e) { alert(e instanceof Error ? e.message : 'チェックを更新できませんでした'); }
  }

  function openAdd() { editingId = null; itemName = ''; itemQuantity = 1; itemKind = 'personal'; groupId = data.groups[0]?.id ?? ''; assigneeId = ''; showForm = true; }
  function openEdit(item: PackingItem) { editingId = item.id; itemName = item.name; itemQuantity = item.quantity; itemKind = item.kind; groupId = item.group_id; assigneeId = item.assignee_member_id ?? ''; showForm = true; }
  function closeForm() { showForm = false; editingId = null; }

  async function saveItem() {
    const name = itemName.trim();
    if (!name) return;
    if (!groupId) return;
    const quantity = Math.max(1, Math.min(10, Math.trunc(itemQuantity || 1)));
    const input = { name, quantity, kind: itemKind, group_id: groupId, assignee_member_id: itemKind === 'shared' ? assigneeId || null : null, owner_member_id: itemKind === 'private' ? meId : null };
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

  async function addGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const now = new Date().toISOString();
      const group: PackingGroup = isDemo()
        ? { id: `demo-pack-group-${Date.now()}`, itinerary_id: itineraryId, name, sort_order: data.groups.length, created_at: now, updated_at: now }
        : await packingApi.addGroup(itineraryId, { name });
      const next = { ...data, groups: [...data.groups, group] };
      if (isDemo()) persist(next); else data = next;
      newGroupName = '';
    } catch (e) { alert(e instanceof Error ? e.message : 'グループを追加できませんでした'); }
  }

  async function renameGroup(group: PackingGroup, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    try {
      const updated = isDemo() ? { ...group, name: trimmed, updated_at: new Date().toISOString() } : await packingApi.updateGroup(itineraryId, group.id, { name: trimmed });
      const next = { ...data, groups: data.groups.map((current) => current.id === group.id ? updated : current) };
      if (isDemo()) persist(next); else data = next;
    } catch (e) { alert(e instanceof Error ? e.message : 'グループ名を変更できませんでした'); }
  }

  async function removeGroup(group: PackingGroup) {
    if (data.groups.length === 1) { alert('グループは1つ以上必要です。'); return; }
    if (!confirm(`「${group.name}」を削除しますか？\nこのグループの持ち物は別のグループに移動します。`)) return;
    try {
      let fallback = data.groups.find((current) => current.id !== group.id);
      if (!fallback) return;
      const response = isDemo() ? { reassigned_to_group_id: fallback.id } : await packingApi.deleteGroup(itineraryId, group.id);
      const groups = data.groups.filter((current) => current.id !== group.id);
      const next = { ...data, groups, items: data.items.map((item) => item.group_id === group.id ? { ...item, group_id: response.reassigned_to_group_id } : item) };
      if (isDemo()) persist(next); else data = next;
    } catch (e) { alert(e instanceof Error ? e.message : 'グループを削除できませんでした'); }
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
        {#if canEdit}<div class="standard-packing-actions"><button class="standard-packing-manage" onclick={() => showGroups = true}>グループを管理</button><button class="standard-packing-add" onclick={openAdd}><span>＋</span> 持ち物を追加</button></div>{/if}

        {#if tab === 'mine' && me}
          <div class="standard-packing-content">
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>自分の持ち物</h3><span>{donePersonal} / {myPersonal.length}</span></div>
              <div class="standard-packing-groups">{#each data.groups as group}{@const items = myPersonal.filter((item) => item.group_id === group.id)}{#if items.length}<div class="standard-packing-group"><h4>{group.name}<small>{items.filter((item) => isChecked(item)).length} / {items.length}</small></h4><div class="standard-packing-list">{#each items as item}<div class:done={isChecked(item)} class="standard-packing-row"><button class="check" aria-label={`${item.name}をチェック`} onclick={() => toggle(item)}>{isChecked(item) ? '✓' : ''}</button><span>{itemLabel(item)}</span>{#if canEdit}<button class="more" aria-label={`${item.name}を編集`} onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div></div>{/if}{/each}</div>
            </section>
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>自分が担当</h3><span>{doneAssigned} / {myAssigned.length}</span></div>
              {#if myAssigned.length}<div class="standard-packing-groups">{#each data.groups as group}{@const items = myAssigned.filter((item) => item.group_id === group.id)}{#if items.length}<div class="standard-packing-group"><h4>{group.name}</h4><div class="standard-packing-list">{#each items as item}<div class:done={item.is_packed} class="standard-packing-row"><button class="check" onclick={() => toggle(item)}>{item.is_packed ? '✓' : ''}</button><span>{itemLabel(item)}</span>{#if canEdit}<button class="more" onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div></div>{/if}{/each}</div>{:else}<p class="standard-packing-note">担当している共通の持ち物はありません。</p>{/if}
            </section>
          </div>
        {:else if tab === 'everyone'}
          <div class="standard-packing-content">
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>準備状況</h3></div>
              <div class="standard-packing-progress-list">{#each data.members as member}{@const count = personalItems.filter((item) => item.checked_member_ids.includes(member.id)).length}<details><summary><span><i>{member.name.slice(0, 1)}</i>{member.name}</span><b>{count} / {personalItems.length}</b></summary><div>{#each data.groups as group}{@const items = personalItems.filter((item) => item.group_id === group.id)}{#if items.length}<h5>{group.name}</h5>{#each items as item}<button class:done={item.checked_member_ids.includes(member.id)} onclick={() => toggle(item, member.id)}><i>{item.checked_member_ids.includes(member.id) ? '✓' : ''}</i>{itemLabel(item)}</button>{/each}{/if}{/each}</div></details>{/each}</div>
            </section>
            <section class="standard-packing-section"><div class="standard-packing-section-title"><h3>共通の持ち物</h3><span>{doneShared} / {sharedItems.length}</span></div>
              <div class="standard-packing-groups">{#each data.groups as group}{@const items = sharedItems.filter((item) => item.group_id === group.id)}{#if items.length}<div class="standard-packing-group"><h4>{group.name}<small>{items.filter((item) => item.is_packed).length} / {items.length}</small></h4><div class="standard-packing-list">{#each items as item}<div class:done={item.is_packed} class="standard-packing-row shared"><button class="check" onclick={() => toggle(item)}>{item.is_packed ? '✓' : ''}</button><span>{itemLabel(item)}</span><select class:undecided={!item.assignee_member_id} value={item.assignee_member_id ?? ''} disabled={!canEdit} aria-label={`${item.name}の担当者`} onchange={(event) => changeAssignee(item, event.currentTarget.value)}><option value="">未定</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>{#if canEdit}<button class="more" onclick={() => openEdit(item)}>•••</button>{/if}</div>{/each}</div></div>{/if}{/each}</div>
            </section>
          </div>
        {/if}
      {/if}
    </div>

    {#if showIdentity}<div class="standard-packing-sheet-backdrop" onclick={() => meId && (showIdentity = false)}><div class="standard-packing-sheet" onclick={(event) => event.stopPropagation()}><span class="handle"></span><h3>この旅では誰ですか？</h3><p>この端末で表示する「自分」を選んでください。</p>{#each data.members as member}<button class:active={member.id === meId} onclick={() => selectMe(member.id)}><i>{member.id === meId ? '✓' : ''}</i><span>{member.name.slice(0, 1)}</span>{member.name}</button>{/each}{#if canEdit}<div class="standard-packing-member-add"><input placeholder="メンバー名" bind:value={newMemberName} onkeydown={(event) => event.key === 'Enter' && addMember()} /><button onclick={addMember}>＋ メンバーを追加</button></div>{/if}<small>あとから画面上部で変更できます</small></div></div>{/if}

    {#if showForm}<div class="standard-packing-sheet-backdrop" onclick={closeForm}><form class="standard-packing-sheet standard-packing-form" onclick={(event) => event.stopPropagation()} onsubmit={(event) => { event.preventDefault(); saveItem(); }}><span class="handle"></span><h3>{editingId ? '持ち物を編集' : '持ち物を追加'}</h3><label>持ち物名<input autofocus placeholder="例：トップス" bind:value={itemName} /></label><label>個数<select bind:value={itemQuantity}>{#each Array.from({ length: 10 }, (_, index) => index + 1) as quantity}<option value={quantity}>{quantity}</option>{/each}</select></label><label>グループ<select bind:value={groupId}>{#each data.groups as group}<option value={group.id}>{group.name}</option>{/each}</select></label><fieldset><legend>誰が持つ？</legend><label><input type="radio" value="private" bind:group={itemKind} /><span><b>自分専用</b><small>自分のリストだけに表示します</small></span></label><label><input type="radio" value="personal" bind:group={itemKind} /><span><b>各自で持つ</b><small>全員に同じチェック項目を作ります</small></span></label><label><input type="radio" value="shared" bind:group={itemKind} /><span><b>誰か1人が持つ</b><small>グループで1つだけ準備します</small></span></label></fieldset>{#if itemKind === 'shared'}<label>担当者<select bind:value={assigneeId}><option value="">未定</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select></label>{/if}<div class="actions">{#if editingId}<button type="button" class="delete" onclick={() => { const item = data.items.find((current) => current.id === editingId); if (item) remove(item); }}>削除</button>{/if}<button type="button" class="secondary" onclick={closeForm}>キャンセル</button><button type="submit">保存</button></div></form></div>{/if}

    {#if showGroups}<div class="standard-packing-sheet-backdrop" onclick={() => showGroups = false}><div class="standard-packing-sheet standard-packing-group-sheet" onclick={(event) => event.stopPropagation()}><span class="handle"></span><h3>グループを管理</h3><p>名前を変更したら「保存」を押してください。</p><div class="standard-packing-group-editor">{#each data.groups as group}<div><input aria-label={`${group.name}のグループ名`} value={group.name} /><button onclick={(event) => renameGroup(group, event.currentTarget.previousElementSibling instanceof HTMLInputElement ? event.currentTarget.previousElementSibling.value : group.name)}>保存</button><button class="delete" aria-label={`${group.name}を削除`} onclick={() => removeGroup(group)}>削除</button></div>{/each}</div><div class="standard-packing-group-add"><input placeholder="新しいグループ名" bind:value={newGroupName} onkeydown={(event) => event.key === 'Enter' && addGroup()} /><button onclick={addGroup}>＋ 追加</button></div><button class="standard-packing-sheet-close" onclick={() => showGroups = false}>完了</button></div></div>{/if}
  </div>
{/if}
