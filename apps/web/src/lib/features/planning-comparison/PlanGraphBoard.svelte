<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    STEP_TYPE, type Step, type StepType, type PlanGraph, type PlanGraphNode, type PlanGraphEdge,
    type ComparisonOption,
  } from '@tabitabi/types';
  import { planGraphApi } from '$lib/api/plan-graph';
  import { getMemoText } from '$lib/memo';
  import { demoStorage } from '$lib/demo';
  import { insertCreatedStop, placeExistingStop, chronologicalLinearEdges, chronologicalBranchEdges, isReverseTimeOrder } from './graph';
  import StepTypeIcon from '$lib/themes/standard/core/icons/StepTypeIcon.svelte';
  import CandidateOptionCard from './CandidateOptionCard.svelte';
  import MobileBranchMap from './MobileBranchMap.svelte';
  import MobileComparisonGrid from './MobileComparisonGrid.svelte';

  let { itineraryId, steps, canEdit, demo = false, showGraph = false, branchRequest = null, optionRequest = null, selectRequest = null, createdStepRequest = null, localGraph = null, onSaveLocalGraph, onRequestCreate, onGraphState, onGraphError, onEditExistingStep, onOpenExistingStep, onCreateStep, onUpdateStep, onDeleteStep, onPlan }: {
    localGraph?: PlanGraph | null; onSaveLocalGraph?: (graph: PlanGraph) => void;
    itineraryId: string; steps: Step[]; canEdit: boolean; demo?: boolean; showGraph?: boolean;
    branchRequest?: { id: string; sequence: number; independent?: boolean } | null;
    optionRequest?: { id: string; sequence: number; optionId?: string; field?: 'notes' | 'url' } | null;
    selectRequest?: { id: string; sequence: number; optionId: string | null } | null;
    createdStepRequest?: { step: Step; parentId: string | null; label: string; sequence: number } | null;
    onRequestCreate?: (parentId: string | null, label: string) => void;
    onGraphState?: (state: { branched: boolean; choices: Record<string, ComparisonOption[]>; selected: Record<string, string | null> }) => void;
    onGraphError?: (message: string) => void;
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
  const colors = ['#6499be', '#b785a4', '#5b9a88', '#b0986a', '#8d8bb4', '#5e9995'];
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
  function localDate(value: string) { return value ? value.slice(5, 10).replace('-', '/') + (value.includes('T') ? ' ' + value.slice(11, 16) : '') : ''; }
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
    if (!from || !to || isReverseTimeOrder(from.start_local, to.start_local)) return false;
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
    const heights = Array.from({ length: maxRank + 1 }, () => 136);
    for (const node of sorted) {
      if (node.kind === 'choices' && expanded.includes(node.id)) {
        const rank = ranks.get(node.id)!;
        heights[rank] = Math.max(heights[rank], 176 + Math.min(300, node.options.length * 92 + 60));
      }
    }
    const rowY: number[] = [];
    let cursor = 118;
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
    const routeLabels = new Map<string, string>();
    for (const node of sorted) {
      const incoming = shownEdges.filter(edge => edge.to === node.id);
      routeLabels.set(node.id, incoming.length > 1 ? '共通' : incoming.length === 1
        ? incoming[0].label || routeLabels.get(incoming[0].from) || '' : '');
    }
    const draws: DrawNode[] = sorted.map(n => {
      return { node: n, x: 310 + ((xs.get(n.id) ?? 0) - minimum) * 330,
        y: rowY[ranks.get(n.id) ?? 0], label: routeLabels.get(n.id) ?? '',
        exit: n.kind === 'choices' ? 66 + (expanded.includes(n.id) ? Math.min(300, n.options.length * 92 + 60) : 0) : 36,
        color: !shownEdges.some(edge => edge.to === n.id) || shownEdges.filter(edge => edge.to === n.id).length > 1 ? '#64a58c' : colors[colorIds.get(n.id) ?? 0] };
    });
    const positions = new Map(draws.map(d => [d.node.id, d]));
    const links: DrawEdge[] = shownEdges.map(edge => {
      const a = positions.get(edge.from)!, b = positions.get(edge.to)!;
      const start = a.y + a.exit, end = b.y - 36;
      const delta = Math.max(18, (end - start) / 2);
      return { edge, path: 'M ' + a.x + ' ' + start + ' C ' + a.x + ' ' + (start + delta) + ', ' +
        b.x + ' ' + (end - delta) + ', ' + b.x + ' ' + end,
        color: shownEdges.filter(edge => edge.to === b.node.id).length > 1 ? a.color : b.color, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    });
    const ticks = [...new Map(draws.filter(d => d.node.start_local).map(d =>
      [d.y, { y: d.y, label: localDate(d.node.start_local) }]
    )).values()];
    return { nodes: draws, links, ticks, width: Math.max(640, 465 + maximum * 330),
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
  let metadataOnly = $state(false);
  let joinTarget = $state('');
  let moveTarget = $state('');
  type RouteGap = { from: string | null; to: string | null };
  let gapMenu = $state<RouteGap | null>(null);
  let existingGap = $state<RouteGap | null>(null);
  let existingSearch = $state('');
  let duplicateMode = $state(false);
  let undoGraph = $state<PlanGraph | null>(null);
  let pendingCreatedGap = $state<RouteGap | null>(null);
  let joinSourceId = $state<string | null>(null);
  let draggingId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);
  let routeNames = $state<Record<string, string>>({});
  let folded = $state<string[]>([]);
  let expandedChoices = $state<string[]>([]);
  let optionNodeId = $state<string | null>(null);
  let editingOptionId = $state<string | null>(null);
  let option = $state<ComparisonOption>(optionTemplate());
  let optionAmountText = $state('');
  let optionOpen = $state(false);
  let mobileHelpOpen = $state(false);
  let mobileView = $state<'compare' | 'list'>('compare');
  let recentlyCreatedIds = $state<string[]>([]);
  let failedAttachment = $state<{ step: Step; parentId: string | null; label: string } | null>(null);

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
      // A date-only Step must never appear to start at 12:00 in comparison.
      start_local: step.time_unspecified ? localInput(step.start_at).slice(0, 10) : localInput(step.start_at),
      end_local: step.time_unspecified ? '' : localInput(step.end_at),
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
      // Deleting an ordinary Step must not resurrect its old graph metadata as a ghost card.
      ...graph.nodes.filter(node => !ids.has(node.id) && recentlyCreatedIds.includes(node.id)),
    ];
  });
  $effect(() => {
    const current = new Set(steps.map(step => step.id));
    const pending = recentlyCreatedIds.filter(id => !current.has(id));
    if (pending.length !== recentlyCreatedIds.length) recentlyCreatedIds = pending;
  });
  const displayEdges = $derived.by(() => {
    const valid = new Set(displayNodes.map(node => node.id));
    const persisted = graph.edges.filter(edge => valid.has(edge.from) && valid.has(edge.to));
    const ordered = [...steps].sort((a, b) => (a.start_at ?? Infinity) - (b.start_at ?? Infinity)
      || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const allLinear = () => ordered.slice(1).map((step, i) => ({
      id: 'auto-' + i, from: ordered[i].id, to: step.id, label: '',
    }));
    const involved = new Set(persisted.flatMap(edge => [edge.from, edge.to]));
    const independent = graph.nodes.some(node =>
      node.kind === 'step' && valid.has(node.id) && !involved.has(node.id));
    // Graph metadata for a hotel or flight comparison does not split the itinerary.
    if (!persisted.length) return independent ? [] : allLinear();
    const out = new Map<string, number>(), incoming = new Map<string, number>();
    for (const edge of persisted) {
      out.set(edge.from, (out.get(edge.from) ?? 0) + 1);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
    const branched = independent || [...out.values()].some(count => count > 1)
      || [...incoming.values()].some(count => count > 1);
    if (branched) return chronologicalBranchEdges(displayNodes, persisted);
    // A normal Step created after a linear graph is already saved extends that same
    // route; it does not become a surprise independent branch.
    const unlinked = ordered.filter(step => !involved.has(step.id));
    if (unlinked.length === 0) {
      // Ordinary date changes reorder a single route without changing the
      // meaning of a real branch or a merge.
      // Undated stops keep their explicitly inserted position until a date is chosen.
      if (ordered.some(step => step.start_at == null)) return persisted;
      return chronologicalLinearEdges(ordered.map(step => step.id), persisted, i => 'auto-sorted-' + i) ?? persisted;
    }
    const ends = [...involved].filter(id => !out.has(id));
    if (ends.length !== 1) return persisted;
    let tail = ends[0];
    const additions: PlanGraphEdge[] = [];
    for (const step of unlinked) {
      additions.push({ id: 'auto-extend-' + additions.length, from: tail, to: step.id, label: '' });
      tail = step.id;
    }
    return [...persisted, ...additions];
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
  const selected = $derived(displayNodes.find(n => n.id === selectedId) ?? null);
  const routeStarts = $derived(displayEdges.filter(edge => edge.label || displayEdges.filter(other => other.from === edge.from).length > 1));
  const candidateNodes = $derived(displayNodes.filter(node => node.options.length));
  const moveTargets = $derived(selected ? displayNodes.flatMap(node =>
    (['before', 'after'] as const).flatMap(side => {
      try {
        const gap = placementGap(node.id, side);
        placeExistingStop(displayNodes, displayEdges, selected.id, gap.from, gap.to, () => crypto.randomUUID());
        return [{ node, side }];
      } catch { return []; }
    }),
  ) : []);
  const drawn = $derived(layout(displayNodes, displayEdges, folded, expandedChoices));
  const chronologyConflicts = $derived.by(() => {
    const byId = new Map(displayNodes.map(node => [node.id, node]));
    return displayEdges.filter(edge => {
      const from = byId.get(edge.from)?.start_local ?? '';
      const to = byId.get(edge.to)?.start_local ?? '';
      return isReverseTimeOrder(from, to);
    });
  });
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
  let handledCreatedRequest = -1;
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
    if (node) void openOption(node, request.optionId ? node.options.find(value => value.id === request.optionId) : undefined, request.field);
  });
  $effect(() => {
    const request = selectRequest;
    if (loading || !request || handledSelectRequest === request.sequence) return;
    handledSelectRequest = request.sequence;
    const node = displayNodes.find(value => value.id === request.id);
    if (node) void selectOption(node, request.optionId);
  });

  $effect(() => {
    const request = createdStepRequest;
    if (loading || !request || handledCreatedRequest === request.sequence) return;
    handledCreatedRequest = request.sequence;
    void attachCreatedStep(request);
  });
  async function attachCreatedStep(request: { step: Step; parentId: string | null; label: string }) {
    if (!canEdit) return;
    const node = fromStep(request.step);
    // The Step may arrive before the parent refreshes its steps prop.
    if (!recentlyCreatedIds.includes(node.id)) recentlyCreatedIds = [...recentlyCreatedIds, node.id];
    const nodes = graph.nodes.some(item => item.id === node.id)
      ? graph.nodes : [...graph.nodes, node];
    const currentEdges = displayEdges.filter(edge => edge.to !== node.id && edge.from !== node.id);
    let edges: PlanGraphEdge[];
    try {
      if (pendingCreatedGap && pendingCreatedGap.from === request.parentId) {
        edges = insertCreatedStop([...displayNodes, node], currentEdges, node.id,
          pendingCreatedGap.from, pendingCreatedGap.to, () => crypto.randomUUID());
      } else {
        edges = [...currentEdges];
        if (request.parentId) {
          if (request.parentId === node.id) return;
          edges.push({ id: crypto.randomUUID(), from: request.parentId, to: node.id, label: request.label });
        }
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '予定を挿入できませんでした。';
      failedAttachment = request;
      return;
    }
    pendingCreatedGap = null;
    // Saving a new Step may finish after the user has clicked another route.
    // Never steal that newer selection when the network response arrives.
    const selectionAtSaveStart = selectedId;
    const success = await save(nodes, edges, false);
    if (success) {
      failedAttachment = null;
      if (selectedId === selectionAtSaveStart) selectedId = null;
      folded = [];
    } else {
      failedAttachment = request;
    }
  }

  async function retryAttachment() {
    const request = failedAttachment;
    if (!request || busy) return;
    if (!demo && !onSaveLocalGraph) await load();
    if (failedAttachment === request) await attachCreatedStep(request);
  }

  async function load() {
    if (onSaveLocalGraph || demo) { graph = localGraph ?? (demo ? demoStorage.getPlanGraph() : null) ?? emptyGraph(); loading = false; return; }
    loading = true;
    try { graph = await planGraphApi.get(itineraryId); error = ''; }
    catch { error = 'タイムラインを読み込めませんでした。'; }
    finally { loading = false; }
  }
  onMount(() => { void load(); });

  async function save(nodes: PlanGraphNode[], edges: PlanGraphEdge[], recordUndo = true) {
    if (!canEdit || busy) return false;
    const previous = JSON.parse(JSON.stringify(graph)) as PlanGraph;
    busy = true; error = ''; onGraphError?.('');
    try {
      // The persisted DAG needs every endpoint, including ordinary Steps that
      // existed before the first branch was created.
      const normalizedNodes = nodes.filter(node =>
        displayNodes.some(current => current.id === node.id) || recentlyCreatedIds.includes(node.id)).map(node => {
        const current = displayNodes.find(value => value.id === node.id);
        return current ? { ...node, title: current.title, type: current.type, start_local: current.start_local, end_local: current.end_local } : node;
      });
      const included = new Set(normalizedNodes.map(node => node.id));
      for (const edge of edges) {
        for (const id of [edge.from, edge.to]) {
          if (included.has(id)) continue;
          const source = displayNodes.find(node => node.id === id) ??
            nodes.find(node => node.id === id && recentlyCreatedIds.includes(id));
          if (!source) throw new Error('接続先の予定が見つかりません。再読み込みしてください。');
          normalizedNodes.push(source);
          included.add(id);
        }
      }
      graph = demo || onSaveLocalGraph
        ? { ...graph, nodes: normalizedNodes, edges, revision: graph.revision + 1, updated_at: new Date().toISOString() }
        : await planGraphApi.save(itineraryId, { nodes: normalizedNodes, edges, revision: graph.revision });
      if (demo) demoStorage.setPlanGraph(graph);
      onSaveLocalGraph?.(graph);
      undoGraph = recordUndo ? previous : null;
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '変更を保存できませんでした。';
      onGraphError?.(error);
      return false;
    } finally { busy = false; }
  }

  async function undoLast() {
    if (!undoGraph || busy) return;
    const before = undoGraph;
    if (await save(before.nodes, before.edges, false)) {
      folded = [];
      selectedId = null;
    }
  }
  function newStep(source: string | null = null, asChoice = false, label = '', insertBefore: string | null = null) {
    if (!canEdit) return;
    pendingCreatedGap = insertBefore ? { from: source, to: insertBefore } : null;
    if (!asChoice && onRequestCreate) {
      const named = label === '別プラン'
        ? 'プラン' + (2 + displayEdges.filter(edge => edge.from === source && edge.label.trim()).length)
        : label;
      onRequestCreate(source, named);
      return;
    }
    metadataOnly = false;
    editingId = null; parentId = source; branchLabel = label;
    draft = nodeTemplate(asChoice ? 'choices' : 'step', crypto.randomUUID());
    if (source) {
      const parent = displayNodes.find(n => n.id === source);
      if (parent) { draft.start_local = parent.end_local || parent.start_local; draft.participants = [...parent.participants]; }
    }
    if (asChoice) draft.title = '移動・宿泊の候補';
    amountText = ''; participantsText = draft.participants.join('、'); formOpen = true;
  }
  function editStep(node: PlanGraphNode, metadata = false) {
    metadataOnly = metadata;
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
      if (metadataOnly) {
        // Keep the common Step, its day-only precision and rich memo untouched.
      } else if (editingId && steps.some(step => step.id === editingId)) {
        await onUpdateStep(editingId, fields);
      } else if (!editingId) {
        const created = await onCreateStep(fields);
        if (created?.id) {
          actualId = created.id;
          recentlyCreatedIds = [...recentlyCreatedIds, actualId];
        }
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '予定の保存に失敗しました。';
      return;
    } finally { busy = false; }
    const stored = { ...next, id: actualId };
    const nodes = graph.nodes.some(n => n.id === actualId)
      ? graph.nodes.map(n => n.id === actualId ? stored : n) : [...graph.nodes, stored];
    let edges: PlanGraphEdge[];
    try {
      if (!editingId && pendingCreatedGap) {
        edges = insertCreatedStop([...displayNodes, stored], displayEdges, actualId,
          pendingCreatedGap.from, pendingCreatedGap.to, () => crypto.randomUUID());
      } else {
        edges = parentId ? [...displayEdges, {
          id: crypto.randomUUID(), from: parentId, to: actualId, label: branchLabel,
        }] : [...displayEdges];
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '予定を挿入できませんでした。';
      return;
    }
    if (await save(nodes, edges, metadataOnly)) { pendingCreatedGap = null; formOpen = false; selectedId = actualId; }
  }
  function placementGap(anchor: string, side: 'before' | 'after'): RouteGap {
    const matching = displayEdges.filter(edge => side === 'before' ? edge.to === anchor : edge.from === anchor);
    if (matching.length > 1) throw new Error('分岐先・合流元の接続を選んでください。');
    return side === 'before'
      ? { from: matching[0]?.from ?? null, to: anchor }
      : { from: anchor, to: matching[0]?.to ?? null };
  }
  function openGap(from: string | null, to: string | null) {
    if (!canEdit) return;
    gapMenu = { from, to };
    joinSourceId = null;
  }
  function insertFromGap() {
    if (!gapMenu) return;
    const { from, to } = gapMenu;
    gapMenu = null;
    newStep(from, false, '', to);
  }
  function duplicateFromGap(id: string) {
    if (!existingGap || !canEdit) return;
    const source = displayNodes.find(node => node.id === id);
    if (!source) return;
    const options = source.options.map(candidate => ({ ...candidate, id: crypto.randomUUID() }));
    const chosenIndex = source.options.findIndex(candidate => candidate.id === source.selected_option_id);
    draft = {
      ...source, id: crypto.randomUUID(), title: source.title + '（コピー）',
      participants: [...source.participants], options,
      selected_option_id: chosenIndex < 0 ? null : options[chosenIndex].id,
    };
    pendingCreatedGap = existingGap;
    parentId = existingGap.from;
    editingId = null;
    metadataOnly = false;
    branchLabel = '';
    amountText = source.amount == null ? '' : String(source.amount);
    participantsText = source.participants.join('、');
    existingGap = null;
    duplicateMode = false;
    formOpen = true;
  }
  async function insertExisting(id: string) {
    if (!existingGap || busy) return;
    try {
      const edges = placeExistingStop(displayNodes, displayEdges, id, existingGap.from,
        existingGap.to, () => crypto.randomUUID());
      if (await save(graph.nodes, edges)) { existingGap = null; existingSearch = ''; selectedId = id; folded = []; }
    } catch (cause) { error = cause instanceof Error ? cause.message : '既存予定を挿入できませんでした。'; }
  }
  async function dropOn(target: PlanGraphNode, event: DragEvent) {
    event.preventDefault();
    const movedId = draggingId;
    draggingId = null;
    dragOverId = null;
    if (!movedId || movedId === target.id || busy) return;
    const element = event.currentTarget;
    if (!(element instanceof HTMLElement)) return;
    const bounds = element.getBoundingClientRect();
    const side: 'before' | 'after' = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    try {
      const gap = placementGap(target.id, side);
      const edges = placeExistingStop(displayNodes, displayEdges, movedId, gap.from, gap.to,
        () => crypto.randomUUID());
      if (await save(graph.nodes, edges)) selectedId = movedId;
    } catch (cause) { error = cause instanceof Error ? cause.message : '予定を移動できませんでした。'; }
  }
  async function chooseNode(node: PlanGraphNode) {
    if (joinSourceId) {
      if (!canLink(joinSourceId, node.id, displayNodes, displayEdges)) return;
      if (await save(graph.nodes, [...displayEdges, {
        id: crypto.randomUUID(), from: joinSourceId, to: node.id, label: '',
      }])) { joinSourceId = null; selectedId = null; }
      return;
    }
    selectedId = selectedId === node.id ? null : node.id;
    moveTarget = ''; joinTarget = '';
  }
  async function moveSelected() {
    if (!selected || !moveTarget || busy) return;
    try {
      const [side, anchor] = moveTarget.split('|');
      if (side !== 'before' && side !== 'after') return;
      const gap = placementGap(anchor, side);
      const edges = placeExistingStop(displayNodes, displayEdges, selected.id,
        gap.from, gap.to, () => crypto.randomUUID());
      if (await save(graph.nodes, edges)) { moveTarget = ''; folded = []; }
    } catch (cause) { error = cause instanceof Error ? cause.message : '移動できませんでした。'; }
  }
  async function renameRoute(edge: PlanGraphEdge) {
    const label = (routeNames[edge.id] ?? edge.label).trim();
    if (!label) return;
    await save(graph.nodes, displayEdges.map(item => item.id === edge.id ? { ...item, label } : item));
  }
  async function applyOption(node: PlanGraphNode) {
    const candidate = node.options.find(value => value.id === node.selected_option_id);
    if (!candidate || !onUpdateStep || busy) return;
    const start = candidate.start_local ? new Date(candidate.start_local).getTime() : undefined;
    const end = candidate.end_local ? new Date(candidate.end_local).getTime() : start;
    const dates = { ...node, start_local: candidate.start_local || node.start_local, end_local: candidate.end_local || candidate.start_local || node.end_local };
    if (displayEdges.some(edge => {
      const a = edge.from === node.id ? dates : displayNodes.find(n => n.id === edge.from);
      const b = edge.to === node.id ? dates : displayNodes.find(n => n.id === edge.to);
      return a && b && isReverseTimeOrder(a.start_local, b.start_local);
    })) { error = '前後の予定と時刻が前後します。日時を編集してから反映してください。'; return; }
    busy = true; error = '';
    try { await onUpdateStep(node.id, { title: candidate.title,
      ...(start === undefined ? {} : { start_at: start, end_at: end, time_unspecified: !candidate.start_local.includes('T') }),
      ...(candidate.to ? { location: candidate.to } : {}),
    }); } catch (cause) { error = cause instanceof Error ? cause.message : '反映できませんでした。'; }
    finally { busy = false; }
  }
  async function removeNode(node: PlanGraphNode) {
    if (!confirm('「' + node.title + '」を削除しますか？ 接続も解除されます。')) return;
    if (steps.some(step => step.id === node.id) && onDeleteStep) {
      try { await onDeleteStep(node.id); }
      catch (cause) { error = cause instanceof Error ? cause.message : '予定を削除できませんでした。'; return; }
    }
    if (await save(graph.nodes.filter(n => n.id !== node.id), displayEdges.filter(e => e.from !== node.id && e.to !== node.id), false)) selectedId = null;
  }
  async function join() {
    if (!selected || !canLink(selected.id, joinTarget, displayNodes, displayEdges)) return;
    if (await save(graph.nodes, [...displayEdges, { id: crypto.randomUUID(), from: selected.id, to: joinTarget, label: '' }])) joinTarget = '';
  }
  async function unlink(edge: PlanGraphEdge) {
    if (!confirm('この接続を外しますか？')) return;
    await save(graph.nodes, displayEdges.filter(e => e.id !== edge.id));
  }
  async function openOption(node: PlanGraphNode, current?: ComparisonOption, focusField?: 'notes' | 'url') {
    if (!canEdit) return;
    optionNodeId = node.id; editingOptionId = current?.id ?? null;
    option = current ? { ...current } : optionTemplate(crypto.randomUUID());
    optionAmountText = current?.amount == null ? '' : String(current.amount);
    optionOpen = true; error = '';
    if (focusField) {
      await tick();
      const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[data-candidate-field="' + focusField + '"]',
      );
      field?.focus();
    }
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
  function routeSummary(id: string) {
    const visited = new Set<string>(), stack = [id];
    const amounts = new Map<string, number>();
    const participants = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current) || displayEdges.filter(edge => edge.to === current).length > 1) continue;
      visited.add(current);
      const node = displayNodes.find(node => node.id === current);
      if (!node) continue;
      node.participants.forEach(name => participants.add(name));
      const picked = node.options.find(candidate => candidate.id === node.selected_option_id);
      const amount = node.amount ?? picked?.amount;
      if (amount != null) {
        const currency = node.amount !== null ? node.currency : picked!.currency;
        amounts.set(currency, (amounts.get(currency) ?? 0) + amount);
      }
      stack.push(...displayEdges.filter(edge => edge.from === current).map(edge => edge.to));
    }
    return { cost: [...amounts].map(([currency, amount]) => cost(amount, currency)).join(' + '), participants: [...participants].join('・') };
  }
  function focusDialog(element: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    (element.querySelector<HTMLInputElement>('input') ?? element.querySelector<HTMLButtonElement>('button'))?.focus();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        formOpen = false; optionOpen = false; gapMenu = null; existingGap = null;
        event.preventDefault();
      }
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    };
    element.addEventListener('keydown', onKeydown);
    return { destroy() { element.removeEventListener('keydown', onKeydown); previous?.focus(); } };
  }
  function hideEdge(id: string) { folded = folded.includes(id) ? folded.filter(value => value !== id) : [...folded, id]; }
</script>

{#if showGraph}
<section class="graph-board" aria-label="分岐・合流プラン">
  <div class="graph-toolbar">
    <div class="graph-title"><h2>プラン比較</h2><span>{displayNodes.length}件</span></div>
    <div class="toolbar-actions">
      {#if canEdit && undoGraph}
        <button class="outline" disabled={busy} onclick={undoLast}>↶ 元に戻す</button>
      {/if}
      {#if canEdit && displayNodes.length > 0}
        <button class="outline new-plan-button" onclick={() => newStep()}>＋ 新しいプラン</button>
      {/if}
    </div>
  </div>
  {#if !demo}<a class="demo-link" href="/demo/planning-comparison" target="_blank" rel="noopener noreferrer">デモを見る ↗</a>{/if}
  {#if error}<div class="error" role="alert">{error}<button onclick={load}>再読込</button></div>{/if}
  {#if failedAttachment}
    <div class="attachment-warning" role="alert">
      <span>「{failedAttachment.step.title}」は保存済みですが、ルートへの接続が未完了です。</span>
      <button disabled={busy || loading} onclick={() => void retryAttachment()}>接続を再試行</button>
    </div>
  {/if}
  {#if chronologyConflicts.length}
    <div class="chronology-warning" role="status">
      <span>接続した予定の日時が前後しています（{chronologyConflicts.length}か所）</span>
      <button onclick={() => { selectedId = chronologyConflicts[0].to; }}>該当予定を確認</button>
    </div>
  {/if}
  {#if loading}<p class="status">読み込み中…</p>
  {:else if displayNodes.length === 0}
    <div class="graph-empty">
      <svg viewBox="0 0 220 120" aria-hidden="true"><path d="M110 12V38 M110 38C110 55 55 42 55 70V94 M110 38C110 55 165 42 165 70V94" stroke="#73a490" stroke-width="3" fill="none"/><circle cx="110" cy="12" r="8"/><circle cx="55" cy="94" r="8"/><circle cx="165" cy="94" r="8"/></svg>
      <strong>最初の予定を追加</strong>
      {#if canEdit}<button class="primary" onclick={() => newStep()}>＋ 予定を追加</button>{/if}
    </div>
  {:else}
    {#if isBranched}
      <div class="mobile-view-toggle" role="group" aria-label="モバイルのプラン比較表示">
        <button aria-pressed={mobileView === 'compare'} onclick={() => mobileView = 'compare'}>並べて比較</button>
        <button aria-pressed={mobileView === 'list'} onclick={() => mobileView = 'list'}>縦一覧</button>
      </div>
    {/if}
    <div class="comparison-workspace"><div class="timeline-column">
      {#if isBranched && mobileView === 'compare'}
        <MobileComparisonGrid nodes={drawn.nodes} edges={displayEdges.filter(edge => !folded.includes(edge.id))}
          {canEdit} {selectedId}
          onSelect={id => { const node = displayNodes.find(value => value.id === id); if (node) void chooseNode(node); }}
          onInsert={(from, to) => openGap(from, to)} />
      {/if}
      <div class:mobile-list-hidden={isBranched && mobileView === 'compare'}>
        <MobileBranchMap nodes={displayNodes} edges={displayEdges} onSelect={id => { selectedId = id; moveTarget = ''; joinTarget = ''; }} />
      </div>
      <div class="graph-scroll" class:single={!isBranched} class:mobile-list-hidden={isBranched && mobileView === 'compare'}
        role="region" aria-label="分岐したプランの予定一覧">
      {#if joinSourceId}
        <div class="join-banner" role="status">
          <strong>合流先の予定を選択</strong>
          <button onclick={() => joinSourceId = null}>キャンセル</button>
        </div>
      {/if}
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
        {#if canEdit}
          {#each drawn.nodes.filter(item => !displayEdges.some(edge => edge.to === item.node.id)) as root (root.node.id)}
            <button class="graph-gap graph-gap-root" style:left={root.x + 'px'} style:top={(root.y - 80) + 'px'}
              aria-label={root.node.title + 'の前に予定を追加'} onclick={() => openGap(null, root.node.id)}>＋ 追加</button>
          {/each}
          {#each drawn.links as link (link.edge.id)}
            <button class="graph-gap graph-gap-edge" style:left={link.x + 'px'} style:top={link.y + 'px'}
              aria-label={(displayNodes.find(node => node.id === link.edge.to)?.title ?? '次の予定') + 'の前に予定を追加'}
              onclick={() => openGap(link.edge.from, link.edge.to)}>＋</button>
          {/each}
        {/if}
        {#each drawn.ticks as tick}
          <div class="time-tick" style:top={(tick.y - 8) + 'px'}>{tick.label}</div>
        {/each}
        {#each drawn.nodes as item, index (item.node.id)}
          {@const node = item.node}
          {@const picked = node.options.find(candidate => candidate.id === node.selected_option_id)}
          <div class="graph-node" class:is-selected={selectedId === node.id} class:choice-node={node.kind === 'choices'} class:is-drag-over={dragOverId === node.id}
            style:left={(item.x - 155) + 'px'} style:top={(item.y - 36) + 'px'} style:--lane-color={item.color}>
            {#if canEdit && !displayEdges.some(edge => edge.to === node.id)}
              <button class="mobile-root-gap" aria-label={node.title + 'の前に予定を追加'}
                onclick={() => openGap(null, node.id)}>＋ 予定を追加</button>
            {/if}
            {#if index === 0 || node.start_local.slice(0, 10) !== drawn.nodes[index - 1].node.start_local.slice(0, 10)}
              <span class="mobile-date">{node.start_local ? node.start_local.slice(0, 10).replaceAll('-', '/') : '日時未定'}</span>
            {/if}
            {#if item.label}<span class="lane-caption">{item.label}</span>
            {:else if displayEdges.filter(edge => edge.to === node.id).length > 1 || displayEdges.filter(edge => edge.from === node.id).length > 1}
              <span class="mobile-common lane-caption">共通の予定</span>
            {/if}
            {#if displayEdges.filter(edge => edge.from === node.id).length > 1}
              <span class="mobile-route-event">分岐</span>
            {:else if displayEdges.filter(edge => edge.to === node.id).length > 1}
              <span class="mobile-route-event">合流</span>
            {/if}
            <button class="node-main" draggable={canEdit && !joinSourceId}
              ondragstart={event => { draggingId = node.id; event.dataTransfer?.setData('text/plain', node.id); }}
              ondragover={event => { if (draggingId && draggingId !== node.id) { event.preventDefault(); dragOverId = node.id; } }}
              ondragleave={() => { if (dragOverId === node.id) dragOverId = null; }}
              ondragend={() => { draggingId = null; dragOverId = null; }}
              ondrop={event => void dropOn(node, event)}
              onclick={() => void chooseNode(node)} aria-pressed={selectedId === node.id} aria-label={joinSourceId ? node.title + 'に合流' : node.title + 'の予定を開く'}>
              {#if canEdit}<span class="drag-grip" aria-hidden="true">⋮⋮</span>{/if}<span class="node-mark"><StepTypeIcon type={node.type} size="sm" /></span>
              <span class="node-copy"><strong>{node.title}</strong><small>{localDate(node.start_local) || '日時未定'}{steps.find(step => step.id === node.id)?.time_unspecified ? ' · 時刻未定' : node.end_local.includes('T') ? ' – ' + node.end_local.slice(11, 16) : ''}</small>
                {#if node.location}<small>{node.location}</small>{/if}
                {#if node.participants.length}<small class="participants">{node.participants.join('・')}</small>{/if}
                {#if node.notes || node.link}<small class="node-extras">{node.notes ? 'メモ' : ''}{node.notes && node.link ? ' · ' : ''}{node.link ? 'リンク' : ''}</small>{/if}
              </span>
              {#if node.amount !== null || picked?.amount != null}<span class="node-price">{cost(node.amount ?? picked?.amount ?? null, node.amount !== null ? node.currency : picked?.currency)}</span>{/if}
            </button>
            {#if node.kind === 'choices'}
              <div class="choice-summary"><span>{node.options.length}案 · {node.selected_option_id ? '選択済み' : '検討中'}</span>
                <button onclick={() => expandedChoices = expandedChoices.includes(node.id) ? expandedChoices.filter(id => id !== node.id) : [...expandedChoices, node.id]}>
                  {expandedChoices.includes(node.id) ? '閉じる' : '比較する'} <span aria-hidden="true">⌄</span>
                </button>
              </div>
              {#if expandedChoices.includes(node.id)}
                <div class="choice-list">
                  {#each node.options as candidate (candidate.id)}
                    <CandidateOptionCard option={candidate}
                      selected={node.selected_option_id === candidate.id}
                      {canEdit} {busy} compact
                      onSelect={() => selectOption(node, node.selected_option_id === candidate.id ? null : candidate.id)}
                      onEdit={(field) => { void openOption(node, candidate, field); }}
                    />
                  {/each}
                  {#if canEdit && node.options.length < 30}<button class="add-choice" onclick={() => openOption(node)}>＋ 候補を追加</button>{/if}
                </div>
              {/if}
            {/if}
            {#if canEdit}
              {#each displayEdges.filter(edge => edge.from === node.id) as edge (edge.id)}
                <button class="mobile-gap" onclick={() => openGap(node.id, edge.to)}
                  aria-label={(displayNodes.find(value => value.id === edge.to)?.title ?? '次の予定') + 'の前に予定を追加'}>＋ 予定を追加</button>
              {/each}
            {/if}
            {#if canEdit && !displayEdges.some(edge => edge.from === node.id)}
              <div class="route-end">
                <div class="route-buttons">
                  <button class="continue-route" aria-label={node.title + 'の次の予定を追加'}
                    onclick={() => newStep(node.id)}>
                    <span class="route-plus" aria-hidden="true">＋</span>
                    <span>次の予定</span>
                  </button>
                  <button class="route-more" aria-label={node.title + 'の後に予定を追加・接続'}
                    onclick={() => openGap(node.id, null)}>⋯</button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    {#if isBranched}<div class="graph-footer" class:mobile-list-hidden={mobileView === 'compare'}><span>{drawn.count}件を表示</span></div>{/if}
    </div>
    <aside class="comparison-sidebar" aria-label="プランと候補">
    {#if selected}
      <button class="mobile-detail-overlay" aria-label="予定の詳細を閉じる" onclick={() => selectedId = null}></button>
      <div class="detail-panel" role="region" aria-label="選択した予定の操作">
        <div class="panel-heading"><div><small>{typeLabel(selected.type)}</small><h3>{selected.title}</h3></div><button aria-label="閉じる" onclick={() => selectedId = null}>×</button></div>
        {#if selected.start_local || selected.end_local}<p class="panel-sub">{localDate(selected.start_local)}{selected.end_local ? ' ― ' + localDate(selected.end_local) : ''}</p>{/if}
        {#if selected.notes}<p class="note">{selected.notes}</p>{/if}
        {#if selected.link}<a class="external" href={selected.link} target="_blank" rel="noopener noreferrer">参考リンク</a>{/if}
        <div class="panel-actions">
          {#if canEdit}
            <button class="primary" onclick={() => {
              const out = displayEdges.filter(edge => edge.from === selected!.id);
              if (out.length > 1) { error = '挿入する分岐先の＋ボタンを選んでください。'; return; }
              openGap(selected!.id, out[0]?.to ?? null);
            }}>＋ この後に追加</button>
            <button onclick={() => {
              const incoming = displayEdges.filter(edge => edge.to === selected!.id);
              if (incoming.length > 1) { error = '合流前の接続を選んでください。'; return; }
              openGap(incoming[0]?.from ?? null, selected!.id);
            }}>＋ この前に追加</button>
            <button onclick={() => newStep(selected!.id, false, '別プラン')}>↗ ここから分岐</button>
            <button onclick={() => { joinSourceId = selected!.id; selectedId = null; }}>↘ 既存予定に合流</button>
            <button onclick={() => openOption(selected!)}>◇ 候補を追加</button>
            <button onclick={() => {
              if (steps.some(step => step.id === selected!.id) && onEditExistingStep) onEditExistingStep(selected!.id);
              else editStep(selected!);
            }}>編集</button>
            {#if steps.some(step => step.id === selected!.id) && onOpenExistingStep}
              <button onclick={() => onOpenExistingStep?.(selected!.id)}>詳細</button>
            {/if}
            {#if selected.kind === 'choices' && selected.selected_option_id}
              <button disabled={busy} onclick={() => applyOption(selected!)}>選択案をこの予定に反映</button>
            {/if}
            <button disabled={busy} onclick={() => editStep(selected!, true)}>参加者・参考金額</button>
            <button class="danger" disabled={busy} onclick={() => removeNode(selected!)}>削除</button>
          {/if}
        </div>
        {#if selected.kind === 'choices' && canEdit && selected.options.length < 30}
          <button class="small-action" onclick={() => openOption(selected!)}>＋ 候補を追加</button>
        {/if}
        {#if canEdit && moveTargets.length}
          <div class="join-form"><label for="move-target">別プランへ移動</label>
            <select id="move-target" bind:value={moveTarget}><option value="">移動先の予定と位置を選択</option>
              {#each moveTargets as target}<option value={target.side + '|' + target.node.id}>{target.node.title} の{target.side === 'before' ? '前' : '後'}</option>{/each}
            </select><button disabled={!moveTarget || busy} onclick={moveSelected}>移動する</button>
            
          </div>
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
      <section class="sidebar-card"><h3>プラン</h3>
        {#each routeStarts as edge, index (edge.id)}
          {@const summary = routeSummary(edge.to)}
          <div class="route-summary" style:--route-color={colors[index % colors.length]}>
            <span class="route-dot"></span>
            {#if canEdit}<form onsubmit={event => { event.preventDefault(); void renameRoute(edge); }}>
              <input aria-label={'ルート名：' + (edge.label || 'プラン ' + (index + 1))} maxlength="80" value={routeNames[edge.id] ?? edge.label} placeholder={'プラン ' + (index + 1)} oninput={event => routeNames[edge.id] = event.currentTarget.value} />
              <button disabled={busy} aria-label="ルート名を保存">保存</button>
            </form>{:else}<strong>{edge.label || 'プラン ' + (index + 1)}</strong>{/if}
            <button aria-label={(folded.includes(edge.id) ? '表示：' : '非表示：') + edge.label} aria-pressed={!folded.includes(edge.id)} onclick={() => hideEdge(edge.id)}>{folded.includes(edge.id) ? '表示' : '隠す'}</button>
          </div>
          {#if summary.cost || summary.participants}<small class="route-meta">{summary.participants}{summary.participants && summary.cost ? ' · ' : ''}{summary.cost ? '入力済み ' + summary.cost : ''}</small>{/if}
        {/each}
        
        {#if routeStarts.length === 0}<small>共通の予定</small>{/if}
        {#if canEdit}<button class="sidebar-add" onclick={() => newStep()}>＋ 別の出発点を作る</button>{/if}
      </section>
      {#if candidateNodes.length > 0}<section class="sidebar-card"><h3>候補 <span>{candidateNodes.reduce((sum, node) => sum + node.options.length, 0)}</span></h3>
        {#each candidateNodes as node (node.id)}
          <details open><summary><span>{node.title}</span><small>{node.options.length}案</small></summary>
            {#each node.options as candidate (candidate.id)}
              <div class="sidebar-candidate">
                <CandidateOptionCard option={candidate}
                  selected={node.selected_option_id === candidate.id}
                  {canEdit} {busy} compact
                  onSelect={() => selectOption(node, node.selected_option_id === candidate.id ? null : candidate.id)}
                  onEdit={(field) => { void openOption(node, candidate, field); }}
                />
              </div>
            {/each}
            {#if canEdit}<button class="sidebar-add" disabled={busy || node.options.length >= 30} onclick={() => openOption(node)}>＋ 候補を追加</button>
              {#if node.selected_option_id}<button class="sidebar-add apply" disabled={busy} onclick={() => applyOption(node)}>選択案をこの予定に反映</button>{/if}
            {/if}
          </details>
        {/each}
      </section>{/if}
    </aside></div>

  {/if}
</section>
{/if}


{#if gapMenu && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && (gapMenu = null)}>
    <div class="sheet route-action-sheet" role="dialog" aria-modal="true" aria-label="予定を追加・接続" use:focusDialog>
      <div class="sheet-header"><h3>予定を追加・接続</h3><button aria-label="閉じる" onclick={() => gapMenu = null}>×</button></div>
      <div class="gap-actions">
        <button class="gap-primary" onclick={insertFromGap}>＋ 新しい予定を作成</button>
        <button onclick={() => { existingGap = gapMenu; gapMenu = null; existingSearch = ''; duplicateMode = false; }}>▤ 既存の予定を挿入</button>
        <button onclick={() => { existingGap = gapMenu; gapMenu = null; existingSearch = ''; duplicateMode = true; }}>⧉ 既存の予定を複製</button>
        {#if gapMenu.from}
          <button onclick={() => { const from = gapMenu!.from; gapMenu = null; newStep(from, false, '別プラン'); }}>⑂ ここから分岐</button>
          <button onclick={() => { joinSourceId = gapMenu!.from; gapMenu = null; }}>↘ 既存予定に合流</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
{#if existingGap && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && (existingGap = null)}>
    <div class="sheet route-action-sheet" role="dialog" aria-modal="true" aria-label={duplicateMode ? '既存の予定を複製' : '既存の予定を挿入'} use:focusDialog>
      <div class="sheet-header"><h3>{duplicateMode ? '既存の予定を複製' : '既存の予定を挿入'}</h3><button aria-label="閉じる" onclick={() => existingGap = null}>×</button></div>
      <label class="existing-search">予定を検索<input type="search" placeholder="タイトル・場所" bind:value={existingSearch} /></label>
      <div class="existing-options">
        {#each displayNodes.filter(node => {
          if (node.id === existingGap?.from || node.id === existingGap?.to) return false;
          if (existingSearch && !(node.title + ' ' + node.location).toLocaleLowerCase().includes(existingSearch.toLocaleLowerCase())) return false;
          if (duplicateMode) return true;
          try {
            placeExistingStop(displayNodes, displayEdges, node.id, existingGap!.from, existingGap!.to, () => crypto.randomUUID());
            return true;
          } catch { return false; }
        }) as item (item.id)}
          <button onclick={() => duplicateMode ? duplicateFromGap(item.id) : void insertExisting(item.id)} disabled={busy}>
            <strong>{item.title}</strong><small>{localDate(item.start_local) || '日時未定'}</small>
          </button>
        {:else}
          <p class="existing-empty">挿入できる予定がありません</p>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if formOpen && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && !busy && (formOpen = false)}>
    <div class="sheet" use:focusDialog role="dialog" aria-modal="true" aria-label="分岐プランの予定">
      <div class="sheet-header"><div><small>{draft.kind === 'choices' ? '候補を比較' : '分岐プラン'}</small><h3>{editingId ? '予定を編集' : '予定を追加'}</h3></div>
        <button aria-label="閉じる" onclick={() => formOpen = false}>×</button></div>
      <form onsubmit={submitStep}>
        {#if error}<p class="form-error" role="alert">{error}</p>{/if}
        {#if !metadataOnly}<label>タイトル<input bind:value={draft.title} maxlength="140" required placeholder="例：京都へ移動" /></label>
        <label>種類<select bind:value={draft.type}>{#each types as t}<option value={t.value}>{t.label}</option>{/each}</select></label>
        {#if parentId}<label>ルート名 <small>任意</small><input bind:value={branchLabel} maxlength="80" placeholder="例：プラン B" /></label>{/if}
        <div class="two"><label>開始（現地時刻）<input type="datetime-local" bind:value={draft.start_local} /></label>
          <label>終了（現地時刻）<input type="datetime-local" bind:value={draft.end_local} /></label></div>
        <label>場所<input bind:value={draft.location} maxlength="250" placeholder="任意" /></label>
        {/if}
        <div class="two"><label>参考金額<input type="text" inputmode="numeric" pattern="[0-9]*" bind:value={amountText} placeholder="未入力" /></label>
          <label>通貨<select bind:value={draft.currency}>{#each currencies as currency}<option value={currency}>{currency}</option>{/each}</select></label></div>
        <label>参加者 <small>「、」区切り</small><input bind:value={participantsText} placeholder="例：Aさん、Bさん" /></label>
        {#if !metadataOnly}<label>メモ<textarea bind:value={draft.notes} maxlength="2000" rows="3" placeholder="検討中のことなど"></textarea></label>
        <label>リンク<input type="url" bind:value={draft.link} maxlength="2048" placeholder="https://" /></label>
        {/if}<div class="form-actions"><button type="button" onclick={() => formOpen = false}>キャンセル</button><button class="primary" disabled={busy || !draft.title.trim()}>保存</button></div>
      </form>
    </div>
  </div>
{/if}

{#if optionOpen && optionNode && canEdit}
  <div class="backdrop" role="presentation" onclick={event => event.target === event.currentTarget && !busy && (optionOpen = false)}>
    <div class="sheet" use:focusDialog role="dialog" aria-modal="true" aria-label="候補の編集">
      <div class="sheet-header"><div><small>{optionNode.title}</small><h3>候補{editingOptionId ? 'を編集' : 'を追加'}</h3></div><button onclick={() => optionOpen = false} aria-label="閉じる">×</button></div>
      <form onsubmit={submitOption}>
        {#if error}<p class="form-error" role="alert">{error}</p>{/if}
        <label>タイトル<input bind:value={option.title} maxlength="140" required /></label>
        <div class="two"><label>提供元<input bind:value={option.provider} maxlength="100" /></label>
          <label>料金<input type="text" inputmode="numeric" pattern="[0-9]*" bind:value={optionAmountText} /></label></div>
        <label>通貨<select bind:value={option.currency}>{#each currencies as currency}<option value={currency}>{currency}</option>{/each}</select></label>
        <div class="two"><label>開始（現地時刻）<input type="datetime-local" bind:value={option.start_local} /></label>
          <label>終了（現地時刻）<input type="datetime-local" bind:value={option.end_local} /></label></div>
        <div class="two"><label>出発地<input bind:value={option.from} maxlength="140" /></label>
          <label>到着地・場所<input bind:value={option.to} maxlength="140" /></label></div>
        <label>キャンセル・変更条件<input bind:value={option.cancellation} maxlength="300" /></label>
        <div class="candidate-fields">
          <label>メモ<textarea data-candidate-field="notes" bind:value={option.notes} maxlength="2000" rows="3" placeholder="気になる点・比較したい条件"></textarea></label>
          <label>リンク<input data-candidate-field="url" type="url" bind:value={option.url} maxlength="2048" placeholder="https://" /></label>
        </div>
        <div class="form-actions">
          {#if editingOptionId}<button type="button" class="danger" onclick={() => { void removeOption(optionNode!, editingOptionId!); optionOpen = false; }}>削除</button>{/if}
          <button type="button" onclick={() => optionOpen = false}>キャンセル</button><button class="primary" disabled={busy || !option.title.trim()}>保存</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .mobile-common{display:none}
  .comparison-workspace{display:grid;grid-template-columns:minmax(0,1fr) 258px;align-items:start;gap:22px}
  .timeline-column{min-width:0}.comparison-sidebar{display:grid;gap:16px;position:sticky;top:20px}
  .sidebar-card{padding:16px 12px;border:1px solid #e2e4e2;border-radius:16px;background:#ffffffbd;box-shadow:0 4px 14px #273b3006}
  .sidebar-card h3{display:flex;justify-content:space-between;margin:0 2px 12px;font-size:15px}.sidebar-card h3 span{font-size:12px;color:#6d8178}
  .sidebar-card p,.sidebar-card>small{display:block;margin:8px 2px 12px;color:#738078;font-size:11px;line-height:1.7}
  .route-summary{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid #dfe4e1;border-radius:11px;margin:7px 0;background:color-mix(in srgb,var(--route-color) 8%,white)}
  .route-meta{display:block;margin:0 8px 10px;color:#5d7468;font-size:11px}.sidebar-card .route-cost-note{font-size:10px}
  .route-dot{width:11px;height:11px;border-radius:50%;background:var(--route-color);flex:none}
  .route-summary form{display:flex;min-width:0;flex:1;gap:3px}.route-summary input{width:100%;min-width:0;border:0;background:transparent;font:inherit;font-size:12px;color:#293a32;font-weight:700}
  .route-summary button,.candidate-edit{border:0;background:transparent;color:#3b7160;font-size:10px;padding:5px;white-space:nowrap}
  .route-summary strong{flex:1;font-size:12px}.sidebar-add{width:100%;padding:10px 5px;border:1px dashed #cfdcd4;border-radius:10px;background:transparent;color:#306a58;font-size:11px;margin-top:8px}
  .sidebar-add.apply{border-style:solid;background:#eaf4ee}
  .sidebar-card details{overflow:hidden;margin-top:10px;border:1px solid #e0e5e1;border-radius:12px;background:white}
  .sidebar-card summary{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:12px 10px;cursor:pointer;font-size:12px;font-weight:700}.sidebar-card summary span{overflow-wrap:anywhere}.sidebar-card summary small{flex:none;color:#809087;font-size:10px}
  .sidebar-candidate{padding:4px 6px 9px}
  .candidate-empty{padding:10px 0;text-align:center}
  .sidebar-card details>.sidebar-add{border-radius:0;border-width:1px 0 0;margin:0}

  button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #357764;outline-offset:3px}
  @media(max-width:1000px){.comparison-workspace{grid-template-columns:minmax(0,1fr)}.comparison-sidebar{position:static;grid-template-columns:1fr 1fr}.graph-canvas{margin:0 auto}}
  @media(max-width:540px){.comparison-sidebar{grid-template-columns:minmax(0,1fr)}.graph-title span{display:block;margin-top:6px}.graph-scroll{max-height:65dvh}.graph-toolbar{position:sticky;top:0;background:#faf9f5;z-index:4;padding:8px 0}}

  .demo-link{display:inline-block;margin:-4px 0 14px;color:#4b7967;font-size:11px;text-underline-offset:3px}
  .graph-board{padding:0 0 24px;color:#293a32}
  button{font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
  .graph-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 18px}
  .graph-title{display:flex;align-items:baseline;gap:12px}.graph-title h2{margin:0;font-size:19px}.graph-title span{font-size:11px;color:#87928b}
  .toolbar-actions{display:flex;gap:7px;flex-wrap:wrap}.primary{border:0;border-radius:999px;padding:10px 16px;background:#2f6657;color:white;font-size:12px;font-weight:750}
  .graph-scroll{width:100%;overflow:auto;border:1px solid #e4eae4;border-radius:16px;background:radial-gradient(ellipse at top,#f7faf6,#fff 70%);scrollbar-color:#c9d7cc transparent}
  .graph-scroll.single{border-color:transparent;background:transparent}
  .graph-scroll.single .graph-canvas{margin:0 auto}
  .graph-canvas{position:relative;min-height:240px}.graph-wires{position:absolute;inset:0;pointer-events:none}
  .time-tick{position:absolute;left:10px;width:96px;text-align:right;font-size:10px;font-variant-numeric:tabular-nums;color:#6d8674;white-space:nowrap}
  .graph-node{position:absolute;width:260px;min-height:72px;border:1px solid #dfe6df;border-top:2px solid var(--lane-color);border-radius:18px;background:white;box-shadow:0 4px 16px #1d3c2a0e;z-index:1}
  .graph-node.is-selected{border-color:var(--lane-color);box-shadow:0 0 0 3px #c7e5d47a,0 6px 19px #1d3c2a14}
  .lane-caption{position:absolute;top:-24px;left:8px;padding:3px 8px;border:1px solid #e0e7df;border-radius:999px;background:#fff;color:var(--lane-color);font-size:10px;font-weight:800;white-space:nowrap}
  .node-main{display:flex;align-items:center;gap:10px;width:100%;min-height:70px;padding:12px 10px;border:0;background:transparent;text-align:left}
  .node-mark{flex:none;width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#eff5ef;color:#3b7767;font-size:20px}
  .node-copy{display:grid;gap:3px;min-width:0;flex:1}.node-copy strong{overflow:hidden;text-overflow:ellipsis;font-size:14px;line-height:1.4}
  .node-copy small{overflow:hidden;text-overflow:ellipsis;color:#7a887e;font-size:11px;white-space:nowrap}
  .node-copy .participants{color:#387864}.node-price{font-size:11px;white-space:nowrap;font-weight:750;font-variant-numeric:tabular-nums}
  .outline{border:1px solid #dce3df;border-radius:999px;padding:10px 16px;color:#2f6657;background:white;box-shadow:0 3px 10px #26332f0a}
  .new-plan-button{font-size:12px;white-space:nowrap}
  .route-end{position:absolute;top:calc(100% + 4px);left:0;width:100%;display:flex;flex-direction:column;align-items:center;z-index:3;pointer-events:none}
  .route-end::before{content:'';height:12px;border-left:2px solid var(--lane-color);opacity:.55}
  .continue-route{pointer-events:auto;display:flex;align-items:center;gap:7px;min-height:34px;padding:5px 13px;border:1px dashed var(--lane-color);border-radius:999px;background:#fff;color:#315b4c;box-shadow:0 2px 8px #233a2b12;font-size:11px;font-weight:750;white-space:nowrap}
  .continue-route:hover,.continue-route:focus-visible{background:#eaf5ed;outline:2px solid #b4d5c0;outline-offset:2px}
  .route-plus{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#2f6657;color:#fff;font-size:15px;font-weight:650;line-height:1}
  .choice-node{z-index:2}.choice-summary{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-top:1px solid #edf1eb;font-size:11px;color:#6a7e70}
  .choice-summary button{border:0;background:transparent;color:#356d5b;font-weight:700;font-size:11px}
  .choice-list{max-height:300px;overflow-y:auto;padding:6px 8px 10px;display:grid;gap:6px}
  .external{font-size:11px;color:#356d5b}
  .add-choice{padding:9px;font-size:11px;color:#356d5b;background:transparent;border:0}
  .graph-footer{display:flex;justify-content:space-between;margin:8px 0 12px;font-size:10px;color:#89958e}
  .graph-empty{display:grid;justify-items:center;gap:12px;padding:35px 16px;border:1px dashed #d4dfd6;border-radius:16px;color:#3c6c5b}
  .graph-empty svg{width:170px;fill:#f8faf6}.status{text-align:center;padding:32px;color:#859288}
  .detail-panel{position:fixed;right:16px;bottom:90px;z-index:95;width:min(440px,calc(100vw - 32px));max-height:65dvh;overflow:auto;padding:16px;border:1px solid #e0e9e0;border-radius:15px;background:white;box-shadow:0 5px 16px #1d3c2a09}
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
  .form-error{margin:0;padding:8px 10px;border-radius:8px;background:#fff1ed;color:#a34c45;font-size:12px}
  .candidate-fields{display:grid;gap:12px;padding:12px;border:1px solid #e2ebe4;border-radius:12px;background:#f8fbf8}
  .candidate-fields textarea{min-height:88px;resize:vertical;line-height:1.6}
  .sheet form{display:grid;gap:12px}.sheet label{display:grid;gap:6px;font-size:12px;color:#435c4e;font-weight:700}.sheet label small{font-weight:400;color:#91a092}
  .sheet input,.sheet textarea,.sheet select{min-width:0;width:100%;font-weight:400}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .form-actions{display:flex;justify-content:end;gap:8px;padding-top:8px}.form-actions button:not(.primary){padding:9px 13px;border:1px solid #d9e1db;border-radius:9px;background:white;color:#516759;font-size:12px}
  @media(max-width:670px){
    .graph-scroll{overflow:visible;max-height:none;border:0;background:transparent}
    .graph-canvas{display:grid;gap:16px;width:100%!important;height:auto!important;min-height:0}
    .graph-wires,.time-tick{display:none}
    .graph-node{position:relative;left:auto!important;top:auto!important;width:100%;border-left:3px solid var(--lane-color);border-top:1px solid #dfe6df}
    .lane-caption,.mobile-common{position:static;display:inline-block;margin:10px 10px 0;font-size:11px;background:color-mix(in srgb,var(--lane-color) 8%,white)}
    .node-main{min-height:70px;padding:12px}.node-copy strong{font-size:14px}.node-copy small{font-size:12px}.node-price{font-size:12px}
    .route-end{position:relative;top:auto;padding-bottom:10px}.route-end::before{display:none}
    .graph-toolbar{position:static}.sidebar-card{padding:16px}.sidebar-candidate{padding:6px 2px}
    /* Keep selected-step controls in document flow. A fixed sheet blocks candidate cards
       and the application's bottom navigation on narrow screens. */
    .detail-panel{position:static;width:100%;max-height:none;overflow:visible;margin:16px 0 0}
    .sidebar-card p,.sidebar-card>small{font-size:12px}.sidebar-card summary{font-size:13px}.route-summary input{font-size:14px}.route-summary button{min-height:32px}
  }
  @media(max-width:670px){.graph-toolbar{align-items:start}.graph-title{display:block}.graph-title h2{font-size:17px}.toolbar-actions{justify-content:end}.toolbar-actions button{font-size:10px;padding:8px}.two{grid-template-columns:1fr}.sheet{padding:18px 16px calc(20px + env(safe-area-inset-bottom))}}

  /* Insert directly on the route, rather than adding an accidental new branch. */
  .graph-scroll.single .graph-canvas{width:100%!important;min-width:640px}
  .graph-scroll.single .graph-wires{display:none}
  .graph-scroll.single .graph-node{left:118px!important;width:calc(100% - 138px)}
  .graph-scroll.single .graph-gap-edge,.graph-scroll.single .graph-gap-root{left:50%!important}
  .drag-grip{display:grid;place-items:center;flex:none;font-size:16px;letter-spacing:-3px;color:#90a498;cursor:grab}
  .graph-node.is-drag-over{outline:2px dashed #409477;outline-offset:5px}
  .graph-gap{position:absolute;transform:translate(-50%,-50%);z-index:4;min-width:36px;min-height:36px;border:1px dashed #97bea9;border-radius:999px;background:#fff;color:#2f6657;box-shadow:0 3px 10px #21433215;font-size:12px;font-weight:750}
  .graph-gap:hover,.graph-gap:focus-visible{background:#eaf5ee;border-style:solid}
  .graph-gap-root{padding:6px 12px;white-space:nowrap}
  .route-buttons{display:flex;align-items:center;gap:7px;pointer-events:auto}
  .route-more{display:grid;place-items:center;width:36px;height:36px;border:1px solid #a9c5b2;border-radius:50%;background:white;color:#376e55;font-size:20px}
  .mobile-gap,.mobile-date,.mobile-root-gap,.mobile-route-event{display:none}
  .attachment-warning{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px;margin:10px 0;border:1px solid #e3c7aa;border-radius:12px;background:#fff5ea;color:#75482a;font-size:12px}
  .attachment-warning button{min-height:36px;border:1px solid #d4ae87;border-radius:999px;padding:7px 12px;background:white;color:#75482a;font-size:12px;font-weight:750}
  .chronology-warning{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 12px;margin:10px 0;border:1px solid #ddc9a0;border-radius:12px;background:#f9f5ea;color:#685222;font-size:12px}
  .chronology-warning button{border:1px solid #d7bb83;border-radius:999px;padding:6px 11px;background:#fff;color:#695223;font-size:12px;font-weight:700}
  .node-extras{font-size:11px;color:#608072!important}
  .join-banner{position:sticky;top:0;z-index:6;display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;padding:12px 14px;background:#e9f5ee;border:1px solid #a4cbb6;border-radius:12px;font-size:13px;color:#285c48}
  .join-banner button{border:1px solid #90bda5;border-radius:999px;padding:7px 12px;background:white;color:#2f6657}
  .mobile-view-toggle{display:none}
  .mobile-detail-overlay{display:none}
  .existing-search{display:grid;gap:8px;font-weight:650;font-size:13px;color:#39574a;margin:16px 0}
  .existing-search input{padding:12px;border:1px solid #c7d7cc;border-radius:10px;font-size:16px}
  .gap-actions,.existing-options{display:grid;gap:9px;margin:16px 0}
  .gap-actions button,.existing-options button{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:48px;width:100%;padding:12px 14px;border:1px solid #d4e0d8;border-radius:12px;background:white;color:#2f6657;text-align:left;font-size:14px;font-weight:700}
  .gap-actions button:hover,.existing-options button:hover{background:#f1f8f3}
  .gap-actions .gap-primary{background:#2f6657;color:white;border-color:#2f6657}
  .existing-options{max-height:min(54dvh,440px);overflow:auto}
  .existing-options button small{color:#718477;font-size:12px;font-weight:400}
  .existing-empty{color:#708478;text-align:center;font-size:13px}
  .comparison-workspace{grid-template-columns:minmax(0,1fr) 320px;gap:16px}
  .comparison-sidebar{align-content:start}
  .detail-panel{position:static;width:100%;max-height:min(72dvh,750px);padding:20px;overflow:auto;border-radius:16px;box-shadow:0 6px 20px #1d3c2a12}
  .panel-heading h3{font-size:18px}
  .panel-heading small,.panel-sub{font-size:12px}
  .panel-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .panel-actions button,.join-form button{min-height:40px;font-size:12px;font-weight:650;padding:8px}
  .join-form label{font-size:12px;font-weight:650}
  .join-form select{min-height:40px;font-size:13px}
  .node-copy strong{font-size:15px}
  .node-copy small{font-size:12px;color:#566d60}
  .graph-node{width:310px;border-radius:14px}
  .node-main{min-height:76px}
  .time-tick{font-size:12px;color:#557360}
  @media(max-width:1000px){
    .comparison-workspace{grid-template-columns:minmax(0,1fr)}
    .comparison-sidebar{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}
    .comparison-sidebar .detail-panel{grid-column:1/-1;max-height:none}
  }
  @media(max-width:670px){
    .mobile-view-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin:10px 0 12px;padding:4px;border:1px solid #dce7de;border-radius:12px;background:#f0f5f0}
    .mobile-view-toggle button{min-height:38px;border:0;border-radius:9px;background:transparent;color:#587364;font-size:13px;font-weight:700}
    .mobile-view-toggle button[aria-pressed="true"]{background:#fff;color:#2d6850;box-shadow:0 2px 7px #2b4b3517}
    .mobile-list-hidden{display:none!important}
    .graph-scroll.single .graph-canvas{min-width:0}
    .graph-scroll.single .graph-node{left:auto!important;width:100%}
    .graph-gap{display:none}
    .graph-canvas{gap:16px}
    .graph-node{width:100%;border-radius:14px}
    .drag-grip{display:none}
    .mobile-route-event{display:inline-flex;margin:8px 10px 0;padding:4px 8px;border-radius:999px;background:#e9f4ed;color:#356c55;font-size:11px;font-weight:750}
    .mobile-date{display:block;margin:0 0 8px;padding:9px 12px;background:#f0f6f0;border-radius:10px;color:#285c48;font-size:13px;font-weight:800}
    .mobile-gap,.mobile-root-gap{display:block;min-height:40px;margin:4px auto 10px;padding:8px 13px;border:1px dashed #9fc4aa;border-radius:999px;background:#fff;color:#316e56;font-size:12px;font-weight:700}
    .graph-node:has(.mobile-date){margin-top:22px}
    .detail-panel{position:fixed;bottom:0;left:0;right:0;z-index:110;width:100%;max-height:85dvh;overflow:auto;border-radius:20px 20px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -8px 36px #152f2440}
    .mobile-detail-overlay{display:block;position:fixed;inset:0;z-index:109;width:100%;height:100%;border:0;background:#152f2477}
    .panel-actions button{min-height:44px;font-size:13px}
    .route-action-sheet{padding:20px 16px calc(24px + env(safe-area-inset-bottom))}
    .comparison-sidebar{grid-template-columns:minmax(0,1fr)}
    .graph-scroll{max-height:none}
  }
</style>
