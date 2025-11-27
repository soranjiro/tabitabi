<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string | null;
        notes?: string | null;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    steps,
    hasEditPermission = false,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("10");
  let editStepMinute = $state("00");

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  const groupedByStore = $derived(() => {
    const groups = new Map<string, Step[]>();

    for (const step of steps) {
      const store = step.location || "";
      if (!groups.has(store)) {
        groups.set(store, []);
      }
      groups.get(store)!.push(step);
    }

    for (const [_, storeSteps] of groups) {
      storeSteps.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
    }

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "") return 1;
      if (b[0] === "") return -1;
      return a[0].localeCompare(b[0]);
    });
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toISOString().split("T")[0];
    const todayOnly = today.toISOString().split("T")[0];
    const tomorrowOnly = tomorrow.toISOString().split("T")[0];

    if (dateOnly === todayOnly) return "今日";
    if (dateOnly === tomorrowOnly) return "明日";

    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }

  function startEdit(step: Step) {
    editingStepId = step.id;
    editedStep = { ...step };
    const [hour, minute] = step.time.split(":");
    editStepHour = hour;
    editStepMinute = minute;
  }

  function cancelEdit() {
    editingStepId = null;
    editedStep = {};
    editStepHour = "10";
    editStepMinute = "00";
  }

  async function handleUpdate() {
    if (!editingStepId || !editedStep.title?.trim()) {
      alert("アイテム名は必須です");
      return;
    }

    if (onUpdateStep) {
      await onUpdateStep(editingStepId, {
        title: editedStep.title.trim(),
        date: editedStep.date,
        time: editedStep.time,
        location: editedStep.location?.trim() || undefined,
        notes: editedStep.notes?.trim() || undefined,
      });
    }

    editingStepId = null;
    editedStep = {};
    editStepHour = "10";
    editStepMinute = "00";
  }

  async function handleDelete(stepId: string) {
    if (!confirm("このアイテムを削除しますか？")) return;

    if (onDeleteStep) {
      await onDeleteStep(stepId);
    }
  }

  function isCompleted(step: Step): boolean {
    return step.notes?.startsWith("Done") ?? false;
  }

  function displayNotes(step: Step): string {
    if (!step.notes) return "";
    return step.notes.replace(/^Done\s*/, "").trim();
  }

  async function toggleCompleted(step: Step) {
    if (!hasEditPermission || !onUpdateStep) return;

    const currentlyCompleted = isCompleted(step);
    let newNotes: string | null;

    if (currentlyCompleted) {
      const remaining = (step.notes?.replace(/^Done\s*/, "") ?? "").trim();
      newNotes = remaining || null;
    } else {
      newNotes = step.notes ? `Done ${step.notes}` : "Done";
    }

    await onUpdateStep(step.id, {
      notes: newNotes,
    });
  }
</script>

{#if steps.length === 0}
  <div class="shopping-empty">
    <div class="shopping-empty-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
    </div>
    <h3 class="shopping-empty-title">リストは空です</h3>
    <p class="shopping-empty-text">
      買い物アイテムを追加して<br />お買い物を始めましょう
    </p>
  </div>
{:else}
  <div class="shopping-list">
    {#each groupedByStore() as [storeName, storeSteps]}
      <div class="shopping-store-group">
        <div class="shopping-store-header">
          <div class="shopping-store-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
              />
            </svg>
          </div>
          <h2 class="shopping-store-name">
            {storeName || "店舗未指定"}
          </h2>
          <span class="shopping-store-badge">
            {storeSteps.length}点
          </span>
        </div>
        <div class="shopping-store-items">
          {#each storeSteps as step}
            {#if editingStepId === step.id}
              <div class="shopping-item-editing">
                <div class="shopping-form-field">
                  <span class="shopping-label">アイテム名 *</span>
                  <input
                    type="text"
                    bind:value={editedStep.title}
                    placeholder="アイテム名"
                    class="shopping-input"
                  />
                </div>
                <div class="shopping-form-field">
                  <span class="shopping-label">お店</span>
                  <input
                    type="text"
                    bind:value={editedStep.location}
                    placeholder="お店の名前"
                    class="shopping-input"
                  />
                </div>
                <div class="shopping-form-row">
                  <div class="shopping-form-field">
                    <span class="shopping-label">日付</span>
                    <input
                      type="date"
                      bind:value={editedStep.date}
                      class="shopping-input"
                    />
                  </div>
                  <div class="shopping-form-field">
                    <span class="shopping-label">時刻</span>
                    <div class="shopping-time-picker">
                      <select bind:value={editStepHour} class="shopping-select">
                        {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                          <option value={hour}>{hour}</option>
                        {/each}
                      </select>
                      <span class="shopping-time-separator">:</span>
                      <select
                        bind:value={editStepMinute}
                        class="shopping-select"
                      >
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="shopping-form-field">
                  <span class="shopping-label">メモ</span>
                  <textarea
                    bind:value={editedStep.notes}
                    placeholder="価格、数量など..."
                    class="shopping-textarea"
                    rows="2"
                  ></textarea>
                </div>
                <div class="shopping-form-actions">
                  <button
                    onclick={handleUpdate}
                    class="shopping-btn shopping-btn-primary"
                  >
                    保存
                  </button>
                  <button
                    onclick={cancelEdit}
                    class="shopping-btn shopping-btn-ghost"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            {:else}
              <div
                class="shopping-item"
                class:shopping-item-completed={isCompleted(step)}
              >
                <div class="shopping-item-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={isCompleted(step)}
                    onchange={() => toggleCompleted(step)}
                    class="shopping-item-checkbox"
                    disabled={!hasEditPermission}
                  />
                  <div class="shopping-checkbox-custom"></div>
                </div>
                <div class="shopping-item-content">
                  <h3 class="shopping-item-title">{step.title}</h3>
                  <div class="shopping-item-meta">
                    <span class="shopping-item-date">
                      {formatDate(step.date)}
                    </span>
                    <span class="shopping-item-time">{step.time}</span>
                  </div>
                  {#if displayNotes(step)}
                    <div class="shopping-item-notes">{displayNotes(step)}</div>
                  {/if}
                </div>
                <div class="shopping-item-actions">
                  <button
                    onclick={() => startEdit(step)}
                    class="shopping-btn-icon"
                    disabled={!hasEditPermission}
                    title="編集"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                      />
                      <path
                        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                      />
                    </svg>
                  </button>
                  <button
                    onclick={() => handleDelete(step.id)}
                    class="shopping-btn-icon shopping-btn-icon-danger"
                    disabled={!hasEditPermission}
                    title="削除"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
