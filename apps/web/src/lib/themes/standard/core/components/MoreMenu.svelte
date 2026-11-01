<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    canConfigure: boolean;
    canRequestEdit: boolean;
    hasEditPermission: boolean;
    onShare: () => void;
    onPrint: () => void;
    onPlanWithChatGpt?: () => void;
    onSettings: () => void;
    onEditModeToggle: () => void;
    onClose: () => void;
  }

  let { show, canConfigure, canRequestEdit, hasEditPermission, onShare, onPrint, onPlanWithChatGpt, onSettings, onEditModeToggle, onClose }: Props = $props();

  function choose(action: () => void) {
    onClose();
    action();
  }
</script>

<Dialog {show} title="メニュー" {onClose}>
  {#snippet children()}
    <div class="standard-more-menu" aria-label="しおりのメニュー">
      {#if onPlanWithChatGpt}
        <button class="standard-more-menu-item" onclick={() => choose(onPlanWithChatGpt)}>
          <span class="standard-more-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></svg>
          </span>
          <span><strong>ChatGPTで考える</strong><small>このしおりの予定を相談・編集する</small></span>
        </button>
      {/if}
      <button class="standard-more-menu-item" onclick={() => choose(onShare)}>
        <span class="standard-more-menu-icon" aria-hidden="true">↗</span>
        <span><strong>共有</strong><small>リンクをコピーして、旅の仲間に送る</small></span>
      </button>
      <button class="standard-more-menu-item" onclick={() => choose(onPrint)}>
        <span class="standard-more-menu-icon" aria-hidden="true">▣</span>
        <span><strong>印刷・PDF出力</strong><small>しおりを紙やPDFで持ち歩く</small></span>
      </button>
      {#if hasEditPermission || canRequestEdit}
        <button class="standard-more-menu-item" onclick={() => choose(onEditModeToggle)}>
          <span class="standard-more-menu-icon" aria-hidden="true">{hasEditPermission ? '◉' : '✎'}</span>
          <span>
            <strong>{hasEditPermission ? '閲覧モードに切り替え' : '編集モードに切り替え'}</strong>
            <small>{hasEditPermission ? '操作ボタンを隠して、しおりを見る' : '予定や持ち物を編集する'}</small>
          </span>
        </button>
      {/if}
      {#if canConfigure}
        <button class="standard-more-menu-item" onclick={() => choose(onSettings)}>
          <span class="standard-more-menu-icon" aria-hidden="true">⚙</span>
          <span><strong>しおり設定</strong><small>デザイン・色・旅行メンバーを設定する</small></span>
        </button>
      {/if}
    </div>
  {/snippet}
</Dialog>
