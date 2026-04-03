<script lang="ts">
  interface Props {
    newStep: {
      title: string;
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

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit();
  }
</script>

<form class="add-step-form" onsubmit={handleSubmit}>
  <div class="form-header">
    <span class="form-icon">✨</span>
    <h3 class="form-title">新しい予定を追加</h3>
  </div>

  <div class="form-grid">
    <div class="form-field">
      <label class="form-label" for="step-title"
        >タイトル <span class="required">*</span></label
      >
      <input
        id="step-title"
        type="text"
        bind:value={newStep.title}
        placeholder="例: 東京タワー観光"
        class="form-input"
        required
      />
    </div>

    <div class="form-field">
      <span class="form-label">時刻 <span class="required">*</span></span>
      <div class="time-picker">
        <select
          bind:value={newStepHour}
          class="time-select"
          required
          aria-label="時"
        >
          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
            <option value={hour}>{hour}</option>
          {/each}
        </select>
        <span class="time-sep">:</span>
        <select
          bind:value={newStepMinute}
          class="time-select"
          required
          aria-label="分"
        >
          {#each ["00", "15", "30", "45"] as minute}
            <option value={minute}>{minute}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-field">
      <label class="form-label" for="step-location">
        <span class="label-icon">📍</span> 場所
      </label>
      <input
        id="step-location"
        type="text"
        bind:value={newStep.location}
        placeholder="例: 東京都港区芝公園4-2-8"
        class="form-input"
      />
    </div>

    <div class="form-field">
      <label class="form-label" for="step-notes">
        <span class="label-icon">📝</span> メモ
        <span class="label-hint">Markdown対応</span>
      </label>
      <textarea
        id="step-notes"
        bind:value={newStep.notes}
        placeholder="詳細やリンクをメモ..."
        class="form-textarea"
        rows="3"
      ></textarea>
    </div>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      予定を追加
    </button>
    <button type="button" class="btn btn-secondary" onclick={onCancel}>
      キャンセル
    </button>
  </div>
</form>
