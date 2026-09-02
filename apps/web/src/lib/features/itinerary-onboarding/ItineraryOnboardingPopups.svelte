<script lang="ts">
  import MetadataOnboardingDialog from "./MetadataOnboardingDialog.svelte";

  interface Props {
    showMetadata: boolean;
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
    onSaveMetadata: (metadata: { prefectureSlugs: string[]; areas: string[]; tags: string[] }) => Promise<void>;
    onCloseMetadata: () => void;
  }

  let {
    showMetadata,
    prefectureSlugs,
    areas,
    tags,
    onSaveMetadata,
    onCloseMetadata,
  }: Props = $props();
</script>

<!-- 作成後の案内ポップアップはこのファイルに集約する。 -->
<MetadataOnboardingDialog
  show={showMetadata}
  {prefectureSlugs}
  {areas}
  {tags}
  onSave={onSaveMetadata}
  onClose={onCloseMetadata}
/>
