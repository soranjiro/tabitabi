<script lang="ts">
  import { CloseIcon } from "./icons/index.svelte";

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
  <div class="standard-walica-overlay">
    <div class="standard-walica-header">
      <button onclick={onClose} class="standard-walica-close-btn">
        {@html CloseIcon}
        閉じる
      </button>

      <span class="standard-walica-title">
        外部サイト:
        <a
          href="https://walica.jp"
          target="_blank"
          rel="noopener noreferrer"
          class="standard-walica-link"
        >
          walica.jp
        </a>
      </span>
    </div>
    <iframe src={walicaUrl} title="Walica" class="standard-walica-frame"
    ></iframe>
  </div>
{/if}
