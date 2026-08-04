<script lang="ts">
  import { onMount } from 'svelte';
  import type { MoneyData, MoneyItem, MoneyItemStatus, MoneyMember } from '@tabitabi/types';
  import { moneyApi } from '$lib/api/money';
  import { demoStorage, getIsDemoMode } from '$lib/demo';
  import { CloseIcon } from './icons/index.svelte';

  interface Props {
    show: boolean;
    itineraryId: string;
    canEdit: boolean;
    onClose: () => void;
  }
  let { show, itineraryId, canEdit, onClose }: Props = $props();

  let data = $state<MoneyData>({ budget_amount: null, members: [], items: [] });
  let loading = $state(false);
  let error = $state('');
  let newMemberName = $state('');
  let title = $state('');
  let amount = $state('');
  let status = $state<MoneyItemStatus>('paid');
  let payerId = $state('');
  let participantIds = $state<string[]>([]);
  let budget = $state('');
  let activeTab = $state<'summary' | 'items'>('summary');
  let hasLoaded = $state(false);

  const isDemoMoney = () => itineraryId === 'demo' || getIsDemoMode();

  function demoMoneyData(): MoneyData {
    const createdAt = '2026-08-01T09:00:00.000Z';
    const members: MoneyMember[] = [
      { id: 'demo-money-miki', itinerary_id: itineraryId, name: '美咲', created_at: createdAt },
      { id: 'demo-money-haru', itinerary_id: itineraryId, name: '陽介', created_at: createdAt },
      { id: 'demo-money-yui', itinerary_id: itineraryId, name: '結衣', created_at: createdAt },
    ];
    const item = (id: string, title: string, amount: number, paidBy: string | null, itemStatus: MoneyItemStatus, split: string[]): MoneyItem => ({
      id, itinerary_id: itineraryId, title, amount, paid_by_member_id: paidBy, status: itemStatus,
      occurred_on: '2026-08-01', split_member_ids: split, created_at: createdAt, updated_at: createdAt,
    });
    return {
      budget_amount: 120000,
      members,
      items: [
        item('demo-money-hotel', 'ホテル', 36000, 'demo-money-miki', 'paid', members.map((member) => member.id)),
        item('demo-money-shinkansen', '新幹線', 24000, 'demo-money-haru', 'paid', members.map((member) => member.id)),
        item('demo-money-dinner', '初日の夕食', 9000, 'demo-money-yui', 'paid', members.map((member) => member.id)),
        item('demo-money-rental', 'レンタカー（予定）', 12000, null, 'planned', ['demo-money-miki', 'demo-money-haru']),
      ],
    };
  }

  const yen = new Intl.NumberFormat('ja-JP');
  const formatYen = (value: number) => `¥${yen.format(value)}`;

  const paidItems = $derived(data.items.filter((item) => item.status === 'paid'));
  const plannedItems = $derived(data.items.filter((item) => item.status === 'planned'));
  const paidTotal = $derived(paidItems.reduce((sum, item) => sum + item.amount, 0));
  const plannedTotal = $derived(plannedItems.reduce((sum, item) => sum + item.amount, 0));
  const remainingBudget = $derived(data.budget_amount === null ? null : data.budget_amount - paidTotal - plannedTotal);
  const memberSummaries = $derived.by(() => data.members.map((member) => {
    let paid = 0;
    let actualOwed = 0;
    let plannedOwed = 0;
    for (const item of data.items) {
      if (item.status === 'paid' && item.paid_by_member_id === member.id) paid += item.amount;
      const position = item.split_member_ids.indexOf(member.id);
      if (position >= 0) {
        const unit = Math.floor(item.amount / item.split_member_ids.length);
        const share = unit + (position < item.amount % item.split_member_ids.length ? 1 : 0);
        if (item.status === 'paid') actualOwed += share;
        else plannedOwed += share;
      }
    }
    return { ...member, paid, actualOwed, plannedOwed, balance: paid - actualOwed };
  }));
  const settlements = $derived.by(() => {
    const debtors = memberSummaries.filter((m) => m.balance < 0).map((m) => ({ ...m, left: -m.balance }));
    const creditors = memberSummaries.filter((m) => m.balance > 0).map((m) => ({ ...m, left: m.balance }));
    const result: { from: string; to: string; amount: number }[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtors[debtorIndex] && creditors[creditorIndex]) {
      const payment = Math.min(debtors[debtorIndex].left, creditors[creditorIndex].left);
      if (payment > 0) result.push({ from: debtors[debtorIndex].name, to: creditors[creditorIndex].name, amount: payment });
      debtors[debtorIndex].left -= payment;
      creditors[creditorIndex].left -= payment;
      if (!debtors[debtorIndex].left) debtorIndex += 1;
      if (!creditors[creditorIndex].left) creditorIndex += 1;
    }
    return result;
  });

  async function load() {
    if (loading || hasLoaded) return;
    loading = true;
    error = '';
    try {
      if (isDemoMoney()) {
        const storedMoney = demoStorage.getMoneyData();
        data = storedMoney ?? demoMoneyData();
        if (!storedMoney) demoStorage.setMoneyData(data);
        budget = data.budget_amount?.toString() ?? '';
        participantIds = data.members.map((member) => member.id);
        return;
      }

      data = await moneyApi.get(itineraryId);
      budget = data.budget_amount?.toString() ?? '';
      participantIds = data.members.map((member) => member.id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'お金の管理データを読み込めませんでした';
    } finally {
      loading = false;
      hasLoaded = true;
    }
  }

  onMount(() => { if (show) load(); });
  $effect(() => { if (show && !hasLoaded) load(); });

  function saveDemoData(next: MoneyData) {
    data = next;
    demoStorage.setMoneyData(next);
  }

  function toggleParticipant(memberId: string) {
    participantIds = participantIds.includes(memberId)
      ? participantIds.filter((id) => id !== memberId)
      : [...participantIds, memberId];
  }

  async function addMember() {
    if (!newMemberName.trim()) return;
    try {
      if (isDemoMoney()) {
        const member: MoneyMember = {
          id: `demo-money-member-${Date.now()}`, itinerary_id: itineraryId,
          name: newMemberName.trim(), created_at: new Date().toISOString(),
        };
        saveDemoData({ ...data, members: [...data.members, member] });
        participantIds = [...participantIds, member.id];
        newMemberName = '';
        return;
      }
      const member = await moneyApi.addMember(itineraryId, newMemberName.trim());
      data = { ...data, members: [...data.members, member] };
      participantIds = [...participantIds, member.id];
      newMemberName = '';
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバーを追加できませんでした'); }
  }

  async function saveBudget() {
    const value = budget.trim() ? Number(budget) : null;
    if (value !== null && (!Number.isInteger(value) || value <= 0)) return alert('予算は1円以上の整数で入力してください');
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, budget_amount: value });
        return;
      }
      await moneyApi.updateSettings(itineraryId, value);
      data = { ...data, budget_amount: value };
    } catch (e) { alert(e instanceof Error ? e.message : '予算を保存できませんでした'); }
  }

  async function addItem() {
    const value = Number(amount);
    if (!title.trim() || !Number.isInteger(value) || value <= 0 || !participantIds.length) {
      return alert('内容・金額・負担する人を入力してください');
    }
    if (status === 'paid' && !payerId) return alert('支払った人を選択してください');
    try {
      if (isDemoMoney()) {
        const now = new Date().toISOString();
        const item: MoneyItem = {
          id: `demo-money-item-${Date.now()}`, itinerary_id: itineraryId, title: title.trim(), amount: value,
          status, paid_by_member_id: status === 'paid' ? payerId : null,
          split_member_ids: participantIds, occurred_on: now.slice(0, 10), created_at: now, updated_at: now,
        };
        saveDemoData({ ...data, items: [item, ...data.items] });
        title = ''; amount = ''; payerId = ''; participantIds = data.members.map((member) => member.id);
        return;
      }
      const item = await moneyApi.addItem(itineraryId, {
        title: title.trim(), amount: value, status,
        paid_by_member_id: status === 'paid' ? payerId : null,
        split_member_ids: participantIds,
        occurred_on: new Date().toISOString().slice(0, 10),
      });
      data = { ...data, items: [item, ...data.items] };
      title = ''; amount = ''; payerId = ''; participantIds = data.members.map((member) => member.id);
    } catch (e) { alert(e instanceof Error ? e.message : '項目を登録できませんでした'); }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('この項目を削除しますか？')) return;
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, items: data.items.filter((item) => item.id !== itemId) });
        return;
      }
      await moneyApi.deleteItem(itineraryId, itemId);
      data = { ...data, items: data.items.filter((item) => item.id !== itemId) };
    } catch (e) { alert(e instanceof Error ? e.message : '削除できませんでした'); }
  }

  async function markAsPaid(itemId: string) {
    const payer = payerId || data.members[0]?.id;
    if (!payer) return alert('先にメンバーを登録してください');
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, items: data.items.map((item) => item.id === itemId ? { ...item, status: 'paid', paid_by_member_id: payer, updated_at: new Date().toISOString() } : item) });
        return;
      }
      const updated = await moneyApi.updateItem(itineraryId, itemId, { status: 'paid', paid_by_member_id: payer });
      data = { ...data, items: data.items.map((item) => item.id === itemId ? updated : item) };
    } catch (e) { alert(e instanceof Error ? e.message : '確定できませんでした'); }
  }
</script>

{#if show}
  <div class="standard-money-overlay" role="dialog" aria-modal="true" aria-label="お金の管理">
    <section class="standard-money-panel">
      <header class="standard-money-header">
        <div><p>旅の会計</p><h2>お金の管理</h2></div>
        <button class="standard-money-close" onclick={onClose} aria-label="閉じる">{@html CloseIcon}</button>
      </header>

      {#if loading}<p class="standard-money-status">読み込み中…</p>
      {:else if error}<p class="standard-money-status">{error}</p>
      {:else}
        {#if isDemoMoney()}<p class="standard-money-demo-note">デモ用の会計データです。変更内容はこのブラウザに保存されます。</p>{/if}
        <div class="standard-money-total-grid">
          <div><span>確定支出</span><strong>{formatYen(paidTotal)}</strong></div>
          <div><span>支出予定</span><strong>{formatYen(plannedTotal)}</strong></div>
          <div class:standard-money-over={remainingBudget !== null && remainingBudget < 0}><span>予算残</span><strong>{remainingBudget === null ? '—' : formatYen(remainingBudget)}</strong></div>
        </div>

        {#if canEdit}
          <div class="standard-money-setup">
            <label>全体予算 <input inputmode="numeric" placeholder="未設定" bind:value={budget} onblur={saveBudget} /> 円</label>
            <div class="standard-money-member-add"><input placeholder="メンバー名" bind:value={newMemberName} onkeydown={(e) => e.key === 'Enter' && addMember()} /><button onclick={addMember}>追加</button></div>
            {#if data.members.length}<div class="standard-money-members">{#each data.members as member}<span>{member.name}</span>{/each}</div>{/if}
          </div>
        {/if}

        <div class="standard-money-tabs"><button class:active={activeTab === 'summary'} onclick={() => activeTab = 'summary'}>精算・内訳</button><button class:active={activeTab === 'items'} onclick={() => activeTab = 'items'}>支出一覧</button></div>
        {#if activeTab === 'summary'}
          {#if !data.members.length}<p class="standard-money-empty">メンバーを追加すると、立替と精算額を自動で計算します。</p>
          {:else}
            <div class="standard-money-person-list">{#each memberSummaries as member}<article><div><strong>{member.name}</strong><span>立替 {formatYen(member.paid)} · 確定負担 {formatYen(member.actualOwed)}{#if member.plannedOwed} · 予定 {formatYen(member.plannedOwed)}{/if}</span></div><b class:positive={member.balance > 0} class:negative={member.balance < 0}>{member.balance > 0 ? '+' : ''}{formatYen(member.balance)}</b></article>{/each}</div>
            <section class="standard-money-settlements"><h3>いま精算するなら</h3>{#if settlements.length}{#each settlements as settlement}<p><b>{settlement.from}</b> → <b>{settlement.to}</b><strong>{formatYen(settlement.amount)}</strong></p>{/each}{:else}<p>精算は不要です</p>{/if}<small>予定支出は精算額に含めていません。</small></section>
          {/if}
        {:else}
          {#if canEdit && data.members.length}
            <section class="standard-money-form"><h3>支出を登録</h3><input placeholder="例：ホテル、交通費" bind:value={title} /><div><input inputmode="numeric" placeholder="金額（円）" bind:value={amount} /><select bind:value={status}><option value="paid">支払い済み</option><option value="planned">支出予定</option></select></div>{#if status === 'paid'}<select bind:value={payerId}><option value="">支払った人を選択</option>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>{/if}<div class="standard-money-checks">{#each data.members as member}<label><input type="checkbox" checked={participantIds.includes(member.id)} onchange={() => toggleParticipant(member.id)} /> {member.name}</label>{/each}</div><button class="standard-money-submit" onclick={addItem}>登録する</button></section>
          {/if}
          {#if !data.items.length}<p class="standard-money-empty">確定支出や、これから払う予定を登録できます。</p>
          {:else}<div class="standard-money-item-list">{#each data.items as item}<article><div><span class:planned={item.status === 'planned'}>{item.status === 'paid' ? '確定' : '予定'}</span><strong>{item.title}</strong><small>{item.split_member_ids.map((id) => data.members.find((member) => member.id === id)?.name).filter(Boolean).join('・')}で負担</small></div><div><b>{formatYen(item.amount)}</b>{#if canEdit && item.status === 'planned'}<button onclick={() => markAsPaid(item.id)}>確定にする</button>{/if}{#if canEdit}<button class="delete" onclick={() => deleteItem(item.id)}>削除</button>{/if}</div></article>{/each}</div>{/if}
        {/if}
      {/if}
    </section>
  </div>
{/if}
