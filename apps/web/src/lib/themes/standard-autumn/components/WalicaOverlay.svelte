<script lang="ts">
  import { CloseIcon } from "./icons/index.svelte";

  interface Props {
    show: boolean;
    walicaId: string;
    onClose: () => void;
  }

  let { show, walicaId, onClose }: Props = $props();
</script>

{#if show && walicaId}
  <div class="standard-autumn-walica-overlay">
    <div class="standard-autumn-walica-header">
      <button onclick={onClose} class="standard-autumn-walica-close-btn">
        {@html CloseIcon}
        閉じる
      </button>

      <span class="standard-autumn-walica-title">
        外部サイト:
        <a
          href="https://walica.jp"
          target="_blank"
          rel="noopener noreferrer"
          class="standard-autumn-walica-link"
        >
          walica.jp
        </a>
      </span>
    </div>
    <iframe
      src={`https://walica.jp/group/${walicaId}`}
      title="Walica"
      class="standard-autumn-walica-frame"
    ></iframe>
  </div>
{/if}
