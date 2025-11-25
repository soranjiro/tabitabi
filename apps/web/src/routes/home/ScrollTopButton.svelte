<script lang="ts">
  import { IconAirplane } from "./icons";

  interface Props {
    visible: boolean;
    onclick: () => void;
  }

  let { visible, onclick }: Props = $props();
</script>

{#if visible}
  <button {onclick} class="scroll-top-btn">
    <IconAirplane size={36} />
    <svg
      width="44"
      height="12"
      viewBox="0 0 44 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style="margin-top: -4px;"
    >
      <line
        x1="11"
        y1="2"
        x2="11"
        y2="40"
        stroke="#b5daf8"
        stroke-width="2"
      />
      <line
        x1="21"
        y1="2"
        x2="21"
        y2="10"
        stroke="#b5daf8"
        stroke-width="2"
      />
      <line
        x1="31"
        y1="2"
        x2="31"
        y2="40"
        stroke="#b5daf8"
        stroke-width="2"
      />
    </svg>
  </button>
{/if}

<style>
  .scroll-top-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    bottom: 0.5rem;
    right: 0rem;
    color: #5d8bff;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    z-index: 100;
    animation: fadeIn 0.3s ease;
  }

  .scroll-top-btn:hover {
    transform: translateY(-4px);
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
