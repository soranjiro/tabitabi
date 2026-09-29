<script lang="ts">
  import { onMount } from "svelte";

  let { placement }: { placement: "home" | "shared" } = $props();

  const clientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID ?? "").trim();
  const selectedSlotId =
    placement === "home"
      ? import.meta.env.VITE_ADSENSE_HOME_SLOT_ID
      : import.meta.env.VITE_ADSENSE_SHARED_SLOT_ID;
  const slotId = (selectedSlotId ?? "").trim();
  const preview = import.meta.env.DEV || import.meta.env.VITE_AD_PREVIEW === "true";
  const enabled = !preview && clientId.length > 0 && slotId.length > 0;

  function requestAd() {
    try {
      const adsWindow = window as Window & { adsbygoogle?: Record<string, unknown>[] };
      (adsWindow.adsbygoogle ??= []).push({});
    } catch (error) {
      console.warn("AdSense slot could not be initialized", error);
    }
  }

  onMount(() => {
    if (!enabled) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-tabitabi-adsense]",
    );

    if (existingScript) {
      if ((window as Window & { adsbygoogle?: unknown }).adsbygoogle) {
        requestAd();
      } else {
        existingScript.addEventListener("load", requestAd, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src =
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    script.dataset.tabitabiAdsense = "true";
    script.addEventListener("load", requestAd, { once: true });
    document.head.appendChild(script);
  });
</script>

{#if preview || enabled}
  <aside class="ad-slot" aria-label="広告">
    <span class="ad-label">広告</span>
    <div class="ad-frame">
      {#if preview}
        <div class="ad-preview" aria-label="Google 広告枠のプレビュー">
          <strong>Google 広告スペース</strong>
          <small>本番ではここに広告が表示されます</small>
        </div>
      {:else}
        <ins
          class="adsbygoogle"
          style="display:block;width:100%;height:100%"
          data-ad-client={clientId}
          data-ad-slot={slotId}
        ></ins>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .ad-slot {
    width: min(100%, 760px);
    margin: 0 auto;
    color: #7c8796;
    font-family:
      -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic",
      sans-serif;
  }

  .ad-label {
    display: block;
    margin: 0 0 7px;
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .ad-frame {
    width: min(100%, 728px);
    height: 90px;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 10px;
  }

  .ad-preview {
    display: flex;
    height: 100%;
    border: 1px dashed #cbd3dc;
    border-radius: inherit;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 4px;
    background: rgba(247, 249, 251, 0.92);
    text-align: center;
  }

  .ad-preview strong {
    color: #6b7788;
    font-size: 12px;
    font-weight: 650;
  }

  .ad-preview small {
    color: #9aa4b1;
    font-size: 9px;
  }

  @media (min-width: 521px) and (max-width: 760px) {
    .ad-frame {
      width: min(100%, 468px);
      height: 60px;
    }

    .ad-preview small {
      display: none;
    }
  }

  @media (max-width: 520px) {
    .ad-slot {
      width: 100%;
    }

    .ad-frame {
      width: min(100%, 320px);
      height: 100px;
      border-radius: 8px;
    }
  }
</style>
