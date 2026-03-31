<script lang="ts">
  interface Props {
    show: boolean;
    stepData: {
      title: string;
      date: string;
      location: string;
      notes: string;
    };
    stepHour: string;
    stepMinute: string;
    onUpdate: (
      data: {
        title: string;
        date: string;
        location: string;
        notes: string;
      },
      hour: string,
      minute: string,
    ) => void;
    onClose: () => void;
  }

  let { show, stepData, stepHour, stepMinute, onUpdate, onClose }: Props =
    $props();
  let localData = $state({ ...stepData });
  let localHour = $state(stepHour);
  let localMinute = $state(stepMinute);

  $effect(() => {
    if (show) {
      localData = { ...stepData };
      localHour = stepHour;
      localMinute = stepMinute;
    }
  });
</script>

{#if show}
  <div class="add-step-form">
    <h3>新しい予定を追加</h3>

    <div class="form-group">
      <label for="add-step-title">タイトル *</label>
      <input
        id="add-step-title"
        type="text"
        bind:value={localData.title}
        placeholder="予定のタイトル"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="add-step-date">日付 *</label>
        <input id="add-step-date" type="date" bind:value={localData.date} />
      </div>
      <div class="form-group">
        <label for="add-step-hour">時刻 *</label>
        <div class="time-input">
          <input
            id="add-step-hour"
            type="text"
            bind:value={localHour}
            maxlength="2"
            placeholder="09"
          />
          <span>:</span>
          <input
            type="text"
            bind:value={localMinute}
            maxlength="2"
            placeholder="00"
          />
        </div>
      </div>
    </div>

    <div class="form-group">
      <label for="add-step-location">場所</label>
      <input
        id="add-step-location"
        type="text"
        bind:value={localData.location}
        placeholder="場所（オプション）"
      />
    </div>

    <div class="form-group">
      <label for="add-step-notes">メモ</label>
      <textarea
        id="add-step-notes"
        bind:value={localData.notes}
        placeholder="メモ（オプション）"
      ></textarea>
    </div>

    <div class="form-actions">
      <button
        class="btn-primary"
        onclick={() => {
          onUpdate(localData, localHour, localMinute);
        }}
      >
        追加
      </button>
      <button class="btn-secondary" onclick={onClose}> キャンセル </button>
    </div>
  </div>
{/if}

<style>
  .add-step-form {
    background: #f9fbff;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e0e7ff;
    margin-bottom: 12px;
  }

  .add-step-form h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .time-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .time-input input {
    width: 50px;
    text-align: center;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: white;
    color: #666;
    border: 1px solid #d0d0d0;
  }

  .btn-secondary:hover {
    border-color: #666;
    color: #333;
  }
</style>
