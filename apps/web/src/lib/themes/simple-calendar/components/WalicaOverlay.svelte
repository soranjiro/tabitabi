<script lang="ts">
  interface Props {
    show: boolean;
    walicaId: string;
    onClose: () => void;
  }

  let { show, walicaId, onClose }: Props = $props();

  const walicaUrl = $derived(
    walicaId.startsWith("https://")
      ? walicaId
      : `https://walica.jp/group/${walicaId}`,
  );
</script>

{#if show && walicaId}
  <div class="simple-calendar-walica-overlay">
    <div class="simple-calendar-walica-header">
      <button onclick={onClose} class="simple-calendar-walica-close-btn">
        ✕ 閉じる
      </button>
      <span class="simple-calendar-walica-title"> Walica グループページ </span>
    </div>
    <iframe src={walicaUrl} title="Walica" class="simple-calendar-walica-frame"
    ></iframe>
  </div>
{/if}

<style>
  .simple-calendar-walica-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    display: flex;
    flex-direction: column;
    z-index: 2000;
  }

  .simple-calendar-walica-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e5e5;
    background: white;
    flex-shrink: 0;
  }

  .simple-calendar-walica-close-btn {
    padding: 6px 12px;
    border: 1px solid #d0d0d0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    transition: all 0.2s;
  }

  .simple-calendar-walica-close-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
    background: #f9fbff;
  }

  .simple-calendar-walica-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .simple-calendar-walica-frame {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
  }
</style>
