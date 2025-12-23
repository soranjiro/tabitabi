<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getMemoText } from "$lib/memo";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
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
  let editStepHour = $state("09");
  let editStepMinute = $state("00");

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  // 日付ごとにグループ化
  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();

    for (const step of steps) {
      const date = step.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }

    // 各グループ内を時刻順にソート
    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.time.localeCompare(b.time));
    }

    // 日付順にソート
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
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
    editStepHour = "09";
    editStepMinute = "00";
  }

  async function handleUpdate() {
    if (
      !editingStepId ||
      !editedStep.title?.trim() ||
      !editedStep.date ||
      !editedStep.time
    ) {
      alert("タイトル、日付、時刻は必須です");
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
    editStepHour = "09";
    editStepMinute = "00";
  }

  async function handleDelete(stepId: string) {
    if (!confirm("この予定を削除しますか?")) return;

    if (onDeleteStep) {
      await onDeleteStep(stepId);
    }
  }
</script>

{#if steps.length === 0}
  <div class="minimal-empty">
    <p>予定がまだ登録されていません</p>
  </div>
{:else}
  <div class="minimal-steps">
    {#each groupedSteps() as [date, dateSteps]}
      <div class="minimal-date-group">
        <h2 class="minimal-date-header">{formatDate(date)}</h2>
        <div class="minimal-date-steps">
          {#each dateSteps as step}
            {#if editingStepId === step.id}
              <div class="minimal-step minimal-step-editing">
                <input
                  type="text"
                  bind:value={editedStep.title}
                  placeholder="予定のタイトル *"
                  class="minimal-input"
                />
                <div class="minimal-datetime">
                  <input
                    type="date"
                    bind:value={editedStep.date}
                    class="minimal-input"
                  />
                  <div class="minimal-time-picker">
                    <select bind:value={editStepHour} class="minimal-select">
                      {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                        <option value={hour}>{hour}</option>
                      {/each}
                    </select>
                    <span class="minimal-time-separator">:</span>
                    <select bind:value={editStepMinute} class="minimal-select">
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  bind:value={editedStep.location}
                  placeholder="場所 (任意)"
                  class="minimal-input"
                />
                <textarea
                  bind:value={editedStep.notes}
                  placeholder="メモ (任意)"
                  class="minimal-textarea"
                  rows="3"
                ></textarea>
                <div class="minimal-step-actions">
                  <button
                    onclick={handleUpdate}
                    class="minimal-btn minimal-btn-primary">保存</button
                  >
                  <button
                    onclick={cancelEdit}
                    class="minimal-btn minimal-btn-secondary">キャンセル</button
                  >
                </div>
              </div>
            {:else}
              <div class="minimal-step">
                <div class="minimal-step-time">{step.time}</div>
                <h3 class="minimal-step-title">{step.title}</h3>
                {#if step.location}
                  <div class="minimal-step-location">📍 {step.location}</div>
                {/if}
                {#if getMemoText(step.notes)}
                  <div class="minimal-step-notes">
                    {getMemoText(step.notes)}
                  </div>
                {/if}
                <div class="minimal-step-actions">
                  <button
                    onclick={() => startEdit(step)}
                    class="minimal-btn minimal-btn-small"
                    disabled={!hasEditPermission}>編集</button
                  >
                  <button
                    onclick={() => handleDelete(step.id)}
                    class="minimal-btn minimal-btn-small minimal-btn-danger"
                    disabled={!hasEditPermission}>削除</button
                  >
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
