<script lang="ts">
  import { onMount } from "svelte";
  import {
    closeExternalSiteOverlay,
    externalSiteOverlay,
    isExternalUrl,
    openExternalSiteOverlay,
    toAbsoluteExternalUrl,
  } from "$lib/external-site-overlay";

  let frameKey = $state(0);
  let frameHasLoaded = $state(false);
  let frameLoadTimer: ReturnType<typeof setTimeout> | null = null;

  const currentUrl = $derived($externalSiteOverlay.url);
  const hostname = $derived(() => {
    try {
      return currentUrl ? new URL(currentUrl).hostname : "";
    } catch {
      return "";
    }
  });

  function clearFrameLoadTimer() {
    if (frameLoadTimer) {
      clearTimeout(frameLoadTimer);
      frameLoadTimer = null;
    }
  }

  $effect(() => {
    if (!$externalSiteOverlay.isOpen) {
      clearFrameLoadTimer();
      frameHasLoaded = false;
      return;
    }

    frameHasLoaded = false;
    clearFrameLoadTimer();
    frameLoadTimer = setTimeout(() => {
      frameHasLoaded = true;
    }, 4000);

    return clearFrameLoadTimer;
  });

  function reloadFrame() {
    frameKey += 1;
  }

  function handleFrameLoad() {
    frameHasLoaded = true;
    clearFrameLoadTimer();
  }

  function openInNewTab() {
    if (!$externalSiteOverlay.url) return;
    window.open($externalSiteOverlay.url, "_blank", "noopener,noreferrer");
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && $externalSiteOverlay.isOpen) {
      closeExternalSiteOverlay();
    }
  }

  function findExternalAnchor(
    target: EventTarget | null,
  ): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null;
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return null;
    return anchor;
  }

  function shouldOpenInOverlay(
    anchor: HTMLAnchorElement,
    event: MouseEvent,
  ): boolean {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (anchor.dataset.externalOverlay === "false") return false;
    if (anchor.hasAttribute("download")) return false;

    const href = anchor.getAttribute("href");
    if (!href) return false;

    return isExternalUrl(href);
  }

  function handleDocumentClick(event: MouseEvent) {
    const anchor = findExternalAnchor(event.target);
    if (!anchor || !shouldOpenInOverlay(anchor, event)) return;

    const url = toAbsoluteExternalUrl(anchor.href);
    if (!url) return;

    event.preventDefault();
    event.stopPropagation();
    openExternalSiteOverlay(url, {
      title: anchor.dataset.externalOverlayTitle || anchor.textContent?.trim() || undefined,
    });
  }

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleDocumentClick, {
        capture: true,
      });
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $externalSiteOverlay.isOpen}
  <div
    class="external-site-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="外部サイト"
  >
    <header class="external-site-overlay__header">
      <button
        type="button"
        class="external-site-overlay__close"
        onclick={closeExternalSiteOverlay}
        aria-label="外部サイトを閉じる"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
        <span>閉じる</span>
      </button>

      <div class="external-site-overlay__title-block">
        <p class="external-site-overlay__title">{$externalSiteOverlay.title}</p>
        <p class="external-site-overlay__url">
          {$externalSiteOverlay.subtitle ?? hostname()}
        </p>
      </div>

      <div class="external-site-overlay__actions" aria-label="外部サイト操作">
        {#each $externalSiteOverlay.actions as action}
          <button
            type="button"
            class:external-site-overlay__action--primary={action.variant === "primary"}
            class="external-site-overlay__action"
            onclick={() => action.onClick($externalSiteOverlay.url)}
          >
            {action.label}
          </button>
        {/each}
        <button
          type="button"
          class="external-site-overlay__icon-action"
          onclick={reloadFrame}
          aria-label="再読み込み"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h8V3z" />
          </svg>
        </button>
        <button
          type="button"
          class="external-site-overlay__icon-action"
          onclick={openInNewTab}
          aria-label="新しいタブで開く"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14zm3 16H5V7h6V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6h-2z" />
          </svg>
        </button>
      </div>
    </header>

    <div class="external-site-overlay__body">
      {#if !frameHasLoaded}
        <div class="external-site-overlay__loading" aria-live="polite">
          <span class="external-site-overlay__spinner" aria-hidden="true"></span>
          外部サイトを読み込んでいます…
        </div>
      {/if}
      {#key `${currentUrl}-${frameKey}`}
        <iframe
          src={currentUrl}
          title={$externalSiteOverlay.title}
          class="external-site-overlay__frame"
          referrerpolicy="no-referrer-when-downgrade"
          onload={handleFrameLoad}
        ></iframe>
      {/key}
    </div>
  </div>
{/if}

<style>
  .external-site-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    color: #172033;
  }

  .external-site-overlay__header {
    min-height: 64px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding: max(0.75rem, env(safe-area-inset-top)) 1rem 0.75rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 2px 18px rgba(15, 23, 42, 0.08);
  }

  .external-site-overlay__close,
  .external-site-overlay__action,
  .external-site-overlay__icon-action {
    border: 1px solid rgba(15, 23, 42, 0.14);
    background: #ffffff;
    color: #172033;
    cursor: pointer;
    font: inherit;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .external-site-overlay__close {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 40px;
    padding: 0 0.8rem;
    border-radius: 999px;
    font-weight: 700;
  }

  .external-site-overlay__close:hover,
  .external-site-overlay__action:hover,
  .external-site-overlay__icon-action:hover {
    background: #f8fafc;
    border-color: rgba(15, 23, 42, 0.24);
  }

  .external-site-overlay__close:active,
  .external-site-overlay__action:active,
  .external-site-overlay__icon-action:active {
    transform: translateY(1px);
  }

  .external-site-overlay__close svg {
    width: 18px;
    height: 18px;
  }

  .external-site-overlay__title-block {
    min-width: 0;
    text-align: center;
  }

  .external-site-overlay__title,
  .external-site-overlay__url {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .external-site-overlay__title {
    font-size: 0.98rem;
    font-weight: 800;
  }

  .external-site-overlay__url {
    margin-top: 0.15rem;
    color: #64748b;
    font-size: 0.8rem;
  }

  .external-site-overlay__actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    min-width: 0;
  }

  .external-site-overlay__action {
    min-height: 38px;
    padding: 0 0.8rem;
    border-radius: 999px;
    font-weight: 700;
  }

  .external-site-overlay__action--primary {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
  }

  .external-site-overlay__action--primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  .external-site-overlay__icon-action {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
  }

  .external-site-overlay__icon-action svg {
    width: 18px;
    height: 18px;
  }

  .external-site-overlay__body {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #f8fafc;
  }

  .external-site-overlay__frame {
    width: 100%;
    height: 100%;
    border: 0;
    background: #ffffff;
  }

  .external-site-overlay__loading {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    background: #ffffff;
    color: #475569;
    font-weight: 700;
    pointer-events: none;
  }

  .external-site-overlay__spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #dbeafe;
    border-top-color: #2563eb;
    border-radius: 999px;
    animation: external-site-overlay-spin 0.85s linear infinite;
  }

  @keyframes external-site-overlay-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .external-site-overlay__header {
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
      padding-inline: 0.65rem;
    }

    .external-site-overlay__close {
      width: 40px;
      padding: 0;
      justify-content: center;
    }

    .external-site-overlay__close span,
    .external-site-overlay__url {
      display: none;
    }

    .external-site-overlay__title-block {
      text-align: left;
    }

    .external-site-overlay__title {
      font-size: 0.9rem;
    }

    .external-site-overlay__action {
      min-height: 36px;
      padding: 0 0.65rem;
      font-size: 0.82rem;
    }

    .external-site-overlay__icon-action {
      width: 36px;
      height: 36px;
    }
  }
</style>
