<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    canConfigure: boolean;
    canRequestEdit: boolean;
    canPublish: boolean;
    hasEditPermission: boolean;
    onMoney: () => void;
    onShare: () => void;
    onPrint: () => void;
    onPublish: () => void;
    onSettings: () => void;
    onEditModeToggle: () => void;
    onClose: () => void;
  }

  let { show, canConfigure, canRequestEdit, canPublish, hasEditPermission, onMoney, onShare, onPrint, onPublish, onSettings, onEditModeToggle, onClose }: Props = $props();

  function choose(action: () => void) {
    onClose();
    action();
  }
</script>

<Dialog {show} title="メニュー" {onClose}>
  {#snippet children()}
    <div class="standard-more-menu" aria-label="しおりのメニュー">
      <button class="standard-more-menu-item" onclick={() => choose(onMoney)}>
        <span class="standard-more-menu-icon" aria-hidden="true">¥</span>
        <span><strong>お金の管理</strong><small>予算・支出・精算を確認する</small></span>
      </button>
      <button class="standard-more-menu-item" onclick={() => choose(onShare)}>
        <span class="standard-more-menu-icon" aria-hidden="true">↗</span>
        <span><strong>共有</strong><small>リンクをコピーして、旅の仲間に送る</small></span>
      </button>
      <button class="standard-more-menu-item" onclick={() => choose(onPrint)}>
        <span class="standard-more-menu-icon" aria-hidden="true">▣</span>
        <span><strong>印刷・PDF出力</strong><small>しおりを紙やPDFで持ち歩く</small></span>
      </button>
      {#if canPublish}
        <button class="standard-more-menu-item" onclick={() => choose(onPublish)}>
          <span class="standard-more-menu-icon" aria-hidden="true">◎</span>
          <span><strong>みんなのしおりに公開</strong><small>旅行先を設定して公開ページに掲載する</small></span>
        </button>
      {/if}
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
          <span><strong>しおり設定</strong><small>旅行メンバー・テーマ・初期表示</small></span>
        </button>
      {/if}
    </div>
  {/snippet}
</Dialog>
