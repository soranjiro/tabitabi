<script lang="ts">
  import PreviewCarouselComponent from "./preview-carousel/PreviewCarousel.svelte";
  export let previews;
  export let currentIndex;
  export let onSelect;
  export let onTryDemo;
</script>

<PreviewCarouselComponent {previews} {currentIndex} {onSelect} {onTryDemo} />
