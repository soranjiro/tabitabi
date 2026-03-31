<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    show: boolean;
    onCopyShareUrl: () => void;
    onCopyEditUrl?: () => void;
    onChangeTheme?: () => void;
    onEditMemo?: () => void;
    onPrint: () => void;
    hasEditPermission: boolean;
    onClose?: () => void;
  }

  let {
    show,
    onCopyShareUrl,
    onCopyEditUrl,
    onChangeTheme,
    onEditMemo,
    onPrint,
    hasEditPermission,
    onClose,
  }: Props = $props();

  let menuElement = $state<HTMLDivElement | undefined>(undefined);

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      if (show && menuElement && !menuElement.contains(e.target as Node)) {
        // Check if click is on the menu button itself
        const menuBtn = document.querySelector(".menu-btn");
        if (menuBtn && !menuBtn.contains(e.target as Node)) {
          onClose?.();
        }
      }
    }

    if (show) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });
</script>

{#if show}
  <div bind:this={menuElement} class="settings-menu">
    <button
      onclick={() => {
        onCopyShareUrl();
        onClose?.();
      }}
    >
      閲覧URLをコピー
    </button>
    {#if hasEditPermission}
      {#if onCopyEditUrl}
        <button
          onclick={() => {
            onCopyEditUrl();
            onClose?.();
          }}
        >
          編集URLをコピー
        </button>
      {/if}
      {#if onChangeTheme}
        <button
          onclick={() => {
            onChangeTheme();
            onClose?.();
          }}
        >
          テーマを変更
        </button>
      {/if}
      {#if onEditMemo}
        <button
          onclick={() => {
            onEditMemo();
            onClose?.();
          }}
        >
          メモを編集
        </button>
      {/if}
    {/if}
    <button
      onclick={() => {
        onPrint();
        onClose?.();
      }}
    >
      印刷
    </button>
  </div>
{/if}

<style>
  .settings-menu {
    position: absolute;
    right: 16px;
    top: 44px;
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    min-width: 180px;
    overflow: hidden;
  }

  .settings-menu button {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: #333;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .settings-menu button:hover {
    background: #f5f5f5;
  }

  .settings-menu button:first-child {
    border-radius: 8px 8px 0 0;
  }

  .settings-menu button:last-child {
    border-radius: 0 0 8px 8px;
  }
</style>
