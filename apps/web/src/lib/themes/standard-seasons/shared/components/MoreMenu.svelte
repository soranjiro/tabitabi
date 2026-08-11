<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    canConfigure: boolean;
    onShare: () => void;
    onPrint: () => void;
    onSettings: () => void;
    onClose: () => void;
  }

  let { show, canConfigure, onShare, onPrint, onSettings, onClose }: Props = $props();

  function choose(action: () => void) {
    onClose();
    action();
  }
</script>

<Dialog {show} title="メニュー" {onClose}>
  {#snippet children()}
    <div class="standard-more-menu" aria-label="しおりのメニュー">
      <button class="standard-more-menu-item" onclick={() => choose(onShare)}>
        <span class="standard-more-menu-icon" aria-hidden="true">↗</span>
        <span><strong>共有</strong><small>リンクをコピーして、旅の仲間に送る</small></span>
      </button>
      <button class="standard-more-menu-item" onclick={() => choose(onPrint)}>
        <span class="standard-more-menu-icon" aria-hidden="true">▣</span>
        <span><strong>印刷・PDF出力</strong><small>しおりを紙やPDFで持ち歩く</small></span>
      </button>
      {#if canConfigure}
        <button class="standard-more-menu-item" onclick={() => choose(onSettings)}>
          <span class="standard-more-menu-icon" aria-hidden="true">⚙</span>
          <span><strong>しおり設定</strong><small>旅行メンバー・テーマ・初期表示</small></span>
        </button>
      {/if}
    </div>
  {/snippet}
</Dialog>
