<script lang="ts">
  interface Props {
    newStep: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
    };
    newStepHour: string;
    newStepMinute: string;
    onSubmit: () => void;
    onCancel: () => void;
  }

  let {
    newStep = $bindable(),
    newStepHour = $bindable(),
    newStepMinute = $bindable(),
    onSubmit,
    onCancel,
  }: Props = $props();

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit();
  }
</script>

<form class="ai-card ai-form" onsubmit={handleSubmit}>
  <h3 class="ai-form-title">✨ 新しい予定</h3>

  <div class="ai-form-grid">
    <input
      type="text"
      bind:value={newStep.title}
      placeholder="予定のタイトル"
      class="ai-input"
      required
    />

    <div class="ai-datetime-row">
      <input type="date" bind:value={newStep.date} class="ai-input" required />
      <div class="ai-time-picker">
        <select bind:value={newStepHour} class="ai-time-select" required>
          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
            <option value={hour}>{hour}</option>
          {/each}
        </select>
        <span class="ai-time-sep">:</span>
        <select bind:value={newStepMinute} class="ai-time-select" required>
          {#each ["00", "15", "30", "45"] as minute}
            <option value={minute}>{minute}</option>
          {/each}
        </select>
      </div>
    </div>

    <input
      type="text"
      bind:value={newStep.location}
      placeholder="📍 場所（任意）"
      class="ai-input"
    />

    <textarea
      bind:value={newStep.notes}
      placeholder="📝 メモ（任意）Markdown対応"
      class="ai-textarea"
      rows="3"
    ></textarea>
  </div>

  <div class="ai-form-actions">
    <button type="submit" class="ai-btn ai-btn-primary"> 追加 </button>
    <button type="button" class="ai-btn ai-btn-secondary" onclick={onCancel}>
      キャンセル
    </button>
  </div>
</form>
