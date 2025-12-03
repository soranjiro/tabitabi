<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Documentation - たびたび</title>
</svelte:head>

{@html data.htmlContent}
