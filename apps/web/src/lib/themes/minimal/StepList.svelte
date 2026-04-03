<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime, createTimestamp } from "@tabitabi/types";
  import { getMemoText } from "$lib/memo";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        start_at?: number;
        end_at?: number;
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
  let editedStep = $state<{
    title?: string;
    location?: string;
    notes?: string;
  }>({});

  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();

    for (const step of steps) {
      const date = getStepDate(step);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }

    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.start_at - b.start_at);
    }

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
    editedStep = {
      title: step.title,
      location: step.location ?? undefined,
      notes: step.notes ?? undefined,
    };
  }

  function cancelEdit() {
    editingStepId = null;
    editedStep = {};
  }

  async function handleUpdate() {
    if (!editingStepId || !editedStep.title?.trim()) {
      alert("タイトル、位置、時刻は必須です");
      return;
    }

    const originalStep = steps.find((s) => s.id === editingStepId);
    const start_at = originalStep?.start_at;

    if (onUpdateStep && start_at !== undefined) {
      await onUpdateStep(editingStepId, {
        title: editedStep.title.trim(),
        start_at,
        location: editedStep.location?.trim() || undefined,
        notes: editedStep.notes?.trim() || undefined,
      });
    }

    editingStepId = null;
    editedStep = {};
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
                <div class="minimal-step-time">{getStepTime(step)}</div>
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
