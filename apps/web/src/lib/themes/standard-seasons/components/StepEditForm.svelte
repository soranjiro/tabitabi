<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    step: Step | null;
    onSave: (stepId: string | null, data: { title: string; date: string; time: string; location?: string; notes?: string }) => Promise<void>;
    onClose: () => void;
  }

  let { show, step, onSave, onClose }: Props = $props();

  let title = $state('');
  let date = $state('');
  let hour = $state('09');
  let minute = $state('00');
  let location = $state('');
  let notes = $state('');

  $effect(() => {
    if (step) {
      title = step.title;
      date = step.date;
      const [h, m] = step.time.split(':');
      hour = h;
      minute = m;
      location = step.location ?? '';
      notes = step.notes ? (JSON.parse(step.notes)?.text ?? '') : '';
    } else {
      title = '';
      date = '';
      hour = '09';
      minute = '00';
      location = '';
      notes = '';
    }
  });

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  async function handleSubmit() {
    if (!title.trim() || !date || !hour || !minute) {
      alert('タイトル、日付、時刻は必須です');
      return;
    }
    const notesJson = notes.trim() ? JSON.stringify({ text: notes.trim() }) : undefined;
    await onSave(step?.id ?? null, {
      title: title.trim(),
      date,
      time: `${hour}:${minute}`,
      location: location.trim() || undefined,
      notes: notesJson,
    });
    onClose();
  }
</script>

<Dialog {show} title={step ? '予定を編集' : '予定を追加'} {onClose}>
  {#snippet children()}
    <div class="ss-form">
      <div class="ss-form-field">
        <label class="ss-label">タイトル <span class="ss-required">*</span></label>
        <input type="text" bind:value={title} placeholder="予定のタイトル" class="ss-input" required />
      </div>
      <div class="ss-form-field">
        <label class="ss-label">日付 <span class="ss-required">*</span></label>
        <input type="date" bind:value={date} class="ss-input" required />
      </div>
      <div class="ss-form-field">
        <label class="ss-label">時刻 <span class="ss-required">*</span></label>
        <div class="ss-time-row">
          <select bind:value={hour} class="ss-select">
            {#each hours as h}
              <option value={h}>{h}</option>
            {/each}
          </select>
          <span class="ss-time-sep">:</span>
          <select bind:value={minute} class="ss-select">
            {#each minutes as m}
              <option value={m}>{m}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="ss-form-field">
        <label class="ss-label">場所</label>
        <input type="text" bind:value={location} placeholder="場所（任意）" class="ss-input" />
      </div>
      <div class="ss-form-field">
        <label class="ss-label">メモ</label>
        <textarea bind:value={notes} placeholder="メモ（任意）" class="ss-textarea" rows={3}></textarea>
      </div>
    </div>
  {/snippet}
  {#snippet actions()}
    <button onclick={handleSubmit} class="ss-btn ss-btn-primary">保存</button>
    <button onclick={onClose} class="ss-btn ss-btn-secondary">キャンセル</button>
  {/snippet}
</Dialog>
