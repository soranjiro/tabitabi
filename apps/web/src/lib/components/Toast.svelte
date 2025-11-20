<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    message: string;
    type?: 'success' | 'error';
    duration?: number;
    onClose?: () => void;
  }

  let { message, type = 'success', duration = 3000, onClose }: Props = $props();

  let visible = $state(true);

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      if (onClose) {
        setTimeout(onClose, 300); // Wait for fade out animation
      }
    }, duration);

    return () => clearTimeout(timer);
  });
</script>

<style>
  .toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.875rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 0;
    animation: slideIn 0.3s ease forwards;
    max-width: 90vw;
  }

  .toast.visible {
    opacity: 1;
  }

  .toast.hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }

  .toast.success {
    background: #10b981;
    color: white;
  }

  .toast.error {
    background: #ef4444;
    color: white;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (max-width: 640px) {
    .toast {
      bottom: 1rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.8125rem;
    }
  }
</style>

{#if visible}
  <div class="toast {type} {visible ? 'visible' : 'hidden'}" role="alert">
    {message}
  </div>
{/if}
