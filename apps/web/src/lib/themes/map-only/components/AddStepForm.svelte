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
    isEditing?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
  }

  let {
    newStep = $bindable(),
    newStepHour = $bindable(),
    newStepMinute = $bindable(),
    isEditing = false,
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

<form class="map-theme-form" onsubmit={handleSubmit}>
  <h3 class="text-xl font-bold mb-4">
    {isEditing ? "予定を編集" : "新しい予定を追加"}
  </h3>

  <div class="map-form-group">
    <input
      type="text"
      bind:value={newStep.title}
      placeholder="タイトル *"
      class="map-input"
      required
    />
  </div>

  <div class="map-form-group flex gap-2">
    <input
      type="date"
      bind:value={newStep.date}
      class="map-input flex-1"
      required
    />
    <div
      class="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-2"
    >
      <select
        bind:value={newStepHour}
        class="bg-transparent text-lg outline-none"
      >
        {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
          <option value={hour}>{hour}</option>
        {/each}
      </select>
      <span>:</span>
      <select
        bind:value={newStepMinute}
        class="bg-transparent text-lg outline-none"
      >
        <option value="00">00</option>
        <option value="15">15</option>
        <option value="30">30</option>
        <option value="45">45</option>
      </select>
    </div>
  </div>

  <div class="map-form-group">
    <input
      type="text"
      bind:value={newStep.location}
      placeholder="場所 (Google Mapsで検索されます)"
      class="map-input"
    />
  </div>

  <div class="map-form-group">
    <textarea
      bind:value={newStep.notes}
      placeholder="メモ"
      class="map-input"
      rows="3"
    ></textarea>
  </div>

  <div class="mt-6">
    <button type="submit" class="map-btn map-btn-primary">
      {isEditing ? "保存する" : "追加する"}
    </button>
    <button type="button" onclick={onCancel} class="map-btn map-btn-secondary">
      キャンセル
    </button>
  </div>
</form>
