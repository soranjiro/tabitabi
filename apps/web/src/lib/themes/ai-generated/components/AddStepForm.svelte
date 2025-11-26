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

    <div class="form-row">
      <div class="form-field">
        <label class="form-label" for="step-date"
          >日付 <span class="required">*</span></label
        >
        <input
          id="step-date"
          type="date"
          bind:value={newStep.date}
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

<style>
  .add-step-form {
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-lg);
    padding: 1.5rem;
    animation: formSlideIn 0.3s ease;
  }

  @keyframes formSlideIn {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .form-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ai-border);
  }

  .form-icon {
    font-size: 1.25rem;
  }

  .form-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--ai-text-secondary);
  }

  .label-icon {
    font-size: 0.875rem;
  }

  .label-hint {
    font-size: 0.6875rem;
    font-weight: 400;
    color: var(--ai-text-muted);
    margin-left: auto;
    background: rgba(14, 165, 233, 0.08);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  .required {
    color: var(--ai-accent);
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.9375rem;
    font-family: inherit;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    transition: border-color 0.2s ease;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .form-input::placeholder,
  .form-textarea::placeholder {
    color: var(--ai-text-muted);
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .time-picker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .time-select {
    flex: 1;
    padding: 0.75rem 0.5rem;
    font-size: 0.9375rem;
    font-family: inherit;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .time-select:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .time-sep {
    color: var(--ai-text-muted);
    font-weight: 600;
    font-size: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--ai-border);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.9375rem;
    font-weight: 500;
    font-family: inherit;
    border-radius: var(--ai-radius-md);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    flex: 1;
    background: var(--ai-accent);
    color: white;
  }

  .btn-primary:hover {
    background: var(--ai-accent-dark);
  }

  .btn-secondary {
    background: var(--ai-surface-hover);
    color: var(--ai-text-secondary);
  }

  .btn-secondary:hover {
    background: var(--ai-border);
    color: var(--ai-text-primary);
  }

  @media (max-width: 480px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
