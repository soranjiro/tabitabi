<script lang="ts">
  import Dialog from "$lib/themes/standard/core/components/Dialog.svelte";
  import ItineraryMetadataFields from "$lib/features/itinerary-metadata/ItineraryMetadataFields.svelte";

  interface Props {
    show: boolean;
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
    onSave: (metadata: { prefectureSlugs: string[]; areas: string[]; tags: string[] }) => Promise<void>;
    onClose: () => void;
  }

  let { show, prefectureSlugs, areas, tags, onSave, onClose }: Props = $props();
  let localPrefectures = $state<string[]>([]);
  let localAreas = $state<string[]>([]);
  let localTags = $state<string[]>([]);
  let saving = $state(false);

  $effect(() => {
    if (show) {
      localPrefectures = [...prefectureSlugs];
      localAreas = [...areas];
      localTags = [...tags];
    }
  });

  async function save() {
    if (saving) return;
    saving = true;
    try {
      await onSave({ prefectureSlugs: localPrefectures, areas: localAreas, tags: localTags });
    } finally {
      saving = false;
    }
  }
</script>

<Dialog {show} title="旅行先とタグを設定" {onClose}>
  <p class="metadata-intro">このしおりの旅行先やタグを設定すると、あとから探しやすくなります。空のまま閉じることもできます。</p>
  <ItineraryMetadataFields bind:selectedPrefectures={localPrefectures} bind:areas={localAreas} bind:tags={localTags} />
  <div class="metadata-actions"><button type="button" class="secondary" onclick={onClose}>今はしない</button><button type="button" class="primary" onclick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
</Dialog>

<style>
  .metadata-intro { margin: 0 0 1rem; color: var(--theme-text-light); font-size: .78rem; line-height: 1.65; }
  .metadata-actions { display: flex; margin-top: 1.2rem; justify-content: flex-end; gap: .55rem; }
  .metadata-actions button { border: 0; border-radius: .7rem; padding: .7rem 1rem; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
  .metadata-actions .secondary { color: var(--theme-text-light); background: transparent; }
  .metadata-actions .primary { color: white; background: var(--theme-primary); }
  .metadata-actions button:disabled { opacity: .55; cursor: wait; }
</style>
