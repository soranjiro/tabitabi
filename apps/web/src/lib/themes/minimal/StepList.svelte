<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
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

  let { steps, onUpdateStep, onDeleteStep }: Props = $props();

  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("09");
  let editStepMinute = $state("00");

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
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
    {#each steps as step}
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
          <div class="minimal-step-time">
            {formatDate(step.date)}
            {step.time}
          </div>
          <h2 class="minimal-step-title">{step.title}</h2>
          {#if step.location}
            <div class="minimal-step-location">📍 {step.location}</div>
          {/if}
          {#if step.notes}
            <div class="minimal-step-notes">{step.notes}</div>
          {/if}
          <div class="minimal-step-actions">
            <button
              onclick={() => startEdit(step)}
              class="minimal-btn minimal-btn-small">編集</button
            >
            <button
              onclick={() => handleDelete(step.id)}
              class="minimal-btn minimal-btn-small minimal-btn-danger"
              >削除</button
            >
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
