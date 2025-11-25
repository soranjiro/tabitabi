<script lang="ts">
  interface Props {
    size?: number;
  }

  let { size = 24 }: Props = $props();
</script>

<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  width={size}
  height={size}
>
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
</svg>
