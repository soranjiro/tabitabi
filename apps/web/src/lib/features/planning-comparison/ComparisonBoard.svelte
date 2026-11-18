<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ComparisonGroup, ComparisonKind, ComparisonOption, UpdateComparisonGroupInput,
  } from '@tabitabi/types';
  import { comparisonApi } from '$lib/api/comparisons';

  interface Props {
    itineraryId: string;
    canEdit: boolean;
    demo?: boolean;
    onPlan: (group: ComparisonGroup, option: ComparisonOption) => void;
  }
  let { itineraryId, canEdit, demo = false, onPlan }: Props = $props();

  const kinds: { value: ComparisonKind; label: string }[] = [
    { value: 'flight', label: '飛行機' },
    { value: 'stay', label: '宿泊' },
    { value: 'transport', label: 'その他の移動' },
    { value: 'other', label: 'その他' },
  ];
  const currencies = ['JPY', 'USD', 'EUR', 'KRW', 'TWD', 'THB', 'GBP', 'AUD', 'CNY'];

  let groups = $state<ComparisonGroup[]>([]);
  let expandedIds = $state<string[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let showGroupForm = $state(false);
  let groupTitle = $state('');
  let groupKind = $state<ComparisonKind>('flight');
  let editingGroupId = $state<string | null>(null);
  let editingOptionId = $state<string | null>(null);
  let optionDraft = $state<ComparisonOption>(newOption());
  let amountDraft = $state('');
  let renameGroupId = $state<string | null>(null);
  let renameTitle = $state('');

  const editingGroup = $derived(groups.find((group) => group.id === editingGroupId) ?? null);

  function newOption(): ComparisonOption {
    return {
      id: crypto.randomUUID(), title: '', provider: '', amount: null, currency: 'JPY',
      start_local: '', end_local: '', from: '', to: '', cancellation: '',
      url: '', notes: '',
    };
  }

  function kindLabel(kind: ComparisonKind) {
    return kinds.find((item) => item.value === kind)?.label ?? 'その他';
  }

  function price(option: ComparisonOption) {
    if (option.amount === null) return '未入力';
    try {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency', currency: option.currency, maximumFractionDigits: 0,
      }).format(option.amount);
    } catch { return option.amount.toLocaleString('ja-JP') + ' ' + option.currency; }
  }

  function localLabel(value: string) {
    return value ? value.replace('T', ' ') : '未入力';
  }

  async function reload() {
    if (demo) { loading = false; return; }
    loading = true;
    try {
      const list = await comparisonApi.list(itineraryId);
      groups = list;
      if (expandedIds.length === 0 && list.length) expandedIds = [list[0].id];
      error = '';
    } catch {
      error = '比較候補を読み込めませんでした。';
    } finally {
      loading = false;
    }
  }

  onMount(() => { void reload(); });

  function toggle(groupId: string) {
    expandedIds = expandedIds.includes(groupId)
      ? expandedIds.filter((id) => id !== groupId) : [...expandedIds, groupId];
  }

  function replaceGroup(next: ComparisonGroup) {
    groups = groups.map((item) => item.id === next.id ? next : item);
  }

  async function createGroup(event: SubmitEvent) {
    event.preventDefault();
    if (!canEdit || busy || !groupTitle.trim()) return;
    busy = true;
    error = '';
    try {
      const next: ComparisonGroup = demo
        ? {
            id: crypto.randomUUID(), itinerary_id: itineraryId, title: groupTitle.trim(),
            kind: groupKind, options: [], selected_option_id: null,
            revision: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }
        : await comparisonApi.create(itineraryId, { title: groupTitle.trim(), kind: groupKind });
      groups = [...groups, next];
      expandedIds = [...expandedIds, next.id];
      groupTitle = '';
      showGroupForm = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '比較グループを作れませんでした。';
    } finally { busy = false; }
  }

  async function updateGroup(group: ComparisonGroup, patch: Omit<UpdateComparisonGroupInput, 'revision'>) {
    if (!canEdit || busy) return false;
    busy = true;
    error = '';
    try {
      const next = demo
        ? { ...group, ...patch, revision: group.revision + 1, updated_at: new Date().toISOString() }
        : await comparisonApi.update(itineraryId, group.id, { revision: group.revision, ...patch });
      replaceGroup(next);
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '保存できませんでした。';
      return false;
    } finally { busy = false; }
  }

  function openOption(group: ComparisonGroup, option?: ComparisonOption) {
    editingGroupId = group.id;
    editingOptionId = option?.id ?? null;
    optionDraft = option ? { ...option } : newOption();
    amountDraft = option?.amount == null ? '' : String(option.amount);
    error = '';
  }

  function closeOption() {
    editingGroupId = null;
    editingOptionId = null;
  }

  function focusDialog(element: HTMLElement) {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...element.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
    )].filter(item => item.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        closeOption();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener('keydown', onKeydown);
    return { destroy() { element.removeEventListener('keydown', onKeydown); previous?.focus(); } };
  }

  async function saveOption(event: SubmitEvent) {
    event.preventDefault();
    if (!editingGroup || busy || !optionDraft.title.trim()) return;
    if (amountDraft.trim() && (!/^\d+$/.test(amountDraft.trim()) || Number(amountDraft) > 1_000_000_000_000)) {
      error = '金額は0以上の整数で入力してください。';
      return;
    }
    const draft = {
      ...optionDraft, title: optionDraft.title.trim(),
      amount: amountDraft.trim() ? Number(amountDraft.trim()) : null,
    };
    const options = editingOptionId
      ? editingGroup.options.map((item) => item.id === editingOptionId ? draft : item)
      : [...editingGroup.options, draft];
    if (await updateGroup(editingGroup, { options })) closeOption();
  }

  async function deleteOption(group: ComparisonGroup, option: ComparisonOption) {
    if (!confirm('「' + option.title + '」を候補から削除しますか？')) return;
    await updateGroup(group, {
      options: group.options.filter((item) => item.id !== option.id),
      selected_option_id: group.selected_option_id === option.id ? null : group.selected_option_id,
    });
  }

  async function deleteGroup(group: ComparisonGroup) {
    if (!canEdit || busy || !confirm('「' + group.title + '」と候補をすべて削除しますか？')) return;
    busy = true;
    error = '';
    try {
      if (!demo) await comparisonApi.delete(itineraryId, group.id);
      groups = groups.filter((item) => item.id !== group.id);
      expandedIds = expandedIds.filter((id) => id !== group.id);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '削除できませんでした。';
    } finally { busy = false; }
  }

  function beginRename(group: ComparisonGroup) {
    renameGroupId = group.id;
    renameTitle = group.title;
  }

  async function saveRename(group: ComparisonGroup) {
    if (renameTitle.trim() && await updateGroup(group, { title: renameTitle.trim() })) {
      renameGroupId = null;
    }
  }
</script>

<section class="comparison-board" aria-label="飛行機・宿などの比較候補">
  <div class="board-heading">
    <div>
      <h2>候補</h2>
    </div>
    {#if canEdit}
      <button class="primary" onclick={() => (showGroupForm = !showGroupForm)}>
        {showGroupForm ? '閉じる' : '＋ 比較を作る'}
      </button>
    {/if}
  </div>


  {#if error}
    <div class="error" role="alert"><span>{error}</span><button onclick={reload}>再読込</button></div>
  {/if}

  {#if showGroupForm && canEdit}
    <form class="group-create" onsubmit={createGroup}>
      <label>比較するもの
        <select bind:value={groupKind}>
          {#each kinds as kind}<option value={kind.value}>{kind.label}</option>{/each}
        </select>
      </label>
      <label class="title-field">グループ名
        <input bind:value={groupTitle} placeholder="例：行きの飛行機 / 1泊目の宿" required maxlength="120" />
      </label>
      <button class="primary" disabled={busy || !groupTitle.trim()}>作成する</button>
    </form>
  {/if}

  {#if loading}
    <p class="empty">候補を読み込んでいます。</p>
  {:else if groups.length === 0}
    <div class="empty">
      <strong>候補はまだありません</strong>
    </div>
  {:else}
    <div class="group-list">
      {#each groups as group (group.id)}
        {@const selected = group.options.find((option) => option.id === group.selected_option_id)}
        <article class="group-card">
          <div class="group-header">
            <button class="expand" onclick={() => toggle(group.id)} aria-expanded={expandedIds.includes(group.id)}>
              <span class="group-icon" aria-hidden="true">{group.kind === 'flight' ? '✈' : group.kind === 'stay' ? '⌂' : group.kind === 'transport' ? '⇄' : '◇'}</span>
              <span class="group-copy">
                <small>{kindLabel(group.kind)} · {group.options.length}案</small>
                <strong>{group.title}</strong>
                <small class:chosen={!!selected}>{selected ? '採用：' + selected.title : 'まだ決めていません'}</small>
              </span>
              <span class="chevron" aria-hidden="true">{expandedIds.includes(group.id) ? '−' : '＋'}</span>
            </button>
          </div>
          {#if expandedIds.includes(group.id)}
            <div class="group-inner">
              {#if canEdit}
                <div class="group-actions">
                  {#if renameGroupId === group.id}
                    <form class="rename" onsubmit={(event) => { event.preventDefault(); void saveRename(group); }}>
                      <input aria-label="グループ名" bind:value={renameTitle} maxlength="120" required />
                      <button disabled={busy}>保存</button>
                      <button type="button" onclick={() => (renameGroupId = null)}>取消</button>
                    </form>
                  {:else}
                    <button onclick={() => beginRename(group)}>名前を変更</button>
                    <button class="danger" onclick={() => deleteGroup(group)} disabled={busy}>グループを削除</button>
                  {/if}
                </div>
              {/if}
              {#if group.options.length > 0}
                <div class="matrix-scroll" role="region" aria-label="候補比較表。横にスクロールできます">
                  <table>
                    <thead>
                      <tr><th scope="col">候補</th><th scope="col">料金</th><th scope="col">{group.kind === 'stay' ? 'チェックイン・アウト' : '出発・到着'}</th><th scope="col">キャンセル・条件</th><th scope="col">詳細</th>{#if canEdit}<th scope="col">操作</th>{/if}</tr>
                    </thead>
                    <tbody>
                      {#each group.options as option (option.id)}
                        <tr class:selected={group.selected_option_id === option.id}>
                          <td class="name-cell" data-label="候補">
                            {#if group.selected_option_id === option.id}<span class="picked">採用中</span>{/if}
                            <strong>{option.title}</strong>
                            {#if option.provider}<small>{option.provider}</small>{/if}
                            {#if option.from || option.to}<small>{option.from}{option.to ? ' → ' + option.to : ''}</small>{/if}
                          </td>
                          <td data-label="料金"><strong class="price">{price(option)}</strong></td>
                          <td class="dates" data-label={group.kind === 'stay' ? 'チェックイン・アウト' : '出発・到着'}><span>{localLabel(option.start_local)}</span><span>{localLabel(option.end_local)}</span></td>
                          <td class="details" data-label="キャンセル・条件">{option.cancellation || '未入力'}</td>
                          <td class="details" data-label="詳細">
                            {#if option.url}<a href={option.url} target="_blank" rel="noopener noreferrer">予約ページ</a>{/if}
                            {#if option.notes}<p>{option.notes}</p>{/if}
                            {#if !option.url && !option.notes}—{/if}
                          </td>
                          {#if canEdit}
                            <td data-label="操作">
                              <div class="option-actions">
                                {#if group.selected_option_id !== option.id}
                                  <button class="select" onclick={() => updateGroup(group, { selected_option_id: option.id })} disabled={busy}>この案に決める</button>
                                {:else}
                                  <button class="plan" onclick={() => onPlan(group, option)}>予定に追加</button>
                                  <button onclick={() => updateGroup(group, { selected_option_id: null })} disabled={busy}>決定を解除</button>
                                {/if}
                                <button onclick={() => openOption(group, option)}>編集</button>
                                <button class="danger" onclick={() => deleteOption(group, option)} disabled={busy}>削除</button>
                              </div>
                            </td>
                          {/if}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>

              {:else}
                <p class="group-empty">候補なし</p>
              {/if}
              {#if canEdit}
                <button class="add-option" disabled={busy || group.options.length >= 50} onclick={() => openOption(group)}>＋ 候補を追加</button>
              {/if}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

{#if editingGroup && canEdit}
  <div class="sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && !busy && closeOption()}>
    <div class="sheet" use:focusDialog role="dialog" aria-modal="true" aria-label="比較候補を編集">
      <div class="sheet-heading">
        <div><small>{editingGroup.title}</small><h3>{editingOptionId ? '候補を編集' : '候補を追加'}</h3></div>
        <button aria-label="閉じる" onclick={closeOption} disabled={busy}>×</button>
      </div>
      <form onsubmit={saveOption}>
        <label>候補名 <span>必須</span><input bind:value={optionDraft.title} maxlength="140" required placeholder={editingGroup.kind === 'stay' ? '例：駅近くのホテル A' : '例：航空会社 A / 直行便'} /></label>
        <div class="fields">
          <label>航空会社・ホテル・販売元<input bind:value={optionDraft.provider} maxlength="100" placeholder="任意" /></label>
          <label>料金（総額）<div class="money-field"><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="13" bind:value={amountDraft} placeholder="未入力" /><select aria-label="通貨" bind:value={optionDraft.currency}>{#each currencies as c}<option value={c}>{c}</option>{/each}</select></div></label>
        </div>
        <div class="fields">
          <label>{editingGroup.kind === 'stay' ? 'チェックイン' : '出発（現地時刻）'}{#if editingGroup.kind === 'stay'}<input type="date" bind:value={optionDraft.start_local} />{:else}<input type="datetime-local" bind:value={optionDraft.start_local} />{/if}</label>
          <label>{editingGroup.kind === 'stay' ? 'チェックアウト' : '到着（現地時刻）'}{#if editingGroup.kind === 'stay'}<input type="date" bind:value={optionDraft.end_local} />{:else}<input type="datetime-local" bind:value={optionDraft.end_local} />{/if}</label>
        </div>
        {#if editingGroup.kind === 'flight' || editingGroup.kind === 'transport'}
          <div class="fields">
            <label>出発地<input bind:value={optionDraft.from} maxlength="140" placeholder="例：関西国際空港" /></label>
            <label>到着地<input bind:value={optionDraft.to} maxlength="140" placeholder="例：羽田空港" /></label>
          </div>

        {:else}
          <label>場所<input bind:value={optionDraft.to} maxlength="140" placeholder="ホテルの所在地など" /></label>
        {/if}
        <label>キャンセル・変更条件<input bind:value={optionDraft.cancellation} maxlength="300" placeholder="例：前日まで無料 / 手荷物込み" /></label>
        <label>予約・参考URL<input type="url" bind:value={optionDraft.url} maxlength="2048" placeholder="https://" /></label>
        <label>メモ<textarea bind:value={optionDraft.notes} maxlength="2000" rows="3" placeholder="部屋タイプ、乗継、良い点・気になる点など"></textarea></label>
        {#if error}<p role="alert" class="error">{error}</p>{/if}
        <div class="form-actions">
          <button type="button" class="secondary" onclick={closeOption} disabled={busy}>キャンセル</button>
          <button class="primary" disabled={busy || !optionDraft.title.trim()}>{busy ? '保存中…' : '候補を保存'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .comparison-board { margin: 20px 0 28px; padding: 20px; border: 1px solid #dce5dd; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px #26332f08; }
  .board-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .board-heading h2 { margin: 3px 0 5px; color: #26332f; font-size: 20px; }
  button { font: inherit; cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .55; }
  .primary { flex: none; padding: 10px 15px; border: 0; border-radius: 10px; color: white; background: #2f6657; font-size: 12px; font-weight: 750; }
  .group-create { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin: 18px 0 0; padding: 14px; border-radius: 12px; background: #f5f8f5; }
  label { display: grid; gap: 6px; color: #52635a; font-size: 12px; font-weight: 700; }
  label span { color: #9b634d; }
  .title-field { flex: 1 1 230px; }
  input, select, textarea { min-width: 0; padding: 10px; border: 1px solid #d6ded8; border-radius: 9px; color: #26332f; background: white; font: inherit; font-size: 13px; }
  .empty { margin: 18px 0 0; padding: 20px 14px; border: 1px dashed #d6ded8; border-radius: 12px; text-align: center; color: #53625b; font-size: 13px; }
  .error { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 12px 0; padding: 10px; border-radius: 8px; background: #fff0ed; color: #9e4e42; font-size: 12px; }
  .error button { padding: 5px 9px; border: 1px solid #eccac1; border-radius: 6px; background: #fff; }
  .group-list { display: grid; gap: 10px; margin-top: 16px; }
  .group-card { overflow: hidden; border: 1px solid #dee6df; border-radius: 12px; }
  .group-header { background: #f8faf7; }
  .expand { display: flex; align-items: center; width: 100%; padding: 13px 16px; border: 0; gap: 12px; color: #26332f; background: transparent; text-align: left; }
  .group-icon { display: grid; flex: 0 0 36px; height: 36px; place-items: center; border: 1px solid #d5e2d9; border-radius: 11px; color: #2f6657; background: white; font-size: 21px; }
  .group-copy { display: grid; min-width: 0; gap: 3px; }
  .group-copy strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; }
  .group-copy small { color: #829188; font-size: 11px; }
  .group-copy .chosen { color: #2f6657; font-weight: 700; }
  .chevron { margin-left: auto; color: #678476; font-size: 24px; }
  .group-inner { padding: 12px; }
  .group-actions { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 8px; }
  .group-actions button { padding: 4px 0; border: 0; color: #527568; background: transparent; font-size: 11px; }
  .group-actions .danger, .option-actions .danger { color: #ad6254; }
  .rename { display: flex; width: 100%; gap: 8px; }
  .rename input { flex: 1; }
  .matrix-scroll { width: 100%; overflow-x: auto; border: 1px solid #e5ebe5; border-radius: 10px; }
  @media (max-width: 640px) {
    .comparison-board { padding: 14px; margin: 12px 0 20px; }
    .group-inner { padding: 10px; }
    .matrix-scroll { overflow: visible; border: 0; }
    table, tbody { display: block; min-width: 0; width: 100%; }
    thead { display: none; }
    tbody { display: grid; gap: 10px; }
    tbody tr { display: grid; gap: 8px; padding: 12px; border: 1px solid #e1e9e2; border-radius: 12px; }
    tbody tr.selected { border-color: #7db49a; }
    td { display: grid; grid-template-columns: minmax(78px, 34%) minmax(0, 1fr); align-items: start; gap: 8px; max-width: none; min-width: 0; padding: 0; border-top: 0; font-size: 12px; }
    td::before { content: attr(data-label); color: #667d6e; font-size: 11px; font-weight: 700; }
    td.name-cell { grid-template-columns: 1fr; gap: 3px; }
    td.name-cell::before { display: none; }
    td.name-cell strong { font-size: 14px; }
    td.dates { white-space: normal; }
    td.details { max-width: none; min-width: 0; overflow-wrap: anywhere; }
    .option-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .option-actions button { min-height: 36px; }
    .fields { grid-template-columns: 1fr; }
  }
  :global(.comparison-board button:focus-visible), :global(.comparison-board a:focus-visible) {
    outline: 2px solid #246d58; outline-offset: 3px;
  }
  table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 12px; text-align: left; }
  th { padding: 10px; color: #657c6d; background: #f4f7f3; font-size: 11px; font-weight: 750; white-space: nowrap; }
  td { max-width: 260px; padding: 12px 10px; border-top: 1px solid #e9eee9; vertical-align: top; overflow-wrap: anywhere; line-height: 1.5; }
  tr.selected { background: #f0f8f2; }
  .name-cell { min-width: 155px; }
  .name-cell strong, .name-cell small, .dates span { display: block; }
  .name-cell small { margin-top: 3px; color: #728078; }
  .picked { display: inline-block; margin-bottom: 5px; padding: 2px 6px; border-radius: 5px; background: #d8ede0; color: #2f6657; font-size: 10px; font-weight: 750; }
  .price { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dates { min-width: 140px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dates span + span { margin-top: 5px; }
  .details { min-width: 115px; max-width: 220px; color: #53625a; white-space: pre-wrap; }
  .details p { margin: 5px 0 0; }
  .details a { color: #2f6657; text-decoration: underline; text-underline-offset: 2px; }
  .option-actions { display: flex; min-width: 110px; flex-wrap: wrap; gap: 7px; }
  .option-actions button { padding: 5px 8px; border: 1px solid #d9e3da; border-radius: 7px; color: #526b5b; background: #fff; font-size: 11px; }
  .option-actions .select, .option-actions .plan { border-color: #2f6657; color: #fff; background: #2f6657; }
  .group-empty { padding: 16px 4px; color: #829188; font-size: 12px; }
  .add-option { display: block; margin-top: 10px; padding: 10px 14px; border: 1px solid #bed5c5; border-radius: 8px; color: #2f6657; background: #f3f9f4; font-size: 12px; font-weight: 750; }
  .sheet-backdrop { position: fixed; z-index: 400; inset: 0; display: flex; align-items: end; justify-content: center; background: #18231f77; }
  .sheet { width: min(600px, 100%); max-height: 92dvh; overflow: auto; padding: 20px 22px calc(24px + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: white; box-shadow: 0 16px 48px #0002; }
  .sheet-heading { display: flex; justify-content: space-between; align-items: start; }
  .sheet-heading small { color: #728579; }
  .sheet-heading h3 { margin: 3px 0 18px; font-size: 18px; }
  .sheet-heading button { width: 32px; height: 32px; border: none; border-radius: 50%; color: #667b6d; background: #eff3ef; font-size: 22px; }
  .sheet form { display: grid; gap: 14px; }
  .sheet label { gap: 7px; }
  .sheet input, .sheet select, .sheet textarea { width: 100%; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .money-field { display: flex; gap: 6px; }
  .money-field select { width: 100px; }
  .form-actions { display: flex; justify-content: end; gap: 8px; padding-top: 7px; }
  .secondary { padding: 10px 15px; border: 1px solid #dce6db; border-radius: 10px; color: #5c7364; background: #f6f8f5; font-size: 12px; }
  @media(max-width: 640px) {
    .comparison-board { margin: 12px 0 24px; padding: 15px 12px; }
    .board-heading { align-items: start; }
    .board-heading h2 { font-size: 17px; }
    .board-heading .primary { padding: 9px; font-size: 11px; }
    .fields { grid-template-columns: 1fr; }
    .sheet { padding: 18px 16px calc(20px + env(safe-area-inset-bottom)); }
  }
</style>
