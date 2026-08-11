<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    HomeIcon,
    ViewIcon,
    EditIcon,
  } from "./icons/index.svelte";

  interface Props {
    hasEditPermission: boolean;
    canRequestEdit?: boolean;
    onEditModeToggle: () => void;
    onMoneyOpen: () => void;
    onPackingOpen: () => void;
    onViewModeClick?: () => void;
    onMenuClick?: () => void;
  }

  let {
    hasEditPermission,
    canRequestEdit = true,
    onEditModeToggle,
    onMoneyOpen,
    onPackingOpen,
    onViewModeClick,
    onMenuClick,
  }: Props = $props();

  const ModeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/></svg>`;
  const MenuIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>`;
</script>

<nav class="standard-bottom-nav" aria-label="フッターメニュー">
  <button
    class="standard-bottom-btn"
    title="ホーム"
    aria-label="ホーム"
    onclick={() => goto("/")}
  >
    {@html HomeIcon}
    <span>Home</span>
  </button>

  <button
    class="standard-bottom-btn"
    title="持ち物リスト"
    aria-label="持ち物リスト"
    onclick={onPackingOpen}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2V5a2 2 0 0 1 2-2Zm0 3h6V5H9v1Zm-2 5v2h10v-2H7Z"/></svg>
    <span>Packing</span>
  </button>

  <button
    class="standard-bottom-btn"
    title="お金の管理"
    aria-label="お金の管理"
    onclick={onMoneyOpen}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 16.93V20h-2v-1.07A4.1 4.1 0 0 1 7.8 15h2.05c.08.7.68 1.18 1.66 1.18.9 0 1.5-.38 1.5-.98 0-.54-.4-.82-1.75-1.12-1.87-.42-3.08-1.25-3.08-2.88 0-1.43 1.09-2.54 2.82-2.8V5h2v1.13A3.72 3.72 0 0 1 15.9 9h-2.02c-.1-.58-.6-.98-1.44-.98-.8 0-1.3.35-1.3.88 0 .5.42.78 1.77 1.1 1.88.43 3.05 1.3 3.05 2.94 0 1.5-1.17 2.68-2.96 2.99Z"/></svg>
    <span>Money</span>
  </button>

  <div class="standard-btn-wrapper">
    <button
      class="standard-bottom-btn"
      title="ビューモード選択"
      aria-label="ビューモード選択"
      onclick={onViewModeClick}
    >
      {@html ModeIcon}
      <span>Mode</span>
    </button>
  </div>

  {#if hasEditPermission}
    <button
      class="standard-bottom-btn"
      title="閲覧モードに切り替え"
      aria-label="閲覧モードに切り替え"
      onclick={onEditModeToggle}
    >
      {@html ViewIcon}
      <span>View</span>
    </button>
  {:else if canRequestEdit}
    <button
      class="standard-bottom-btn"
      title="編集モードに切り替え"
      aria-label="編集モードに切り替え"
      onclick={onEditModeToggle}
    >
      {@html EditIcon}
      <span>Edit</span>
    </button>
  {/if}

  <button
    class="standard-bottom-btn"
    title="メニュー"
    aria-label="メニュー"
    onclick={onMenuClick}
  >
    {@html MenuIcon}
    <span>Menu</span>
  </button>
</nav>
