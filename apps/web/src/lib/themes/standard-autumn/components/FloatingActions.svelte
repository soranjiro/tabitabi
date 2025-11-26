<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    hasEditPermission: boolean;
    onAddStep: () => void;
  }

  let { hasEditPermission, onAddStep }: Props = $props();

  let showFloating = $state(false);
  let scrollThreshold = 200;

  function handleScroll() {
    showFloating = window.scrollY > scrollThreshold;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAddStep() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      onAddStep();
    }, 300);
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
</script>

{#if showFloating}
  <div class="standard-autumn-floating-actions">
    {#if hasEditPermission}
      <button
        type="button"
        class="standard-autumn-fab standard-autumn-fab-add"
        onclick={handleAddStep}
        aria-label="予定を追加"
        title="予定を追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    {/if}
    <button
      type="button"
      class="standard-autumn-fab standard-autumn-fab-top"
      onclick={scrollToTop}
      aria-label="TOPに戻る"
      title="TOPに戻る"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
      </svg>
    </button>
  </div>
{/if}
