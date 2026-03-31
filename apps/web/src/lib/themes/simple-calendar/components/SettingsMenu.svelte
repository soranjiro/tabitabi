<script lang="ts">
  interface Props {
    show: boolean;
    onCopyShareUrl: () => void;
    onCopyEditUrl?: () => void;
    onChangeTheme?: () => void;
    onEditMemo?: () => void;
    onPrint: () => void;
    hasEditPermission: boolean;
  }

  let {
    show,
    onCopyShareUrl,
    onCopyEditUrl,
    onChangeTheme,
    onEditMemo,
    onPrint,
    hasEditPermission,
  }: Props = $props();
</script>

{#if show}
  <div class="settings-menu">
    <button onclick={onCopyShareUrl}>閲覧URLをコピー</button>
    {#if hasEditPermission}
      {#if onCopyEditUrl}
        <button onclick={onCopyEditUrl}>編集URLをコピー</button>
      {/if}
      {#if onChangeTheme}
        <button onclick={onChangeTheme}>テーマを変更</button>
      {/if}
      {#if onEditMemo}
        <button onclick={onEditMemo}>メモを編集</button>
      {/if}
    {/if}
    <button onclick={onPrint}>印刷</button>
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
