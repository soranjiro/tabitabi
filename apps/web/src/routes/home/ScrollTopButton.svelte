<script lang="ts">
  interface Props {
    visible: boolean;
    onclick: () => void;
  }

  let { visible, onclick }: Props = $props();
</script>

{#if visible}
  <button {onclick} class="scroll-top-btn">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      width="20"
      height="20"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
    トップへ戻る
  </button>
{/if}

<style>
  .scroll-top-btn {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: linear-gradient(135deg, #6b8cce, #8b7dc9);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(107, 140, 206, 0.4);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 100;
    animation: fadeIn 0.3s ease;
  }

  .scroll-top-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(107, 140, 206, 0.5);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
