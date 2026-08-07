<script lang="ts">
  import { onMount } from 'svelte';
  import type { MoneyData, MoneyItem, MoneyItemStatus, MoneyMember, Step } from '@tabitabi/types';
  import { moneyApi } from '$lib/api/money';
  import { demoStorage, getIsDemoMode } from '$lib/demo';
  import { CloseIcon } from './icons/index.svelte';
  import EventDetailDialog from './EventDetailDialog.svelte';

  interface Props {
    show: boolean;
    itineraryId: string;
    canEdit: boolean;
    steps?: Step[];
    onClose: () => void;
  }
  let { show, itineraryId, canEdit, steps = [], onClose }: Props = $props();

  let data = $state<MoneyData>({ budget_amount: null, members: [], items: [] });
  let loading = $state(false);
  let error = $state('');
  let newMemberName = $state('');
  let editingMemberId = $state<string | null>(null);
  let editingMemberName = $state('');
  let title = $state('');
  let amount = $state('');
  let status = $state<MoneyItemStatus>('paid');
  let payerId = $state('');
  let isSettled = $state(false);
  let participantIds = $state<string[]>([]);
  let budget = $state('');
  let budgetView = $state<'total' | 'perPerson'>('total');
  let settingsOpen = $state(false);
  let activeTab = $state<'summary' | 'items'>('summary');
  let editingItemId = $state<string | null>(null);
  let linkedStepId = $state('');
  let viewedStep = $state<Step | null>(null);
  let hasLoaded = $state(false);

  const isDemoMoney = () => itineraryId === 'demo' || getIsDemoMode();

  function demoMoneyData(): MoneyData {
    const createdAt = '2026-08-01T09:00:00.000Z';
    const members: MoneyMember[] = [
      { id: 'demo-money-miki', itinerary_id: itineraryId, name: '美咲', created_at: createdAt },
      { id: 'demo-money-haru', itinerary_id: itineraryId, name: '陽介', created_at: createdAt },
      { id: 'demo-money-yui', itinerary_id: itineraryId, name: '結衣', created_at: createdAt },
    ];
    const item = (id: string, title: string, amount: number, paidBy: string | null, itemStatus: MoneyItemStatus, split: string[], settled = false): MoneyItem => ({
      id, itinerary_id: itineraryId, title, amount, paid_by_member_id: paidBy, status: itemStatus,
      is_settled: settled, occurred_on: '2026-08-01', step_id: null, split_member_ids: split, created_at: createdAt, updated_at: createdAt,
    });
    return {
      budget_amount: 120000,
      members,
      items: [
        item('demo-money-hotel', 'ホテル', 36000, 'demo-money-miki', 'paid', members.map((member) => member.id), true),
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
  const displayBudget = $derived(data.budget_amount === null ? null : budgetView === 'perPerson' && data.members.length ? Math.round(data.budget_amount / data.members.length) : data.budget_amount);
  const displayPaid = $derived(budgetView === 'perPerson' && data.members.length ? Math.round(paidTotal / data.members.length) : paidTotal);
  const displayPlanned = $derived(budgetView === 'perPerson' && data.members.length ? Math.round(plannedTotal / data.members.length) : plannedTotal);
  const paidPercent = $derived(displayBudget ? Math.min(100, Math.round(displayPaid / displayBudget * 100)) : 0);
  const plannedPercent = $derived(displayBudget ? Math.min(100 - paidPercent, Math.round(displayPlanned / displayBudget * 100)) : 0);
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
    return { ...member, paid, actualOwed, plannedOwed, tripTotal: actualOwed + plannedOwed, balance: paid - actualOwed };
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

  function setStatus(nextStatus: MoneyItemStatus) {
    status = nextStatus;
    if (nextStatus === 'planned') {
      payerId = 'individual';
      isSettled = false;
    } else if (payerId === 'individual') {
      payerId = '';
    }
  }

  function setPaymentMethod(nextPayerId: string) {
    payerId = nextPayerId;
    if (nextPayerId === 'individual') {
      setStatus('planned');
    } else if (nextPayerId) {
      status = 'paid';
    }
  }

  function payerLabel(item: MoneyItem) {
    const payer = data.members.find((member) => member.id === item.paid_by_member_id);
    return payer ? `立替：${payer.name}` : '各自で支払う（予定）';
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

  function startEditingMember(member: MoneyMember) {
    editingMemberId = member.id;
    editingMemberName = member.name;
  }

  function cancelEditingMember() {
    editingMemberId = null;
    editingMemberName = '';
  }

  async function saveMember(member: MoneyMember) {
    const name = editingMemberName.trim();
    if (!name) return alert('メンバー名を入力してください');
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, members: data.members.map((current) => current.id === member.id ? { ...current, name } : current) });
      } else {
        const updated = await moneyApi.updateMember(itineraryId, member.id, name);
        data = { ...data, members: data.members.map((current) => current.id === member.id ? updated : current) };
      }
      cancelEditingMember();
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバー名を変更できませんでした'); }
  }

  async function deleteMember(member: MoneyMember) {
    const hasExpenses = data.items.some((item) => item.paid_by_member_id === member.id || item.split_member_ids.includes(member.id));
    if (hasExpenses) return alert('このメンバーが含まれる支出を更新または削除してから、メンバーを削除してください。');
    if (!confirm(`「${member.name}」を削除しますか？`)) return;
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, members: data.members.filter((current) => current.id !== member.id) });
      } else {
        await moneyApi.deleteMember(itineraryId, member.id);
        data = { ...data, members: data.members.filter((current) => current.id !== member.id) };
      }
      participantIds = participantIds.filter((id) => id !== member.id);
      if (editingMemberId === member.id) cancelEditingMember();
    } catch (e) { alert(e instanceof Error ? e.message : 'メンバーを削除できませんでした'); }
  }

  async function saveBudget() {
    const enteredValue = budget.trim() ? Number(budget) : null;
    const value = enteredValue === null ? null : budgetView === 'perPerson' && data.members.length ? enteredValue * data.members.length : enteredValue;
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

  function selectBudgetView(view: 'total' | 'perPerson') {
    budgetView = view;
    if (data.budget_amount === null) { budget = ''; return; }
    budget = String(view === 'perPerson' && data.members.length ? Math.round(data.budget_amount / data.members.length) : data.budget_amount);
  }

  async function addItem() {
    const value = Number(amount);
    if (!title.trim() || !Number.isInteger(value) || value <= 0 || !participantIds.length) {
      return alert('内容・金額・負担する人を入力してください');
    }
    if (status === 'paid' && (!payerId || payerId === 'individual')) return alert('立替えた人を選択してください');
    try {
      if (isDemoMoney()) {
        const now = new Date().toISOString();
        const item: MoneyItem = {
          id: editingItemId ?? `demo-money-item-${Date.now()}`, itinerary_id: itineraryId, title: title.trim(), amount: value,
          status, paid_by_member_id: status === 'paid' ? payerId : null, is_settled: status === 'paid' && isSettled,
          step_id: linkedStepId || null, split_member_ids: participantIds, occurred_on: now.slice(0, 10), created_at: now, updated_at: now,
        };
        saveDemoData({ ...data, items: editingItemId ? data.items.map((current) => current.id === editingItemId ? { ...item, created_at: current.created_at } : current) : [item, ...data.items] });
        resetForm();
        return;
      }
      const input = {
        title: title.trim(), amount: value, status,
        paid_by_member_id: status === 'paid' ? payerId : null,
        is_settled: status === 'paid' && isSettled,
        split_member_ids: participantIds,
        occurred_on: new Date().toISOString().slice(0, 10),
        step_id: linkedStepId || null,
      };
      const item = editingItemId
        ? await moneyApi.updateItem(itineraryId, editingItemId, input)
        : await moneyApi.addItem(itineraryId, input);
      data = { ...data, items: editingItemId ? data.items.map((current) => current.id === editingItemId ? item : current) : [item, ...data.items] };
      resetForm();
    } catch (e) { alert(e instanceof Error ? e.message : '項目を登録できませんでした'); }
  }

  function resetForm() {
    title = ''; amount = ''; payerId = ''; isSettled = false; linkedStepId = ''; editingItemId = null;
    participantIds = data.members.map((member) => member.id);
  }

  function editItem(item: MoneyItem) {
    editingItemId = item.id; title = item.title; amount = String(item.amount); status = item.status;
    payerId = item.paid_by_member_id ?? 'individual'; isSettled = item.is_settled;
    participantIds = [...item.split_member_ids]; linkedStepId = item.step_id ?? '';
    activeTab = 'items';
  }

  function stepTitle(item: MoneyItem) { return steps.find((step) => step.id === item.step_id)?.title ?? ''; }

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

  function startMarkAsPaid(item: MoneyItem) {
    editItem(item);
    status = 'paid';
    payerId = '';
  }

  async function setItemSettled(item: MoneyItem, settled: boolean) {
    if (item.status !== 'paid') return;
    try {
      if (isDemoMoney()) {
        saveDemoData({ ...data, items: data.items.map((current) => current.id === item.id ? { ...current, is_settled: settled, updated_at: new Date().toISOString() } : current) });
        return;
      }
      const updated = await moneyApi.updateItem(itineraryId, item.id, { is_settled: settled });
      data = { ...data, items: data.items.map((current) => current.id === item.id ? updated : current) };
    } catch (e) { alert(e instanceof Error ? e.message : '精算状況を更新できませんでした'); }
  }
</script>

{#if show}
  <div class="standard-money-overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose()}>
    <div class="standard-money-panel" role="dialog" aria-modal="true" aria-label="お金の管理" tabindex="-1">
      <header class="standard-money-header">
        <div><p>旅の会計</p><h2>お金の管理</h2></div>
        <button class="standard-money-close" onclick={onClose} aria-label="閉じる">{@html CloseIcon}</button>
      </header>

      {#if loading}<p class="standard-money-status">読み込み中…</p>
      {:else if error}<p class="standard-money-status">{error}</p>
      {:else}
        <div class="standard-money-budget-heading">
          <div><span>予算の表示</span><div class="standard-money-segment"><button class:active={budgetView === 'total'} onclick={() => selectBudgetView('total')}>全体</button><button class:active={budgetView === 'perPerson'} onclick={() => selectBudgetView('perPerson')} disabled={!data.members.length}>1人あたり</button></div></div>
          {#if budgetView === 'perPerson' && data.members.length}<small>{data.members.length}人で均等に計算</small>{/if}
        </div>
        <section class="standard-money-budget-card">
          <div class="standard-money-budget-label"><span>{budgetView === 'total' ? '全体予算' : '1人あたり予算'}</span><strong>{displayBudget === null ? '未設定' : formatYen(displayBudget)}</strong></div>
          {#if displayBudget !== null}
            <div class="standard-money-budget-bar" aria-label="予算の使用状況"><i class="paid" style={`width: ${paidPercent}%`}></i><i class="planned" style={`width: ${plannedPercent}%`}></i></div>
          {/if}
          <div class="standard-money-budget-legend"><span><i class="paid"></i>確定支出 <b>{formatYen(displayPaid)}</b></span><span><i class="planned"></i>予定支出 <b>{formatYen(displayPlanned)}</b></span><span class:standard-money-over={remainingBudget !== null && remainingBudget < 0}>残り <b>{remainingBudget === null ? '—' : formatYen(budgetView === 'perPerson' && data.members.length ? Math.round(remainingBudget / data.members.length) : remainingBudget)}</b></span></div>
        </section>

        {#if canEdit}
          <details class="standard-money-setup" bind:open={settingsOpen}><summary>詳細設定 <small>予算・メンバー</small></summary><div class="standard-money-setup-body">
            <label>{budgetView === 'total' ? '全体予算' : '1人あたり予算'} <input inputmode="numeric" placeholder="未設定" bind:value={budget} onblur={saveBudget} /> 円</label>
            <div class="standard-money-member-add"><input placeholder="メンバー名" bind:value={newMemberName} onkeydown={(e) => e.key === 'Enter' && addMember()} /><button onclick={addMember}>追加</button></div>
            {#if data.members.length}<div class="standard-money-members">{#each data.members as member}<div class="standard-money-member">{#if editingMemberId === member.id}<input aria-label={`${member.name}の名前`} bind:value={editingMemberName} onkeydown={(event) => event.key === 'Enter' && saveMember(member)} /><button onclick={() => saveMember(member)}>保存</button><button class="secondary" onclick={cancelEditingMember}>キャンセル</button>{:else}<span>{member.name}</span><button class="secondary" onclick={() => startEditingMember(member)}>名前変更</button><button class="delete" onclick={() => deleteMember(member)}>削除</button>{/if}</div>{/each}</div>{/if}
          </div></details>
        {/if}

        <div class="standard-money-tabs"><button class:active={activeTab === 'summary'} onclick={() => activeTab = 'summary'}>精算・内訳</button><button class:active={activeTab === 'items'} onclick={() => activeTab = 'items'}>支出一覧</button></div>
        {#if activeTab === 'summary'}
          {#if !data.members.length}<p class="standard-money-empty">メンバーを追加すると、立替と精算額を自動で計算します。</p>
          {:else}
            <div class="standard-money-person-list">{#each memberSummaries as member}<article><div><strong>{member.name}</strong><span class="standard-money-trip-total">旅行での支出合計 <b>{formatYen(member.tripTotal)}</b></span><details class="standard-money-person-detail"><summary>内訳を見る</summary><span>確定負担 {formatYen(member.actualOwed)}{#if member.plannedOwed} · 予定負担 {formatYen(member.plannedOwed)}{/if} · 立替合計 {formatYen(member.paid)}</span></details></div><b class:positive={member.balance > 0} class:negative={member.balance < 0}>{member.balance > 0 ? '+' : ''}{formatYen(member.balance)}</b></article>{/each}</div>
            <section class="standard-money-settlements"><h3>いま精算するなら</h3>{#if settlements.length}{#each settlements as settlement}<p><b>{settlement.from}</b> → <b>{settlement.to}</b><strong>{formatYen(settlement.amount)}</strong></p>{/each}{:else}<p>精算は不要です</p>{/if}<small>予定支出は精算額に含めていません。</small></section>
          {/if}
        {:else}
          {#if canEdit && data.members.length}
            <section class="standard-money-form">
              <h3>{editingItemId ? '支出を編集' : '支出を登録'}</h3>
              <label class="standard-money-field">
                <span>内容</span>
                <input aria-label="支出の内容" placeholder="例：ホテル、交通費" bind:value={title} />
              </label>
              <div class="standard-money-form-row">
                <label class="standard-money-field">
                  <span>金額</span>
                  <input aria-label="金額（円）" inputmode="numeric" placeholder="金額（円）" bind:value={amount} />
                </label>
                <label class="standard-money-field">
                  <span>区分</span>
                  <select value={status} onchange={(event) => setStatus((event.currentTarget as HTMLSelectElement).value as MoneyItemStatus)}>
                    <option value="paid">支払い済み</option>
                    <option value="planned">支出予定</option>
                  </select>
                </label>
              </div>
              <label class="standard-money-field">
                <span>支払い方法</span>
                <select value={payerId} onchange={(event) => setPaymentMethod((event.currentTarget as HTMLSelectElement).value)}>
                  <option value="">選択してください</option>
                  <option value="individual">各自で支払う（予定）</option>
                  {#each data.members as member}<option value={member.id}>{member.name} が立替える</option>{/each}
                </select>
                <small>{payerId === 'individual' ? '立替は発生せず、対象者それぞれの予定支出に加算されます。' : '立替えた人を選ぶと、精算額を計算します。'}</small>
              </label>
              {#if steps.length}
                <label class="standard-money-field">
                  <span>予定との紐づけ</span>
                  <select bind:value={linkedStepId}><option value="">予定に紐づけない</option>{#each steps as step}<option value={step.id}>{step.title}</option>{/each}</select>
                </label>
              {/if}
              <fieldset class="standard-money-checks">
                <legend>誰が対象？</legend>
                <div>
                  {#each data.members as member}
                    <label class:active={participantIds.includes(member.id)}>
                      <input type="checkbox" checked={participantIds.includes(member.id)} onchange={() => toggleParticipant(member.id)} />
                      <span class="standard-money-checkmark" aria-hidden="true">{participantIds.includes(member.id) ? '✓' : ''}</span>
                      <span>{member.name}</span>
                    </label>
                  {/each}
                </div>
              </fieldset>
              <div class="standard-money-form-actions">
                {#if editingItemId}<button class="standard-money-cancel" onclick={resetForm}>キャンセル</button>{/if}
                <button class="standard-money-submit" onclick={addItem}>{editingItemId ? '保存する' : '登録する'}</button>
              </div>
            </section>
          {/if}
          {#if !data.items.length}<p class="standard-money-empty">確定支出や、これから払う予定を登録できます。</p>
          {:else}
            <div class="standard-money-item-list">
              {#each data.items as item}
                <article>
                  <div>
                    <div class="standard-money-item-badges">
                      <span class:planned={item.status === 'planned'}>{item.status === 'paid' ? '確定' : '予定'}</span>
                      {#if item.status === 'paid' && item.is_settled}<span class="settled">精算済み</span>{/if}
                    </div>
                    <strong>{item.title}</strong>
                    <div class="standard-money-item-meta">
                      <small>{payerLabel(item)}</small>
                      <small>{item.split_member_ids.map((id) => data.members.find((member) => member.id === id)?.name).filter(Boolean).join('・')}で負担</small>
                    </div>
                    {#if stepTitle(item)}<button class="standard-money-step-link" onclick={() => viewedStep = steps.find((step) => step.id === item.step_id) ?? null}>予定：{stepTitle(item)}</button>{/if}
                  </div>
                  <div class="standard-money-item-actions">
                    <b>{formatYen(item.amount)}</b>
                    {#if canEdit && item.status === 'planned'}<button onclick={() => startMarkAsPaid(item)}>立替済みにする</button>{/if}
                    {#if canEdit && item.status === 'paid'}<button class:active={item.is_settled} aria-pressed={item.is_settled} onclick={() => setItemSettled(item, !item.is_settled)}>{item.is_settled ? '精算を戻す' : '精算済みにする'}</button>{/if}
                    {#if canEdit}<button onclick={() => editItem(item)}>編集</button><button class="delete" onclick={() => deleteItem(item.id)}>削除</button>{/if}
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
  {#if viewedStep}<EventDetailDialog step={viewedStep} onClose={() => viewedStep = null} />{/if}
{/if}
