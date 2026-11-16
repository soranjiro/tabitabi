<script lang="ts">
  import { onMount } from 'svelte';
  import {
    STEP_TYPE, type Step, type StepType, type PlanGraph, type PlanGraphNode, type PlanGraphEdge,
    type ComparisonOption,
  } from '@tabitabi/types';
  import { planGraphApi } from '$lib/api/plan-graph';
  import { getMemoText } from '$lib/memo';

  let { itineraryId, steps, canEdit, demo = false, showGraph = false, branchRequest = null, optionRequest = null, selectRequest = null, onGraphState, onEditExistingStep, onOpenExistingStep, onCreateStep, onUpdateStep, onDeleteStep, onPlan }: {
    itineraryId: string; steps: Step[]; canEdit: boolean; demo?: boolean; showGraph?: boolean;
    branchRequest?: { id: string; sequence: number; independent?: boolean } | null;
    optionRequest?: { id: string; sequence: number; optionId?: string } | null;
    selectRequest?: { id: string; sequence: number; optionId: string | null } | null;
    onGraphState?: (state: { branched: boolean; choices: Record<string, ComparisonOption[]>; selected: Record<string, string | null> }) => void;
    onEditExistingStep?: (stepId: string) => void;
    onOpenExistingStep?: (stepId: string) => void;
    onCreateStep?: (data: {
      title: string; start_at: number | null; end_at: number | null;
      time_unspecified?: boolean; location?: string; notes?: string; link?: string | null;
      type?: StepType; is_all_day?: boolean; sort_order?: number | null;
    }) => Promise<Step | void>;
    onUpdateStep?: (id: string, data: {
      title?: string; start_at?: number | null; end_at?: number | null;
      time_unspecified?: boolean; location?: string | null; notes?: string;
      link?: string | null; type?: StepType; is_all_day?: boolean;
    }) => Promise<void>;
    onDeleteStep?: (id: string) => Promise<void>;
    onPlan: (node: PlanGraphNode, option?: ComparisonOption) => void;
  } = $props();

  const emptyGraph = (): PlanGraph => ({
    itinerary_id: itineraryId, nodes: [], edges: [], revision: 0, updated_at: null,
  });
  const types: { value: StepType; label: string }[] = [
    { value: STEP_TYPE.NORMAL_GENERAL, label: '一般的な予定' },
    { value: STEP_TYPE.NORMAL_SIGHTSEEING, label: '観光' },
    { value: STEP_TYPE.NORMAL_FOOD, label: '食事' },
    { value: STEP_TYPE.NORMAL_HOTEL, label: '宿泊' },
    { value: STEP_TYPE.TRANSPORT_PLANE, label: '飛行機' },
    { value: STEP_TYPE.TRANSPORT_TRAIN, label: '電車' },
    { value: STEP_TYPE.TRANSPORT_BUS, label: 'バス' },
    { value: STEP_TYPE.TRANSPORT_CAR, label: '車' },
    { value: STEP_TYPE.TRANSPORT_SHIP, label: '船' },
    { value: STEP_TYPE.TRANSPORT_GENERAL, label: '移動' },
    { value: STEP_TYPE.NORMAL_SHOPPING, label: '買い物' },
  ];
  const colors = ['#357764', '#498cba', '#be7894', '#9d8458', '#8075b2', '#469a91'];
  const currencies = ['JPY', 'USD', 'EUR', 'KRW', 'TWD', 'THB', 'GBP', 'AUD', 'CNY'];

  function nodeTemplate(kind: 'step' | 'choices' = 'step', id = ''): PlanGraphNode {
    return {
      id, kind, title: '', type: STEP_TYPE.NORMAL_GENERAL,
      start_local: '', end_local: '', location: '', notes: '', link: '',
      amount: null, currency: 'JPY', participants: [], options: [], selected_option_id: null,
    };
  }
  function optionTemplate(id = ''): ComparisonOption {
    return { id, title: '', provider: '', amount: null, currency: 'JPY',
      start_local: '', end_local: '', from: '', to: '', cancellation: '', url: '', notes: '' };
  }
  function cost(amount: number | null, currency = 'JPY') {
    if (amount === null) return '';
    try { return new Intl.NumberFormat('ja-JP', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return amount.toLocaleString('ja-JP') + ' ' + currency; }
  }
  function localDate(value: string) { return value ? value.slice(5).replace('-', '/') + (value.includes('T') ? ' ' + value.slice(11, 16) : '') : ''; }
  function typeLabel(type: StepType) { return types.find(t => t.value === type)?.label ?? '予定'; }
  function icon(type: StepType) {
    if (type === STEP_TYPE.NORMAL_HOTEL) return '⌂';
    if (type === STEP_TYPE.NORMAL_FOOD) return '♨';
    if (type === STEP_TYPE.TRANSPORT_PLANE) return '✈';
    if (type.startsWith('transport:')) return '↗';
    return '◇';
  }
  function canLink(fromId: string, toId: string, nodes: PlanGraphNode[], edges: PlanGraphEdge[]) {
    if (!fromId || !toId || fromId === toId || edges.some(e => e.from === fromId && e.to === toId)) return false;
    const from = nodes.find(n => n.id === fromId), to = nodes.find(n => n.id === toId);
    if (!from || !to || (from.start_local && to.start_local && from.start_local > to.start_local)) return false;
    const visited = new Set<string>(), stack = [toId];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === fromId) return false;
      if (visited.has(id)) continue;
      visited.add(id);
      stack.push(...edges.filter(e => e.from === id).map(e => e.to));
    }
    return true;
  }
  type DrawNode = { node: PlanGraphNode; x: number; y: number; color: string; label: string; exit: number };
  type DrawEdge = { edge: PlanGraphEdge; path: string; color: string; x: number; y: number };
  function layout(nodes: PlanGraphNode[], edges: PlanGraphEdge[], folded: string[], expanded: string[]) {
    const originalParents = new Map(nodes.map(n => [n.id, edges.filter(e => e.to === n.id).map(e => e.from)]));
    const roots = nodes.filter(n => !originalParents.get(n.id)?.length);
    const visible = new Set(roots.map(n => n.id));
    const next = [...roots.map(n => n.id)];
    while (next.length) {
      const id = next.shift()!;
      for (const edge of edges) if (edge.from === id && !folded.includes(edge.id) && !visible.has(edge.to)) {
        visible.add(edge.to); next.push(edge.to);
      }
    }
    const shownNodes = nodes.filter(n => visible.has(n.id));
    const shownEdges = edges.filter(e => visible.has(e.from) && visible.has(e.to) && !folded.includes(e.id));
    const indegree = new Map(shownNodes.map(n => [n.id, shownEdges.filter(e => e.to === n.id).length]));
    const queue = shownNodes.filter(n => indegree.get(n.id) === 0);
    const sorted: PlanGraphNode[] = [];
    while (queue.length) {
      queue.sort((a, b) => a.start_local.localeCompare(b.start_local) || nodes.indexOf(a) - nodes.indexOf(b));
      const node = queue.shift()!; sorted.push(node);
      for (const edge of shownEdges.filter(e => e.from === node.id)) {
        indegree.set(edge.to, indegree.get(edge.to)! - 1);
        if (indegree.get(edge.to) === 0) queue.push(shownNodes.find(n => n.id === edge.to)!);
      }
    }
    const times = [...new Set(shownNodes.map(n => n.start_local).filter(Boolean))].sort();
    const ranks = new Map<string, number>();
    const xs = new Map<string, number>();
    const rootsSorted = shownNodes.filter(n => !shownEdges.some(e => e.to === n.id));
    for (let i = 0; i < rootsSorted.length; i++) xs.set(rootsSorted[i].id, i * 1.15);
    // Place every step below its predecessors, using time bands as a second ordering constraint.
    for (const node of sorted) {
      const parents = shownEdges.filter(e => e.to === node.id).map(e => e.from);
      const depth = parents.length ? Math.max(...parents.map(id => ranks.get(id) ?? 0)) + 1 : 0;
      const time = node.start_local ? times.indexOf(node.start_local) : 0;
      ranks.set(node.id, Math.max(depth, time));
      if (parents.length) {
        const estimates = parents.map(id => {
          const children = shownEdges.filter(e => e.from === id);
          const position = children.findIndex(e => e.to === node.id);
          return (xs.get(id) ?? 0) + (position - (children.length - 1) / 2) * 1.1;
        });
        xs.set(node.id, estimates.reduce((a, b) => a + b, 0) / estimates.length);
      }
    }
    const byRank = new Map<number, PlanGraphNode[]>();
    for (const node of sorted) {
      const rank = ranks.get(node.id)!;
      byRank.set(rank, [...(byRank.get(rank) ?? []), node]);
    }
    for (const rank of [...byRank.keys()].sort((a, b) => a - b)) {
      const row = byRank.get(rank)!;
      row.sort((a, b) => (xs.get(a.id) ?? 0) - (xs.get(b.id) ?? 0));
      let last = -Infinity;
      for (const node of row) {
        const preferred = xs.get(node.id) ?? 0;
        const actual = Math.max(preferred, last + 1.05);
        xs.set(node.id, actual);
        last = actual;
      }
    }
    const minimum = Math.min(0, ...xs.values());
    const maximum = Math.max(0, ...xs.values()) - minimum;
    const maxRank = Math.max(0, ...ranks.values());
    const heights = Array.from({ length: maxRank + 1 }, () => 164);
    for (const node of sorted) {
      if (node.kind === 'choices' && expanded.includes(node.id)) {
        const rank = ranks.get(node.id)!;
        heights[rank] = Math.max(heights[rank], 176 + Math.min(260, node.options.length * 75 + 52));
      }
    }
    const rowY: number[] = [];
    let cursor = 95;
    for (const height of heights) { rowY.push(cursor); cursor += height; }
    const colorIds = new Map<string, number>();
    for (const node of sorted) {
      const parent = shownEdges.find(e => e.to === node.id);
      if (!parent) colorIds.set(node.id, Math.max(0, rootsSorted.findIndex(root => root.id === node.id)) % colors.length);
      else {
        const siblings = shownEdges.filter(e => e.from === parent.from);
        const branchOffset = siblings.length > 1 ? siblings.findIndex(e => e.id === parent.id) : 0;
        colorIds.set(node.id, ((colorIds.get(parent.from) ?? 0) + branchOffset) % colors.length);
      }
    }
    const draws: DrawNode[] = sorted.map(n => {
      const parent = shownEdges.find(e => e.to === n.id && !!e.label);
      return { node: n, x: 270 + ((xs.get(n.id) ?? 0) - minimum) * 302,
        y: rowY[ranks.get(n.id) ?? 0], label: parent?.label ?? '',
        exit: n.kind === 'choices' && expanded.includes(n.id) ? 102 + Math.min(260, n.options.length * 75 + 52) : 48,
        color: colors[colorIds.get(n.id) ?? 0] };
    });
    const positions = new Map(draws.map(d => [d.node.id, d]));
    const links: DrawEdge[] = shownEdges.map(edge => {
      const a = positions.get(edge.from)!, b = positions.get(edge.to)!;
      const start = a.y + a.exit, end = b.y - 48;
      const delta = Math.max(18, (end - start) / 2);
      return { edge, path: 'M ' + a.x + ' ' + start + ' C ' + a.x + ' ' + (start + delta) + ', ' +
        b.x + ' ' + (end - delta) + ', ' + b.x + ' ' + end,
        color: b.color, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    });
    const ticks = [...new Map(draws.filter(d => d.node.start_local).map(d =>
      [d.y, { y: d.y, label: localDate(d.node.start_local) }]
    )).values()];
    return { nodes: draws, links, ticks, width: Math.max(545, 444 + maximum * 302),
      height: Math.max(210, cursor + 90), count: shownNodes.length };
  }

  let graph = $state<PlanGraph>(emptyGraph());
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let selectedId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let parentId = $state<string | null>(null);
  let branchLabel = $state('');
  let draft = $state<PlanGraphNode>(nodeTemplate());
  let amountText = $state('');
  let participantsText = $state('');
  let formOpen = $state(false);
  let joinTarget = $state('');
  let folded = $state<string[]>([]);
  let expandedChoices = $state<string[]>([]);
  let optionNodeId = $state<string | null>(null);
  let editingOptionId = $state<string | null>(null);
  let option = $state<ComparisonOption>(optionTemplate());
  let optionAmountText = $state('');
  let optionOpen = $state(false);
  let mobileHelpOpen = $state(false);

  function localInput(timestamp: number | null) {
    if (timestamp === null || !Number.isFinite(timestamp)) return '';
    const d = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
      pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fromStep(step: Step): PlanGraphNode {
    return {
      id: step.id, kind: 'step', title: step.title,
      type: step.type ?? STEP_TYPE.NORMAL_GENERAL,
      start_local: localInput(step.start_at), end_local: localInput(step.end_at),
      location: step.location ?? '', notes: getMemoText(step.notes).slice(0, 2000),
      link: step.link ?? '', amount: null, currency: 'JPY', participants: [],
      options: [], selected_option_id: null,
    };
  }
  // Existing itinerary steps are always the source of truth. The graph stores only
  // routes, participants, comparison choices, and other planning metadata.
  const displayNodes = $derived.by(() => {
    const ids = new Set(steps.map(step => step.id));
    return [
      ...steps.map(step => {
        const extra = graph.nodes.find(node => node.id === step.id);
        return { ...fromStep(step), ...extra, ...fromStep(step),
          kind: extra?.kind ?? 'step',
          amount: extra?.amount ?? null, currency: extra?.currency ?? 'JPY',
          participants: extra?.participants ?? [], options: extra?.options ?? [],
          selected_option_id: extra?.selected_option_id ?? null } satisfies PlanGraphNode;
      }),
      ...graph.nodes.filter(node => !ids.has(node.id)),
    ];
  });
  const displayEdges = $derived.by(() => {
    const valid = new Set(displayNodes.map(node => node.id));
    const persisted = graph.edges.filter(edge => valid.has(edge.from) && valid.has(edge.to));
    // Comparison metadata alone must never turn a conventional itinerary into independent lanes.
    // An explicit Step node or connection is required to activate route editing.
    if (persisted.length || graph.nodes.some(node => node.kind === 'step')) return persisted;
    const ordered = [...steps].sort((a, b) => (a.start_at ?? Infinity) - (b.start_at ?? Infinity)
      || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return ordered.slice(1).map((step, i) => ({
      id: 'auto-' + i, from: ordered[i].id, to: step.id, label: '',
    }));
  });
  const isBranched = $derived.by(() => {
    if (displayNodes.length <= 1) return false;
    const out = new Map<string, number>(), incoming = new Map<string, number>();
    for (const edge of displayEdges) {
      out.set(edge.from, (out.get(edge.from) ?? 0) + 1);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
    const roots = displayNodes.filter(node => !incoming.has(node.id));
    return roots.length > 1 || [...out.values()].some(n => n > 1) || [...incoming.values()].some(n => n > 1);
  });
  const drawn = $derived(layout(displayNodes, displayEdges, folded, expandedChoices));
  const selected = $derived(displayNodes.find(n => n.id === selectedId) ?? null);
  const optionNode = $derived(displayNodes.find(n => n.id === optionNodeId) ?? null);
  const targets = $derived(selected ? displayNodes.filter(n => canLink(selected.id, n.id, displayNodes, displayEdges)) : []);
  $effect(() => {
    if (loading) return;
    const choices: Record<string, ComparisonOption[]> = {};
    const selected: Record<string, string | null> = {};
    for (const node of displayNodes) {
      if (node.options.length) {
        choices[node.id] = node.options;
        selected[node.id] = node.selected_option_id;
      }
    }
    onGraphState?.({ branched: isBranched, choices, selected });
  });
  let handledBranchRequest = -1;
  let handledOptionRequest = -1;
  let handledSelectRequest = -1;
  $effect(() => {
    const request = branchRequest;
    if (loading || !request || handledBranchRequest === request.sequence) return;
    handledBranchRequest = request.sequence;
    newStep(request.independent ? null : request.id, false, request.independent ? '' : '別プラン');
  });
  $effect(() => {
    const request = optionRequest;
    if (loading || !request || handledOptionRequest === request.sequence) return;
    handledOptionRequest = request.sequence;
    const node = displayNodes.find(value => value.id === request.id);
    if (node) openOption(node, request.optionId ? node.options.find(value => value.id === request.optionId) : undefined);
  });
  $effect(() => {
    const request = selectRequest;
    if (loading || !request || handledSelectRequest === request.sequence) return;
    handledSelectRequest = request.sequence;
    const node = displayNodes.find(value => value.id === request.id);
    if (node) void selectOption(node, request.optionId);
  });

  async function load() {
    if (demo) { loading = false; return; }
    loading = true;
    try { graph = await planGraphApi.get(itineraryId); error = ''; }
    catch { error = 'タイムラインを読み込めませんでした。'; }
    finally { loading = false; }
  }
  onMount(() => { void load(); });

  async function save(nodes: PlanGraphNode[], edges: PlanGraphEdge[]) {
    if (!canEdit || busy) return false;
    busy = true; error = '';
    try {
      graph = demo
        ? { ...graph, nodes, edges, revision: graph.revision + 1, updated_at: new Date().toISOString() }
        : await planGraphApi.save(itineraryId, { nodes, edges, revision: graph.revision });
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '変更を保存できませんでした。';
      return false;
    } finally { busy = false; }
  }

  function newStep(source: string | null = null, asChoice = false, label = '') {
    if (!canEdit) return;
    editingId = null; parentId = source; branchLabel = label;
    draft = nodeTemplate(asChoice ? 'choices' : 'step', crypto.randomUUID());
    if (source) {
      const parent = displayNodes.find(n => n.id === source);
      if (parent) { draft.start_local = parent.end_local || parent.start_local; draft.participants = [...parent.participants]; }
    }
    if (asChoice) draft.title = '移動・宿泊の候補';
    amountText = ''; participantsText = draft.participants.join('、'); formOpen = true;
  }
  function editStep(node: PlanGraphNode) {
    if (!canEdit) return;
    editingId = node.id; parentId = null; branchLabel = '';
    draft = { ...node, participants: [...node.participants], options: [...node.options] };
    amountText = node.amount === null ? '' : String(node.amount);
    participantsText = node.participants.join('、');
    formOpen = true;
  }
  function checkedAmount(value: string) {
    if (!value.trim()) return null;
    if (!/^\d+$/.test(value.trim()) || Number(value) > 1_000_000_000_000) {
      error = '金額は0以上の整数で入力してください。'; return undefined;
    }
    return Number(value);
  }
  async function submitStep(event: SubmitEvent) {
    event.preventDefault();
    const amount = checkedAmount(amountText);
    if (amount === undefined) return;
    const participants = [...new Set(participantsText.split(/[,、\n]/).map(x => x.trim()).filter(Boolean))];
    if (participants.length > 20 || participants.some(x => x.length > 40)) { error = '参加者は20人まで登録できます。'; return; }
    const next = { ...draft, title: draft.title.trim(), amount, participants };
    if (next.start_local && next.end_local && next.end_local < next.start_local) {
      error = '終了時刻は開始時刻以降にしてください。'; return;
    }
    if (!onCreateStep || !onUpdateStep) { error = '予定を編集できません。'; return; }
    busy = true; error = '';
    let actualId = next.id;
    try {
      const start = next.start_local ? new Date(next.start_local).getTime() : null;
      const end = start === null ? null : (next.end_local ? new Date(next.end_local).getTime() : start + 3600000);
      if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end)) || (start !== null && end! < start)) {
        error = '日時を確認してください。'; return;
      }
      const fields = {
        title: next.title, start_at: start, end_at: end,
        time_unspecified: false, type: next.type, is_all_day: false,
        location: next.location, notes: next.notes, link: next.link || null,
      };
      if (editingId && steps.some(step => step.id === editingId)) {
        await onUpdateStep(editingId, fields);
      } else if (!editingId) {
        const created = await onCreateStep(fields);
        if (created?.id) actualId = created.id;
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '予定の保存に失敗しました。';
      return;
    } finally { busy = false; }
    const stored = { ...next, id: actualId };
    const nodes = graph.nodes.some(n => n.id === actualId)
      ? graph.nodes.map(n => n.id === actualId ? stored : n) : [...graph.nodes, stored];
    const edges = parentId ? [...displayEdges, {
      id: crypto.randomUUID(), from: parentId, to: actualId, label: branchLabel,
    }] : [...displayEdges];
    if (await save(nodes, edges)) { formOpen = false; selectedId = actualId; }
  }
  async function removeNode(node: PlanGraphNode) {
    if (!confirm('「' + node.title + '」を削除しますか？ 接続も解除されます。')) return;
    if (steps.some(step => step.id === node.id) && onDeleteStep) {
      try { await onDeleteStep(node.id); }
      catch (cause) { error = cause instanceof Error ? cause.message : '予定を削除できませんでした。'; return; }
    }
    if (await save(graph.nodes.filter(n => n.id !== node.id), displayEdges.filter(e => e.from !== node.id && e.to !== node.id))) selectedId = null;
  }
  async function join() {
    if (!selected || !canLink(selected.id, joinTarget, displayNodes, displayEdges)) return;
    if (await save(graph.nodes, [...displayEdges, { id: crypto.randomUUID(), from: selected.id, to: joinTarget, label: '' }])) joinTarget = '';
  }
  async function unlink(edge: PlanGraphEdge) {
    if (!confirm('この接続を外しますか？')) return;
    await save(graph.nodes, displayEdges.filter(e => e.id !== edge.id));
  }
  function openOption(node: PlanGraphNode, current?: ComparisonOption) {
    optionNodeId = node.id; editingOptionId = current?.id ?? null;
    option = current ? { ...current } : optionTemplate(crypto.randomUUID());
    optionAmountText = current?.amount == null ? '' : String(current.amount);
    optionOpen = true; error = '';
  }
  async function submitOption(event: SubmitEvent) {
    event.preventDefault();
    if (!optionNode) return;
    const amount = checkedAmount(optionAmountText);
    if (amount === undefined) return;
    const next = { ...option, amount, title: option.title.trim() };
    const options = editingOptionId
      ? optionNode.options.map(item => item.id === editingOptionId ? next : item)
      : [...optionNode.options, next];
    const nodes = graph.nodes.some(n => n.id === optionNode.id)
      ? graph.nodes.map(n => n.id === optionNode.id ? { ...n, kind: 'choices' as const, options } : n)
      : [...graph.nodes, { ...optionNode, kind: 'choices' as const, options }];
    if (await save(nodes, displayEdges)) optionOpen = false;
  }
  async function selectOption(node: PlanGraphNode, id: string | null) {
    const nodes = graph.nodes.some(n => n.id === node.id)
      ? graph.nodes.map(n => n.id === node.id ? { ...n, kind: 'choices' as const, selected_option_id: id } : n)
      : [...graph.nodes, { ...node, kind: 'choices' as const, selected_option_id: id }];
    await save(nodes, displayEdges);
  }
  async function removeOption(node: PlanGraphNode, id: string) {
    if (!confirm('この候補を削除しますか？')) return;
    await save(graph.nodes.map(n => n.id === node.id ? {
      ...n, options: n.options.filter(o => o.id !== id),
      selected_option_id: n.selected_option_id === id ? null : n.selected_option_id,
    } : n), displayEdges);
  }
  function hideEdge(id: string) { folded = folded.includes(id) ? folded.filter(value => value !== id) : [...folded, id]; }
</script>

{#if showGraph}
<section class="graph-board" aria-label="分岐・合流プラン">
  <div class="graph-toolbar">
    <div class="graph-title"><h2>予定</h2><span>{displayNodes.length}件</span></div>
    {#if canEdit && displayNodes.length > 0}<div class="toolbar-actions">
      <button class="outline" onclick={() => newStep()}>＋ 別の出発点</button>
      <button class="primary" onclick={() => newStep(displayNodes.at(-1)?.id ?? null)}>＋ 予定を追加</button>
    </div>{/if}
  </div>
  {#if error}<div class="error" role="alert">{error}<button onclick={load}>再読込</button></div>{/if}
  {#if loading}<p class="status">読み込み中…</p>
  {:else if displayNodes.length === 0}
    <div class="graph-empty">
      <svg viewBox="0 0 220 120" aria-hidden="true"><path d="M110 12V38 M110 38C110 55 55 42 55 70V94 M110 38C110 55 165 42 165 70V94" stroke="#73a490" stroke-width="3" fill="none"/><circle cx="110" cy="12" r="8"/><circle cx="55" cy="94" r="8"/><circle cx="165" cy="94" r="8"/></svg>
      <strong>最初の予定を追加</strong>
      {#if canEdit}<button class="primary" onclick={() => newStep()}>＋ 予定を追加</button>{/if}
    </div>
  {:else}
    <div class="graph-scroll" class:single={!isBranched} role="region" aria-label="上から下へ時間が進むプラン図。横にスクロールできます。">
      <div class="graph-canvas" style:width={drawn.width + 'px'} style:height={drawn.height + 'px'}>
        <svg class="graph-wires" width={drawn.width} height={drawn.height} viewBox={'0 0 ' + drawn.width + ' ' + drawn.height} aria-hidden="true">
          <line x1="113" x2="113" y1="30" y2={drawn.height - 40} stroke="#d1ddd3" stroke-width="1.5"/>
          {#each drawn.ticks as tick}
            <line x1="109" x2={drawn.width - 12} y1={tick.y} y2={tick.y} stroke="#dce7de" stroke-dasharray="3 7" stroke-width="1"/>
            <circle cx="113" cy={tick.y} r="4" fill="#f6f9f5" stroke="#8aab99" stroke-width="1.5"/>
          {/each}
          {#each drawn.links as link (link.edge.id)}
            <path d={link.path} stroke={link.color} stroke-width="3" fill="none" stroke-linecap="round"/>
            <circle cx={link.x} cy={link.y} r="3" fill={link.color}/>
          {/each}
        </svg>
        {#each drawn.ticks as tick}
          <div class="time-tick" style:top={(tick.y - 8) + 'px'}>{tick.label}</div>
        {/each}
        {#each drawn.nodes as item (item.node.id)}
          {@const node = item.node}
          <div class="graph-node" class:is-selected={selectedId === node.id} class:choice-node={node.kind === 'choices'}
            style:left={(item.x - 130) + 'px'} style:top={(item.y - 46) + 'px'} style:--lane-color={item.color}>
            {#if item.label}<span class="lane-caption">{item.label}</span>{/if}
            <button class="node-main" onclick={() => selectedId = selectedId === node.id ? null : node.id} aria-pressed={selectedId === node.id}>
              <span class="node-mark">{icon(node.type)}</span>
              <span class="node-copy"><small>{localDate(node.start_local) || typeLabel(node.type)}</small><strong>{node.title}</strong>
                {#if node.location}<small>{node.location}</small>{/if}
                {#if node.participants.length}<small class="participants">{node.participants.join('・')}</small>{/if}
              </span>
              {#if node.amount !== null}<span class="node-price">{cost(node.amount, node.currency)}</span>{/if}
            </button>
            {#if node.kind === 'choices'}
              <div class="choice-summary"><span>{node.options.length}案</span>
                <button onclick={() => expandedChoices = expandedChoices.includes(node.id) ? expandedChoices.filter(id => id !== node.id) : [...expandedChoices, node.id]}>
                  {expandedChoices.includes(node.id) ? '閉じる' : '比較する'} <span aria-hidden="true">⌄</span>
                </button>
              </div>
              {#if expandedChoices.includes(node.id)}
                <div class="choice-list">
                  {#each node.options as candidate (candidate.id)}
                    <div class="choice-item" class:adopted={node.selected_option_id === candidate.id}>
                      <button class="choice-select" title="この候補を選択" disabled={!canEdit || busy}
                        onclick={() => selectOption(node, node.selected_option_id === candidate.id ? null : candidate.id)}>
                        {node.selected_option_id === candidate.id ? '●' : '○'}
                      </button>
                      <div class="choice-copy">
                        <strong>{candidate.title}</strong>
                        {#if candidate.amount !== null}<small>{cost(candidate.amount, candidate.currency)}</small>{/if}
                        {#if candidate.start_local}<small>{localDate(candidate.start_local)}</small>{/if}
                        {#if candidate.notes}<small class="clamp">{candidate.notes}</small>{/if}
                        {#if candidate.url}<a href={candidate.url} target="_blank" rel="noopener noreferrer">リンク</a>{/if}
                      </div>
                      {#if canEdit}<button class="choice-edit" onclick={() => openOption(node, candidate)}>編集</button>{/if}
                    </div>
                  {/each}
                  {#if canEdit && node.options.length < 30}<button class="add-choice" onclick={() => openOption(node)}>＋ 候補を追加</button>{/if}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>
    {#if isBranched}<div class="graph-footer"><span>上から下へ時系列</span><span>{drawn.count}件</span></div>{/if}
    {#if selected}
      <div class="detail-panel">
        <div class="panel-heading"><div><small>{typeLabel(selected.type)}</small><h3>{selected.title}</h3></div><button aria-label="閉じる" onclick={() => selectedId = null}>×</button></div>
        {#if selected.start_local || selected.end_local}<p class="panel-sub">{localDate(selected.start_local)}{selected.end_local ? ' ― ' + localDate(selected.end_local) : ''}</p>{/if}
        {#if selected.notes}<p class="note">{selected.notes}</p>{/if}
        {#if selected.link}<a class="external" href={selected.link} target="_blank" rel="noopener noreferrer">参考リンク</a>{/if}
        <div class="panel-actions">
          {#if canEdit}
            <button class="primary" onclick={() => newStep(selected!.id)}>＋ 次の予定</button>
            <button onclick={() => newStep(selected!.id, false, '別プラン')}>↗ ここから分岐</button>
            <button onclick={() => openOption(selected!)}>◇ 候補を追加</button>
            <button onclick={() => {
              if (steps.some(step => step.id === selected!.id) && onEditExistingStep) onEditExistingStep(selected!.id);
              else editStep(selected!);
            }}>編集</button>
            {#if steps.some(step => step.id === selected!.id) && onOpenExistingStep}
              <button onclick={() => onOpenExistingStep?.(selected!.id)}>詳細</button>
            {/if}
            {#if selected.kind === 'choices' && selected.selected_option_id}
              <button onclick={() => onPlan(selected!, selected!.options.find(o => o.id === selected!.selected_option_id))}>選択案を予定に追加</button>
            {/if}
            <button class="danger" onclick={() => removeNode(selected!)}>削除</button>
          {/if}
        </div>
        {#if selected.kind === 'choices' && canEdit && selected.options.length < 30}
          <button class="small-action" onclick={() => openOption(selected!)}>＋ 候補を追加</button>
        {/if}
        {#if canEdit && targets.length}
          <div class="join-form"><label for="join-target">この予定から合流</label>
            <select id="join-target" bind:value={joinTarget}><option value="">合流先を選択</option>
              {#each targets as target}<option value={target.id}>{target.title}</option>{/each}
            </select><button disabled={!joinTarget || busy} onclick={join}>接続</button>
          </div>
        {/if}
        {#if displayEdges.some(e => e.from === selected!.id)}
          <div class="branches"><small>この先のルート</small>
            {#each displayEdges.filter(e => e.from === selected!.id) as edge (edge.id)}
              <div><span>{edge.label || displayNodes.find(n => n.id === edge.to)?.title}</span>
                <button onclick={() => hideEdge(edge.id)}>{folded.includes(edge.id) ? '展開' : '閉じる'}</button>
                {#if canEdit}<button onclick={() => unlink(edge)} class="danger">解除</button>{/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</section>
{/if}

{#if formOpen && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && !busy && (formOpen = false)}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="分岐プランの予定">
      <div class="sheet-header"><div><small>{draft.kind === 'choices' ? '候補を比較' : '分岐プラン'}</small><h3>{editingId ? '予定を編集' : '予定を追加'}</h3></div>
        <button aria-label="閉じる" onclick={() => formOpen = false}>×</button></div>
      <form onsubmit={submitStep}>
        <label>タイトル<input bind:value={draft.title} maxlength="140" required placeholder="例：京都へ移動" /></label>
        <label>種類<select bind:value={draft.type}>{#each types as t}<option value={t.value}>{t.label}</option>{/each}</select></label>
        {#if parentId}<label>ルート名 <small>任意</small><input bind:value={branchLabel} maxlength="80" placeholder="例：プラン B" /></label>{/if}
        <div class="two"><label>開始（現地時刻）<input type="datetime-local" bind:value={draft.start_local} /></label>
          <label>終了（現地時刻）<input type="datetime-local" bind:value={draft.end_local} /></label></div>
        <label>場所<input bind:value={draft.location} maxlength="250" placeholder="任意" /></label>
        <div class="two"><label>参考金額<input type="text" inputmode="numeric" pattern="[0-9]*" bind:value={amountText} placeholder="未入力" /></label>
          <label>通貨<select bind:value={draft.currency}>{#each currencies as currency}<option value={currency}>{currency}</option>{/each}</select></label></div>
        <label>参加者 <small>「、」区切り</small><input bind:value={participantsText} placeholder="例：Aさん、Bさん" /></label>
        <label>メモ<textarea bind:value={draft.notes} maxlength="2000" rows="3" placeholder="検討中のことなど"></textarea></label>
        <label>リンク<input type="url" bind:value={draft.link} maxlength="2048" placeholder="https://" /></label>
        <div class="form-actions"><button type="button" onclick={() => formOpen = false}>キャンセル</button><button class="primary" disabled={busy || !draft.title.trim()}>保存</button></div>
      </form>
    </div>
  </div>
{/if}

{#if optionOpen && optionNode && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && !busy && (optionOpen = false)}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="候補の編集">
      <div class="sheet-header"><div><small>{optionNode.title}</small><h3>候補{editingOptionId ? 'を編集' : 'を追加'}</h3></div><button onclick={() => optionOpen = false} aria-label="閉じる">×</button></div>
      <form onsubmit={submitOption}>
        <label>タイトル<input bind:value={option.title} maxlength="140" required /></label>
        <div class="two"><label>提供元<input bind:value={option.provider} maxlength="100" /></label>
          <label>料金<input type="text" inputmode="numeric" pattern="[0-9]*" bind:value={optionAmountText} /></label></div>
        <label>通貨<select bind:value={option.currency}>{#each currencies as currency}<option value={currency}>{currency}</option>{/each}</select></label>
        <div class="two"><label>開始（現地時刻）<input type="datetime-local" bind:value={option.start_local} /></label>
          <label>終了（現地時刻）<input type="datetime-local" bind:value={option.end_local} /></label></div>
        <div class="two"><label>出発地<input bind:value={option.from} maxlength="140" /></label>
          <label>到着地・場所<input bind:value={option.to} maxlength="140" /></label></div>
        <label>キャンセル・変更条件<input bind:value={option.cancellation} maxlength="300" /></label>
        <label>メモ<textarea bind:value={option.notes} maxlength="2000" rows="3"></textarea></label>
        <label>リンク<input type="url" bind:value={option.url} maxlength="2048" placeholder="https://" /></label>
        <div class="form-actions">
          {#if editingOptionId}<button type="button" class="danger" onclick={() => { void removeOption(optionNode!, editingOptionId!); optionOpen = false; }}>削除</button>{/if}
          <button type="button" onclick={() => optionOpen = false}>キャンセル</button><button class="primary" disabled={busy || !option.title.trim()}>保存</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .graph-board{padding:0 0 24px;color:#293a32}
  button{font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
  .graph-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:18px 0}
  .graph-title{display:flex;align-items:baseline;gap:12px}.graph-title h2{margin:0;font-size:19px}.graph-title span{font-size:11px;color:#87928b}
  .toolbar-actions{display:flex;gap:7px;flex-wrap:wrap}.primary{border:0;border-radius:999px;padding:10px 16px;background:#2f6657;color:white;font-size:12px;font-weight:750}
  .graph-scroll{width:100%;overflow:auto;border:1px solid #e4eae4;border-radius:16px;background:radial-gradient(ellipse at top,#f7faf6,#fff 70%);scrollbar-color:#c9d7cc transparent}
  .graph-scroll.single{border-color:transparent;background:transparent}
  .graph-scroll.single .graph-canvas{margin:0 auto}
  .graph-canvas{position:relative;min-height:240px}.graph-wires{position:absolute;inset:0;pointer-events:none}
  .time-tick{position:absolute;left:10px;width:96px;text-align:right;font-size:10px;font-variant-numeric:tabular-nums;color:#6d8674;white-space:nowrap}
  .graph-node{position:absolute;width:260px;min-height:91px;border:1px solid #dfe6df;border-left:3px solid var(--lane-color);border-radius:14px;background:white;box-shadow:0 4px 16px #1d3c2a0e;z-index:1}
  .graph-node.is-selected{border-color:var(--lane-color);box-shadow:0 0 0 3px #c7e5d47a,0 6px 19px #1d3c2a14}
  .lane-caption{position:absolute;top:-24px;left:8px;padding:3px 8px;border:1px solid #e0e7df;border-radius:999px;background:#fff;color:var(--lane-color);font-size:10px;font-weight:800;white-space:nowrap}
  .node-main{display:flex;align-items:center;gap:10px;width:100%;min-height:88px;padding:12px 10px;border:0;background:transparent;text-align:left}
  .node-mark{flex:none;width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#eff5ef;color:#3b7767;font-size:20px}
  .node-copy{display:grid;gap:3px;min-width:0;flex:1}.node-copy strong{overflow:hidden;text-overflow:ellipsis;font-size:12px;line-height:1.3}
  .node-copy small{overflow:hidden;text-overflow:ellipsis;color:#7a887e;font-size:10px;white-space:nowrap}
  .node-copy .participants{color:#387864}.node-price{font-size:11px;white-space:nowrap;font-weight:750;font-variant-numeric:tabular-nums}
  .choice-node{z-index:2}.choice-summary{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-top:1px solid #edf1eb;font-size:11px;color:#6a7e70}
  .choice-summary button{border:0;background:transparent;color:#356d5b;font-weight:700;font-size:11px}
  .choice-list{max-height:260px;overflow-y:auto;padding:6px 8px 10px;display:grid;gap:5px}
  .choice-item{display:flex;align-items:start;gap:5px;padding:7px 4px;border:1px solid #edf0ec;border-radius:9px}
  .choice-item.adopted{border-color:#95cbb0;background:#f1f8f3}
  .choice-select{border:0;background:transparent;color:#387864}
  .choice-copy{display:grid;min-width:0;flex:1;gap:2px}.choice-copy strong{font-size:11px;overflow-wrap:anywhere}.choice-copy small{font-size:10px;color:#667c6b}.choice-copy .clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .choice-copy a,.external{font-size:11px;color:#356d5b}.choice-edit,.add-choice{font-size:10px;color:#356d5b;background:transparent;border:0}.add-choice{padding:9px;text-align:center}
  .graph-footer{display:flex;justify-content:space-between;margin:8px 0 12px;font-size:10px;color:#89958e}
  .graph-empty{display:grid;justify-items:center;gap:12px;padding:35px 16px;border:1px dashed #d4dfd6;border-radius:16px;color:#3c6c5b}
  .graph-empty svg{width:170px;fill:#f8faf6}.status{text-align:center;padding:32px;color:#859288}
  .detail-panel{padding:16px;border:1px solid #e0e9e0;border-radius:15px;background:white;box-shadow:0 5px 16px #1d3c2a09}
  .panel-heading{display:flex;align-items:center;justify-content:space-between}.panel-heading small{font-size:10px;color:#6d8575}.panel-heading h3{margin:4px 0;font-size:15px}
  .panel-heading>button{border:0;background:transparent;font-size:22px;color:#84948a}.panel-sub{font-size:11px;color:#61796b}.note{font-size:12px;line-height:1.6;white-space:pre-wrap}
  .panel-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.panel-actions button,.join-form button{border:1px solid #d5e1d8;border-radius:9px;padding:7px 10px;background:#f9fbf9;color:#416c5e;font-size:11px}
  .panel-actions .primary{border:0;background:#2f6657;color:white}.panel-actions .danger,.danger{color:#ae615e!important}
  .join-form{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:15px;padding-top:12px;border-top:1px solid #e8eee8}
  .join-form label{font-size:11px;color:#597165}.join-form select{flex:1;min-width:130px}.join-form select, .sheet input,.sheet textarea,.sheet select{padding:10px;border:1px solid #d4dfd7;border-radius:9px;background:#fff;color:#283b32;font:inherit;font-size:12px}
  .branches{display:grid;gap:6px;margin-top:13px}.branches>small{font-size:10px;color:#7b8b80}.branches>div{display:flex;gap:8px;align-items:center;font-size:11px}.branches span{flex:1}.branches button{border:0;background:transparent;color:#447861;font-size:11px}
  .small-action{margin-top:9px;border:0;background:transparent;color:#40755f;font-size:11px}
  .error{display:flex;gap:8px;justify-content:space-between;padding:12px;margin:12px 0;border-radius:10px;background:#fff1ed;color:#9e534a;font-size:12px}.error button{border:0;background:transparent}
  .backdrop{position:fixed;z-index:450;inset:0;display:flex;align-items:end;justify-content:center;background:#17272088}
  .sheet{width:min(560px,100%);max-height:92dvh;overflow:auto;padding:20px 22px calc(22px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0;background:white}
  .sheet-header{display:flex;justify-content:space-between;align-items:start}.sheet-header small{font-size:11px;color:#7f9185}.sheet-header h3{margin:3px 0 18px;font-size:18px}.sheet-header button{border:0;background:#f2f5f2;border-radius:50%;width:32px;height:32px;font-size:20px;color:#6c7d70}
  .sheet form{display:grid;gap:12px}.sheet label{display:grid;gap:6px;font-size:12px;color:#435c4e;font-weight:700}.sheet label small{font-weight:400;color:#91a092}
  .sheet input,.sheet textarea,.sheet select{min-width:0;width:100%;font-weight:400}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .form-actions{display:flex;justify-content:end;gap:8px;padding-top:8px}.form-actions button:not(.primary){padding:9px 13px;border:1px solid #d9e1db;border-radius:9px;background:white;color:#516759;font-size:12px}
  @media(max-width:670px){.graph-toolbar{align-items:start}.graph-title{display:block}.graph-title h2{font-size:17px}.toolbar-actions{justify-content:end}.toolbar-actions button{font-size:10px;padding:8px}.two{grid-template-columns:1fr}.sheet{padding:18px 16px calc(20px + env(safe-area-inset-bottom))}}
</style>
