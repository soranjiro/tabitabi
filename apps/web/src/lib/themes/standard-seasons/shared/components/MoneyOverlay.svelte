<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { MoneyData, MoneyFundTransaction, MoneyFundTransactionKind, MoneyItem, MoneyItemStatus, MoneyMember, Step } from '@tabitabi/types';
  import { moneyApi } from '$lib/api/money';
  import { demoStorage, getIsDemoMode } from '$lib/demo';
  import { CloseIcon } from './icons/index.svelte';

  interface Props {
    show: boolean;
    itineraryId: string;
    canEdit: boolean;
    steps?: Step[];
    requestedEditItemId?: string | null;
    onEditItemOpened?: () => void;
    onViewStep?: (step: Step) => void;
    onClose: () => void;
  }
  let { show, itineraryId, canEdit, steps = [], requestedEditItemId = null, onEditItemOpened, onViewStep, onClose }: Props = $props();

  let data = $state<MoneyData>({ budget_amount: null, members: [], items: [], fund_transactions: [] });
  let loading = $state(false);
  let error = $state('');
  let title = $state('');
  let amount = $state('');
  let amountInputMode = $state<'total' | 'perPerson'>('total');
  let splitMode = $state<'equal' | 'custom'>('equal');
  let customAmounts = $state<Record<string, string>>({});
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
  let hasLoaded = $state(false);
  let handledEditItemId = $state<string | null>(null);
  let itemFormElement = $state<HTMLElement | undefined>(undefined);
  let fundMemberId = $state('');
  let fundKind = $state<MoneyFundTransactionKind>('contribution');
  let fundAmount = $state('');
  let fundNote = $state('');
  let fundOccurredOn = $state('');
  let editingFundTransactionId = $state<string | null>(null);
  let fundEntryOpen = $state(false);
  let fundHistoryOpen = $state(false);
  let fundFormElement = $state<HTMLElement | undefined>(undefined);
  let fundDetailsElement = $state<HTMLDetailsElement | undefined>(undefined);
  let selectedMemberId = $state<string | null>(null);
  let shareSheetOpen = $state(false);
  let shareSettlements = $state(true);
  let shareTransactions = $state(false);
  let shareMessage = $state('');

  const isDemoMoney = () => itineraryId === 'demo' || getIsDemoMode();

  function demoMoneyData(): MoneyData {
    const createdAt = '2026-08-01T09:00:00.000Z';
    const members: MoneyMember[] = demoStorage.getMembers().length ? demoStorage.getMembers() : [
      { id: 'demo-money-miki', itinerary_id: itineraryId, name: '美咲', created_at: createdAt },
      { id: 'demo-money-haru', itinerary_id: itineraryId, name: '陽介', created_at: createdAt },
      { id: 'demo-money-yui', itinerary_id: itineraryId, name: '結衣', created_at: createdAt },
    ];
    if (!demoStorage.getMembers().length) demoStorage.setMembers(members);
    const demoStepId = (pattern: RegExp, fallbackIndex: number) =>
      steps.find((step) => pattern.test(step.title))?.id ?? steps[fallbackIndex]?.id ?? null;
    const item = (id: string, title: string, amount: number, paidBy: string | null, itemStatus: MoneyItemStatus, splits: MoneyItem['splits'], settled = false, paidFromFund = false, stepId: string | null = null): MoneyItem => ({
      id, itinerary_id: itineraryId, title, amount, paid_by_member_id: paidBy, paid_from_fund: paidFromFund, status: itemStatus,
      is_settled: settled, occurred_on: '2026-08-01', step_id: stepId,
      splits, split_member_ids: splits.map((split) => split.member_id), created_at: createdAt, updated_at: createdAt,
    });
    const allMemberIds = members.map((member) => member.id);
    const [misakiId, yosukeId, yuiId] = allMemberIds;
    return {
      budget_amount: 120000,
      members,
      items: [
        item('demo-money-admission', '清水寺の拝観料', 5000, null, 'paid', [
          { member_id: misakiId, amount: 2000 },
          { member_id: yosukeId, amount: 2000 },
          { member_id: yuiId, amount: 1000 },
        ], false, true, demoStepId(/寺|神社|城|観光|散策|体験|祭り/, 1)),
        item('demo-money-hotel', 'ホテル', 36000, misakiId, 'paid', equalSplits(36000, allMemberIds), true, false, demoStepId(/ホテル|旅館|宿/, 4)),
        item('demo-money-shinkansen', '新幹線', 24000, yosukeId, 'paid', [
          { member_id: misakiId, amount: 10000 },
          { member_id: yosukeId, amount: 10000 },
          { member_id: yuiId, amount: 4000 },
        ], false, false, demoStepId(/新幹線|電車|空港|移動|バス|到着/, 1)),
        item('demo-money-dinner', '初日の夕食', 9000, yuiId, 'paid', equalSplits(9000, allMemberIds), false, false, demoStepId(/夕食|料理|ディナー|居酒屋|ランチ|そば/, 2)),
        item('demo-money-rental', 'レンタカー（予定）', 12000, null, 'planned', equalSplits(12000, [misakiId, yosukeId]), false, false, demoStepId(/移動|観光|体験|散策|スキー|シュノーケリング/, 3)),
      ],
      fund_transactions: [
        { id: 'demo-fund-misaki', itinerary_id: itineraryId, member_id: misakiId, kind: 'contribution', amount: 10000, note: '旅行前の集金', occurred_on: '2026-07-25', created_at: createdAt },
        { id: 'demo-fund-yosuke', itinerary_id: itineraryId, member_id: yosukeId, kind: 'contribution', amount: 10000, note: '旅行前の集金', occurred_on: '2026-07-25', created_at: createdAt },
        { id: 'demo-fund-yui', itinerary_id: itineraryId, member_id: yuiId, kind: 'contribution', amount: 5000, note: '子ども分', occurred_on: '2026-07-25', created_at: createdAt },
      ],
    };
  }

  const yen = new Intl.NumberFormat('ja-JP');
  const formatYen = (value: number) => `¥${yen.format(value)}`;
  function equalSplits(total: number, memberIds: string[]) {
    if (!memberIds.length) return [];
    const unit = Math.floor(total / memberIds.length);
    const remainder = total % memberIds.length;
    return memberIds.map((memberId, index) => ({ member_id: memberId, amount: unit + (index < remainder ? 1 : 0) }));
  }
  function itemSplits(item: MoneyItem) {
    return item.splits?.length ? item.splits : equalSplits(item.amount, item.split_member_ids);
  }
  function perPersonAmount(item: MoneyItem) {
    const splits = itemSplits(item);
    return splits.length && splits.every((split) => split.amount === splits[0].amount) ? splits[0].amount : null;
  }
  function splitLabel(item: MoneyItem) {
    const groups = new Map<number, string[]>();
    for (const split of itemSplits(item)) {
      const name = data.members.find((member) => member.id === split.member_id)?.name;
      if (name) groups.set(split.amount, [...(groups.get(split.amount) ?? []), name]);
    }
    return [...groups.entries()].map(([splitAmount, names]) => `${names.join('・')} ${formatYen(splitAmount)}`).join(' ／ ');
  }

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
  const fundContributed = $derived(data.fund_transactions.filter((transaction) => transaction.kind === 'contribution').reduce((sum, transaction) => sum + transaction.amount, 0));
  const fundRefunded = $derived(data.fund_transactions.filter((transaction) => transaction.kind === 'refund').reduce((sum, transaction) => sum + transaction.amount, 0));
  const fundSpent = $derived(paidItems.filter((item) => item.paid_from_fund).reduce((sum, item) => sum + item.amount, 0));
  const fundBalance = $derived(fundContributed - fundRefunded - fundSpent);
  const fundByMember = $derived(data.members.map((member) => ({
    ...member,
    amount: data.fund_transactions
      .filter((transaction) => transaction.member_id === member.id)
      .reduce((sum, transaction) => sum + (transaction.kind === 'contribution' ? transaction.amount : -transaction.amount), 0),
  })).filter((member) => member.amount !== 0));
  const memberSummaries = $derived.by(() => data.members.map((member) => {
    let unsettledPaid = 0;
    let actualOwed = 0;
    let plannedOwed = 0;
    let reimbursableOwed = 0;
    const fundNet = data.fund_transactions
      .filter((transaction) => transaction.member_id === member.id)
      .reduce((sum, transaction) => sum + (transaction.kind === 'contribution' ? transaction.amount : -transaction.amount), 0);
    for (const item of data.items) {
      if (item.status === 'paid' && item.paid_by_member_id === member.id) {
        if (!item.is_settled) unsettledPaid += item.amount;
      }
      const share = itemSplits(item).find((split) => split.member_id === member.id)?.amount;
      if (share !== undefined) {
        if (item.status === 'paid') {
          actualOwed += share;
          if (item.paid_by_member_id && !item.is_settled) reimbursableOwed += share;
          if (item.paid_from_fund) reimbursableOwed += share;
        } else plannedOwed += share;
      }
    }
    return { ...member, unsettledPaid, fundNet, actualOwed, plannedOwed, tripTotal: actualOwed + plannedOwed, balance: unsettledPaid + fundNet - reimbursableOwed };
  }));
  const settlements = $derived.by(() => {
    const accounts = [...memberSummaries.map((member) => ({ name: member.name, balance: member.balance })), { name: '共同基金', balance: -fundBalance }];
    const debtors = accounts.filter((account) => account.balance < 0).map((account) => ({ ...account, left: -account.balance }));
    const creditors = accounts.filter((account) => account.balance > 0).map((account) => ({ ...account, left: account.balance }));
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
  const selectedMember = $derived(data.members.find((member) => member.id === selectedMemberId) ?? null);
  const chronologicalDescending = <T extends { date: string; createdAt: string }>(entries: T[]) => entries.sort((a, b) =>
    `${b.date}\u0000${b.createdAt}`.localeCompare(`${a.date}\u0000${a.createdAt}`),
  );
  const fundHistoryEntries = $derived.by(() => chronologicalDescending([
    ...data.fund_transactions.map((transaction) => ({
      id: `fund-${transaction.id}`, kind: transaction.kind === 'contribution' ? '入金' : '返金', title: transaction.note || memberName(transaction.member_id), amount: transaction.amount,
      date: transaction.occurred_on ?? '', createdAt: transaction.created_at, isIncome: transaction.kind === 'contribution', note: transaction.note ? memberName(transaction.member_id) : '共同基金',
    })),
    ...paidItems.filter((item) => item.paid_from_fund).map((item) => ({
      id: `expense-${item.id}`, kind: '支出', title: item.title, amount: item.amount,
      date: item.occurred_on ?? '', createdAt: item.created_at, isIncome: false, note: splitLabel(item),
    })),
  ]));
  const selectedMemberHistory = $derived.by(() => {
    if (!selectedMember) return [];
    const expenses = data.items.flatMap((item) => {
      const share = itemSplits(item).find((split) => split.member_id === selectedMember.id)?.amount;
      const settlement = item.status === 'planned' ? '予定' : item.paid_from_fund ? '共同基金から支払い' : item.is_settled ? '精算済み' : '未精算';
      return share === undefined ? [] : [{ id: `expense-${item.id}`, kind: '支出', title: item.title, amount: share, date: item.occurred_on ?? '', createdAt: item.created_at, isIncome: false, settlement, note: payerLabel(item) }];
    });
    const fundTransactions = data.fund_transactions
      .filter((transaction) => transaction.member_id === selectedMember.id)
      .map((transaction) => ({ id: `fund-${transaction.id}`, kind: transaction.kind === 'contribution' ? '入金' : '返金', title: transaction.note || '共同基金', amount: transaction.amount, date: transaction.occurred_on ?? '', createdAt: transaction.created_at, isIncome: transaction.kind === 'refund', settlement: undefined, note: '共同基金' }));
    return chronologicalDescending([...expenses, ...fundTransactions]);
  });
  const shareText = $derived.by(() => {
    const sections: string[] = [];
    if (shareSettlements) {
      sections.push(['【精算】', settlements.length
        ? settlements.map((settlement) => `${settlement.from} → ${settlement.to}　${formatYen(settlement.amount)}`).join('\n')
        : '精算は不要です'].join('\n'));
    }
    if (shareTransactions) {
      sections.push(['【取引の詳細】', data.items.length
        ? data.items.map((item) => `${item.status === 'paid' ? '確定' : '予定'}｜${item.title}　${formatYen(item.amount)}\n${payerLabel(item)}／${splitLabel(item)}`).join('\n\n')
        : '登録された取引はありません'].join('\n'));
    }
    return sections.join('\n\n');
  });

  function openMemberHistory(memberId: string) { selectedMemberId = memberId; }

  async function shareTextOutput() {
    if (!shareText) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: '旅の精算', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        shareMessage = 'テキストをコピーしました。共有したいアプリに貼り付けてください。';
        return;
      }
      shareSheetOpen = false;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      shareMessage = '共有を開始できませんでした。';
    }
  }

  async function load() {
    if (loading || hasLoaded) return;
    loading = true;
    error = '';
    try {
      if (isDemoMoney()) {
        const storedMoney = demoStorage.getMoneyData();
        const defaults = demoMoneyData();
        data = storedMoney
          ? {
              ...storedMoney,
              fund_transactions: storedMoney.fund_transactions ?? [],
              items: storedMoney.items.map((item, index) => ({
                ...item,
                paid_from_fund: item.paid_from_fund ?? false,
                step_id: item.step_id ?? defaults.items[index]?.step_id ?? null,
              })),
            }
          : defaults;
        if (!storedMoney || data.items.some((item, index) => item.step_id !== storedMoney.items[index]?.step_id)) demoStorage.setMoneyData(data);
        budget = data.budget_amount?.toString() ?? '';
        participantIds = data.members.map((member) => member.id);
        fundMemberId ||= data.members[0]?.id ?? '';
        return;
      }

      data = await moneyApi.get(itineraryId);
      budget = data.budget_amount?.toString() ?? '';
      participantIds = data.members.map((member) => member.id);
      fundMemberId ||= data.members[0]?.id ?? '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'お金の管理データを読み込めませんでした';
    } finally {
      loading = false;
      hasLoaded = true;
    }
  }

  onMount(() => { if (show) load(); });
  $effect(() => { if (show && !hasLoaded) load(); else if (!show) hasLoaded = false; });
  $effect(() => {
    if (!requestedEditItemId) {
      handledEditItemId = null;
      return;
    }
    if (!show || !hasLoaded || handledEditItemId === requestedEditItemId) return;
    handledEditItemId = requestedEditItemId;
    const requestedItem = data.items.find((item) => item.id === requestedEditItemId);
    if (requestedItem) void editItem(requestedItem).finally(() => onEditItemOpened?.());
    else onEditItemOpened?.();
  });

  function saveDemoData(next: MoneyData) {
    data = next;
    demoStorage.setMoneyData(next);
  }

  function toggleParticipant(memberId: string) {
    participantIds = participantIds.includes(memberId)
      ? participantIds.filter((id) => id !== memberId)
      : [...participantIds, memberId];
    if (!(memberId in customAmounts)) customAmounts = { ...customAmounts, [memberId]: '' };
  }

  function setStatus(nextStatus: MoneyItemStatus) {
    status = nextStatus;
    if (nextStatus === 'planned') {
      payerId = 'individual';
      isSettled = false;
    }
  }

  function setPaymentMethod(nextPayerId: string) {
    payerId = nextPayerId;
    if (nextPayerId && nextPayerId !== 'individual') {
      status = 'paid';
    }
  }

  function payerLabel(item: MoneyItem) {
    if (item.paid_from_fund) return item.status === 'paid' ? '共同基金から支払い' : '共同基金から支払う（予定）';
    const payer = data.members.find((member) => member.id === item.paid_by_member_id);
    if (payer) return `立替：${payer.name}`;
    return item.status === 'paid' ? '各自で支払い済み' : '各自で支払う（予定）';
  }

  function memberName(memberId: string) {
    return data.members.find((member) => member.id === memberId)?.name ?? '削除されたメンバー';
  }

  async function addFundTransaction() {
    const value = Number(fundAmount);
    if (!fundMemberId || !Number.isInteger(value) || value <= 0) return alert('メンバーと1円以上の金額を入力してください');
    const input = { member_id: fundMemberId, kind: fundKind, amount: value, note: fundNote.trim() || null, occurred_on: fundOccurredOn || undefined };
    try {
      if (editingFundTransactionId && isDemoMoney()) {
        saveDemoData({ ...data, fund_transactions: data.fund_transactions.map((transaction) => transaction.id === editingFundTransactionId ? { ...transaction, ...input, occurred_on: input.occurred_on ?? transaction.occurred_on } : transaction) });
      } else if (editingFundTransactionId) {
        const transaction = await moneyApi.updateFundTransaction(itineraryId, editingFundTransactionId, input);
        data = { ...data, fund_transactions: data.fund_transactions.map((current) => current.id === transaction.id ? transaction : current) };
      } else if (isDemoMoney()) {
        const now = new Date().toISOString();
        saveDemoData({ ...data, fund_transactions: [{ id: `demo-fund-${Date.now()}`, itinerary_id: itineraryId, ...input, occurred_on: now.slice(0, 10), created_at: now }, ...data.fund_transactions] });
      } else {
        const transaction = await moneyApi.addFundTransaction(itineraryId, input);
        data = { ...data, fund_transactions: [transaction, ...data.fund_transactions] };
      }
      fundAmount = '';
      fundNote = '';
      fundOccurredOn = '';
      editingFundTransactionId = null;
    } catch (e) { alert(e instanceof Error ? e.message : '共同基金の履歴を保存できませんでした'); }
  }

  async function editFundTransaction(transaction: MoneyFundTransaction) {
    editingFundTransactionId = transaction.id;
    fundMemberId = transaction.member_id;
    fundKind = transaction.kind;
    fundAmount = String(transaction.amount);
    fundNote = transaction.note ?? '';
    fundOccurredOn = transaction.occurred_on;
    fundHistoryOpen = true;
    fundEntryOpen = true;
    await tick();
    fundDetailsElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fundFormElement?.querySelector<HTMLInputElement>('input[aria-label="共同基金の金額（円）"]')?.focus({ preventScroll: true });
  }

  function cancelFundEdit() { editingFundTransactionId = null; fundAmount = ''; fundNote = ''; fundOccurredOn = ''; }

  async function deleteFundTransaction(transactionId: string) {
    if (!confirm('この入出金履歴を削除しますか？')) return;
    try {
      if (!isDemoMoney()) await moneyApi.deleteFundTransaction(itineraryId, transactionId);
      saveDemoDataIfNeeded({ ...data, fund_transactions: data.fund_transactions.filter((transaction) => transaction.id !== transactionId) });
    } catch (e) { alert(e instanceof Error ? e.message : '共同基金の履歴を削除できませんでした'); }
  }

  function saveDemoDataIfNeeded(next: MoneyData) {
    if (isDemoMoney()) saveDemoData(next);
    else data = next;
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

  function selectAmountInputMode(mode: 'total' | 'perPerson') {
    if (mode === amountInputMode) return;
    const enteredValue = Number(amount);
    if (amount.trim() && Number.isInteger(enteredValue) && enteredValue > 0 && participantIds.length) {
      amount = String(mode === 'perPerson'
        ? Math.round(enteredValue / participantIds.length)
        : enteredValue * participantIds.length);
    }
    amountInputMode = mode;
  }

  function selectSplitMode(mode: 'equal' | 'custom') {
    if (mode === 'custom' && amountInputMode === 'perPerson') selectAmountInputMode('total');
    splitMode = mode;
    if (mode === 'custom') {
      const total = Number(amount);
      const suggested = Number.isInteger(total) && total > 0 ? equalSplits(total, participantIds) : [];
      customAmounts = Object.fromEntries(participantIds.map((id) => [id, customAmounts[id] || String(suggested.find((split) => split.member_id === id)?.amount ?? '')]));
    }
  }

  function buildSplits(total: number) {
    if (splitMode === 'equal') return equalSplits(total, participantIds);
    return participantIds.map((memberId) => ({ member_id: memberId, amount: Number(customAmounts[memberId]) }));
  }

  const customSplitTotal = $derived(participantIds.reduce((sum, id) => sum + (Number(customAmounts[id]) || 0), 0));
  const customAmountGroups = $derived.by(() => {
    const groups = new Map<string, { amount: string; members: MoneyMember[] }>();
    for (const member of data.members.filter((current) => participantIds.includes(current.id))) {
      const rawAmount = customAmounts[member.id]?.trim() ?? '';
      const numericAmount = Number(rawAmount);
      const key = rawAmount && Number.isFinite(numericAmount) ? `amount:${numericAmount}` : `member:${member.id}`;
      const group = groups.get(key) ?? { amount: rawAmount, members: [] };
      group.members.push(member);
      groups.set(key, group);
    }
    return [...groups.values()];
  });

  function setCustomGroupAmount(memberIds: string[], nextAmount: string) {
    customAmounts = { ...customAmounts, ...Object.fromEntries(memberIds.map((memberId) => [memberId, nextAmount])) };
  }

  function detachCustomMember(memberId: string) {
    customAmounts = { ...customAmounts, [memberId]: '' };
  }

  async function addItem() {
    const enteredValue = Number(amount);
    if (!title.trim() || !Number.isInteger(enteredValue) || enteredValue <= 0 || !participantIds.length) {
      return alert('内容・金額・負担する人を入力してください');
    }
    const value = amountInputMode === 'perPerson' ? enteredValue * participantIds.length : enteredValue;
    const splits = buildSplits(value);
    if (splits.some((split) => !Number.isInteger(split.amount) || split.amount <= 0)) return alert('一人ずつの負担額を1円以上の整数で入力してください');
    if (splits.reduce((sum, split) => sum + split.amount, 0) !== value) return alert('一人ずつの負担額の合計を総額と一致させてください');
    if (!payerId) return alert('支払い方法を選択してください');
    try {
      if (isDemoMoney()) {
        const now = new Date().toISOString();
        const item: MoneyItem = {
          id: editingItemId ?? `demo-money-item-${Date.now()}`, itinerary_id: itineraryId, title: title.trim(), amount: value,
          status, paid_by_member_id: status === 'paid' && payerId !== 'individual' && payerId !== 'fund' ? payerId : null, paid_from_fund: payerId === 'fund', is_settled: status === 'paid' && payerId !== 'fund' && isSettled,
          step_id: linkedStepId || null, splits, split_member_ids: participantIds, occurred_on: now.slice(0, 10), created_at: now, updated_at: now,
        };
        saveDemoData({ ...data, items: editingItemId ? data.items.map((current) => current.id === editingItemId ? { ...item, created_at: current.created_at } : current) : [item, ...data.items] });
        resetForm();
        return;
      }
      const input = {
        title: title.trim(), amount: value, status,
        paid_by_member_id: status === 'paid' && payerId !== 'individual' && payerId !== 'fund' ? payerId : null,
        paid_from_fund: payerId === 'fund',
        is_settled: status === 'paid' && payerId !== 'fund' && isSettled,
        splits,
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
    title = ''; amount = ''; amountInputMode = 'total'; splitMode = 'equal'; customAmounts = {}; payerId = ''; isSettled = false; linkedStepId = ''; editingItemId = null;
    participantIds = data.members.map((member) => member.id);
  }

  async function editItem(item: MoneyItem) {
    editingItemId = item.id; title = item.title; amount = String(item.amount); amountInputMode = 'total'; status = item.status;
    payerId = item.paid_from_fund ? 'fund' : item.paid_by_member_id ?? 'individual'; isSettled = item.is_settled;
    participantIds = [...item.split_member_ids]; linkedStepId = item.step_id ?? '';
    const splits = itemSplits(item);
    splitMode = splits.every((split) => split.amount === splits[0]?.amount) ? 'equal' : 'custom';
    customAmounts = Object.fromEntries(splits.map((split) => [split.member_id, String(split.amount)]));
    activeTab = 'items';
    await tick();
    itemFormElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    itemFormElement?.querySelector<HTMLInputElement>('input[aria-label="支出の内容"]')?.focus({ preventScroll: true });
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
    void editItem(item);
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
          <details class="standard-money-setup" bind:open={settingsOpen}><summary>詳細設定 <small>予算</small></summary><div class="standard-money-setup-body">
            <label>{budgetView === 'total' ? '全体予算' : '1人あたり予算'} <input inputmode="numeric" placeholder="未設定" bind:value={budget} onblur={saveBudget} /> 円</label>
            <small>旅行メンバーは、しおり設定でまとめて管理できます。</small>
          </div></details>
        {/if}

        <div class="standard-money-tabs"><button class:active={activeTab === 'summary'} onclick={() => activeTab = 'summary'}>精算・内訳</button><button class:active={activeTab === 'items'} onclick={() => activeTab = 'items'}>支出一覧</button></div>
        {#if activeTab === 'summary'}
          <section class="standard-money-fund-card">
            <div class="standard-money-fund-heading"><div><span>みんなで使うお金</span><h3>共同基金</h3></div><div><small>現在の残高</small><strong class:negative={fundBalance < 0}>{formatYen(fundBalance)}</strong></div></div>
            <div class="standard-money-fund-stats"><span>入金 <b>{formatYen(fundContributed)}</b></span><span>基金払い <b>{formatYen(fundSpent)}</b></span>{#if fundRefunded}<span>返金 <b>{formatYen(fundRefunded)}</b></span>{/if}</div>
            {#if fundByMember.length}<div class="standard-money-fund-members">{#each fundByMember as member}<span>{member.name} <b>{formatYen(member.amount)}</b></span>{/each}</div>{/if}
            {#if canEdit}<details class="standard-money-fund-details" bind:this={fundDetailsElement} bind:open={fundEntryOpen}>
              <summary>＋ 入金・返金を記録</summary>
              {#if data.members.length}
                <div class="standard-money-fund-form" bind:this={fundFormElement}>
                  <div class="standard-money-fund-kind" role="group" aria-label="共同基金の入出金区分"><button type="button" class:active={fundKind === 'contribution'} onclick={() => fundKind = 'contribution'}>基金に入金</button><button type="button" class:active={fundKind === 'refund'} onclick={() => fundKind = 'refund'}>基金から返金</button></div>
                  <select aria-label={fundKind === 'contribution' ? '入金するメンバー' : '返金するメンバー'} bind:value={fundMemberId}>{#each data.members as member}<option value={member.id}>{member.name}</option>{/each}</select>
                  <input aria-label="共同基金の金額（円）" inputmode="numeric" placeholder="例：10,000円" bind:value={fundAmount} />
                  <input aria-label="共同基金のメモ" placeholder="例：旅行前の集金" bind:value={fundNote} />
                  <input aria-label="共同基金の取引日" type="date" bind:value={fundOccurredOn} />
                  {#if editingFundTransactionId}<button type="button" class="standard-money-cancel" onclick={cancelFundEdit}>編集をやめる</button>{/if}
                  <button class="standard-money-submit" onclick={addFundTransaction}>{editingFundTransactionId ? '取引を保存' : fundKind === 'contribution' ? '共同基金に入金' : '返金を記録'}</button>
                </div>
              {/if}
            </details>{/if}
            <button class="standard-money-fund-history-toggle" aria-expanded={fundHistoryOpen} onclick={() => fundHistoryOpen = !fundHistoryOpen}>{fundHistoryOpen ? '履歴を隠す' : `履歴を見る（${fundHistoryEntries.length}件）`}</button>
            {#if fundHistoryOpen}
              {#if fundHistoryEntries.length}
                <div class="standard-money-fund-list">{#each fundHistoryEntries as entry (entry.id)}<article><div><strong>{entry.title} <em class:refund={entry.kind === '返金'} class:expense={entry.kind === '支出'}>{entry.kind}</em></strong><small>{entry.date}{entry.note ? ` · ${entry.note}` : ''}</small></div><b class:negative={!entry.isIncome}>{entry.isIncome ? '+' : '-'}{formatYen(entry.amount)}</b>{#if canEdit && entry.id.startsWith('fund-')}<button aria-label="入出金履歴を編集" onclick={() => editFundTransaction(data.fund_transactions.find((transaction) => `fund-${transaction.id}` === entry.id)!)}>編集</button><button aria-label="入出金履歴を削除" onclick={() => deleteFundTransaction(entry.id.slice(5))}>削除</button>{/if}</article>{/each}</div>
              {:else}<p class="standard-money-fund-empty">まだ共同基金の取引はありません。</p>{/if}
            {/if}
          </section>
          {#if !data.members.length}<p class="standard-money-empty">メンバーを追加すると、立替と精算額を自動で計算します。</p>
          {:else}
            <div class="standard-money-person-list">{#each memberSummaries as member}<article><div><button class="standard-money-member-history" onclick={() => openMemberHistory(member.id)} aria-label={`${member.name}の旅行中の取引履歴を見る`}><strong>{member.name}</strong><span>履歴を見る</span></button><span class="standard-money-trip-total">旅行での支出合計 <b>{formatYen(member.tripTotal)}</b></span></div><b class:positive={member.balance > 0} class:negative={member.balance < 0}>{member.balance > 0 ? '+' : ''}{formatYen(member.balance)}</b></article>{/each}</div>
            <section class="standard-money-settlements"><div class="standard-money-settlements-heading"><div><h3>いま精算するなら</h3><small>予定支出と精算済みの支出は、精算額に含めていません。</small></div><button class="standard-money-share-button" onclick={() => { shareMessage = ''; shareSheetOpen = true; }}>共有</button></div>{#if settlements.length}{#each settlements as settlement}<p><b>{settlement.from}</b> → <b>{settlement.to}</b><strong>{formatYen(settlement.amount)}</strong></p>{/each}{:else}<p>精算は不要です</p>{/if}</section>
          {/if}
        {:else}
          {#if canEdit && data.members.length}
            <section class="standard-money-form" bind:this={itemFormElement}>
              <h3>{editingItemId ? '支出を編集' : '支出を登録'}</h3>
              <label class="standard-money-field">
                <span>内容</span>
                <input aria-label="支出の内容" placeholder="例：ホテル、交通費" bind:value={title} />
              </label>
              <div class="standard-money-form-row">
                <div class="standard-money-field">
                  <div class="standard-money-amount-heading">
                    <span>金額</span>
                    <div class="standard-money-amount-segment" role="group" aria-label="金額の入力方法">
                      <button type="button" class:active={amountInputMode === 'total'} onclick={() => selectAmountInputMode('total')}>総額</button>
                      <button type="button" class:active={amountInputMode === 'perPerson'} onclick={() => selectAmountInputMode('perPerson')}>1人あたり</button>
                    </div>
                  </div>
                  <input aria-label={amountInputMode === 'total' ? '総額（円）' : '1人あたり金額（円）'} inputmode="numeric" placeholder={amountInputMode === 'total' ? '総額（円）' : '1人あたり（円）'} bind:value={amount} />
                </div>
                <label class="standard-money-field">
                  <span>支払い状況</span>
                  <select value={status} onchange={(event) => setStatus((event.currentTarget as HTMLSelectElement).value as MoneyItemStatus)}>
                    <option value="paid">支払い済み</option>
                    <option value="planned">これから支払う</option>
                  </select>
                </label>
              </div>
              <label class="standard-money-field">
                <span>支払い方法</span>
                <select value={payerId} onchange={(event) => setPaymentMethod((event.currentTarget as HTMLSelectElement).value)}>
                  <option value="">選択してください</option>
                  <option value="individual">各自で支払う</option>
                  <option value="fund">共同基金から支払う</option>
                  {#each data.members as member}<option value={member.id}>{member.name} が立替える</option>{/each}
                </select>
              </label>
              {#if steps.length}
                <label class="standard-money-field">
                  <span>予定との紐づけ</span>
                  <select bind:value={linkedStepId}><option value="">予定に紐づけない</option>{#each steps as step}<option value={step.id}>{step.title}</option>{/each}</select>
                </label>
              {/if}
              <fieldset class="standard-money-checks">
                <div class="standard-money-split-heading">
                  <legend>誰がいくら負担する？</legend>
                  <div class="standard-money-amount-segment" role="group" aria-label="負担額の分け方">
                    <button type="button" class:active={splitMode === 'equal'} onclick={() => selectSplitMode('equal')}>同じ金額</button>
                    <button type="button" class:active={splitMode === 'custom'} onclick={() => selectSplitMode('custom')}>人ごとに設定</button>
                  </div>
                </div>
                <div>
                  {#each data.members as member}
                    <label class:active={participantIds.includes(member.id)}>
                      <input type="checkbox" checked={participantIds.includes(member.id)} onchange={() => toggleParticipant(member.id)} />
                      <span class="standard-money-checkmark" aria-hidden="true">{participantIds.includes(member.id) ? '✓' : ''}</span>
                      <span>{member.name}</span>
                    </label>
                  {/each}
                </div>
                {#if splitMode === 'custom' && participantIds.length}
                  <div class="standard-money-custom-splits">
                    {#each customAmountGroups as group}
                      <div class="standard-money-custom-group">
                        <div class="standard-money-custom-members">
                          {#each group.members as member}
                            <span>{member.name}{#if group.members.length > 1}<button type="button" aria-label={`${member.name}を別の負担額にする`} onclick={() => detachCustomMember(member.id)}>別額</button>{/if}</span>
                          {/each}
                        </div>
                        <label class="standard-money-custom-input"><span>{group.members.length > 1 ? `${group.members.length}人とも` : '負担額'}</span><input aria-label={`${group.members.map((member) => member.name).join('・')}の負担額（円）`} inputmode="numeric" placeholder="0" value={group.amount} oninput={(event) => setCustomGroupAmount(group.members.map((member) => member.id), event.currentTarget.value)} /> 円</label>
                      </div>
                    {/each}
                    <p class:invalid={Number(amount) !== customSplitTotal}>
                      <span>入力合計</span><b>{formatYen(customSplitTotal)}</b>
                      {#if Number(amount) !== customSplitTotal}<small>総額まで {formatYen(Number(amount) - customSplitTotal)}</small>{/if}
                    </p>
                  </div>
                {/if}
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
                      <small>{splitLabel(item)}</small>
                    </div>
                    {#if stepTitle(item)}<button class="standard-money-step-link" onclick={() => { const linkedStep = steps.find((step) => step.id === item.step_id); if (linkedStep) onViewStep?.(linkedStep); }}>予定：{stepTitle(item)}</button>{/if}
                  </div>
                  <div class="standard-money-item-actions">
                    <b>{formatYen(item.amount)}</b>
                    {#if perPersonAmount(item) !== null}<small class="standard-money-item-per-person">1人あたり {formatYen(perPersonAmount(item)!)}</small>{/if}
                    {#if canEdit && item.status === 'planned'}<button onclick={() => startMarkAsPaid(item)}>支払い済みにする</button>{/if}
                    {#if canEdit && item.status === 'paid' && !item.paid_from_fund}<button class:active={item.is_settled} aria-pressed={item.is_settled} onclick={() => setItemSettled(item, !item.is_settled)}>{item.is_settled ? '精算を戻す' : '精算済みにする'}</button>{/if}
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
  {#if selectedMember}
    <div class="standard-money-subdialog-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (selectedMemberId = null)}>
      <div class="standard-money-subdialog" role="dialog" aria-modal="true" aria-label={`${selectedMember.name}の取引履歴`}>
        <header><div><span>旅行中の取引</span><h3>{selectedMember.name}さんの履歴</h3></div><button aria-label="履歴を閉じる" onclick={() => selectedMemberId = null}>×</button></header>
        {#if selectedMemberHistory.length}
          <div class="standard-money-member-history-list">{#each selectedMemberHistory as entry (entry.id)}<article><div><div class="standard-money-history-badges"><span class:income={entry.isIncome}>{entry.kind}</span>{#if entry.settlement}<span class:unsettled={entry.settlement === '未精算'} class:settled={entry.settlement === '精算済み'}>{entry.settlement}</span>{/if}</div><strong>{entry.title}</strong><small>{entry.date}{entry.note ? ` · ${entry.note}` : ''}</small></div><b class:income={entry.isIncome}>{entry.isIncome ? '+' : '-'}{formatYen(entry.amount)}</b></article>{/each}</div>
        {:else}<p class="standard-money-empty">この人の取引はまだありません。</p>{/if}
      </div>
    </div>
  {/if}
  {#if shareSheetOpen}
    <div class="standard-money-subdialog-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (shareSheetOpen = false)}>
      <div class="standard-money-subdialog standard-money-share-sheet" role="dialog" aria-modal="true" aria-label="精算を共有">
        <header><div><span>LINEなどにそのまま送れます</span><h3>精算を共有</h3></div><button aria-label="共有を閉じる" onclick={() => shareSheetOpen = false}>×</button></header>
        <div class="standard-money-share-options"><label><input type="checkbox" bind:checked={shareSettlements} /><span><b>誰が誰に送るか</b><small>精算の送金案内</small></span></label><label><input type="checkbox" bind:checked={shareTransactions} /><span><b>取引の詳細</b><small>支出の内容・負担・支払い方法</small></span></label></div>
        <section class="standard-money-share-preview"><span>プレビュー</span><pre>{shareText || '共有する項目を選択してください'}</pre></section>
        {#if shareMessage}<p class="standard-money-share-message">{shareMessage}</p>{/if}
        <button class="standard-money-share-submit" disabled={!shareText} onclick={shareTextOutput}>テキストを共有</button>
      </div>
    </div>
  {/if}
{/if}
