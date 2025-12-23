<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { formatDateFull, getIconCategory } from "../utils/layout";
  import { getMemoText } from "$lib/memo";

  interface Props {
    step: Step | null;
    hasEditPermission?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
  }

  let { step, hasEditPermission = false, onEdit, onDelete }: Props = $props();

  const iconCategory = $derived(step ? getIconCategory(step) : "pin");

  const isCompleted = $derived(() => {
    if (!step) return false;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return (
      step.date < today || (step.date === today && step.time <= currentTime)
    );
  });
</script>

<div class="detail-panel">
  {#if step}
    <div class="pq-dialog-box">
      <div class="dialog-corner dialog-corner-tl"></div>
      <div class="dialog-corner dialog-corner-tr"></div>
      <div class="dialog-corner dialog-corner-bl"></div>
      <div class="dialog-corner dialog-corner-br"></div>
      <div class="dialog-border-top"></div>
      <div class="dialog-border-left"></div>
      <div class="dialog-border-right"></div>
      <div class="dialog-border-bottom"></div>

      <div class="detail-header">
        <div class="detail-icon" class:completed={isCompleted()}>
          <div class="pq-icon pq-icon-{iconCategory}"></div>
          {#if isCompleted()}
            <div class="completed-badge">✓</div>
          {/if}
        </div>
        <div class="detail-title-area">
          <div class="title-row">
            <h3 class="pq-dialog-title">{step.title}</h3>
            <span class="quest-status" class:completed={isCompleted()}>
              {isCompleted() ? "CLEARED" : "ACTIVE"}
            </span>
          </div>
          <div class="detail-meta">
            <span class="detail-date">{formatDateFull(step.date)}</span>
            <span class="detail-time">{step.time}</span>
          </div>
        </div>
      </div>

      <div class="pq-dialog-content">
        {#if step.location}
          <div class="pq-dialog-location">
            <span class="arrow-icon">&gt;</span>
            {step.location}
          </div>
        {/if}

        {#if getMemoText(step.notes)}
          <div class="pq-dialog-notes">
            <div class="notes-text">{getMemoText(step.notes)}</div>
          </div>
        {/if}
      </div>

      {#if hasEditPermission}
        <div class="pq-dialog-actions">
          <button class="pq-btn pq-btn-pixel" onclick={onEdit}>EDIT</button>
          <button class="pq-btn pq-btn-pixel pq-btn-danger" onclick={onDelete}
            >DELETE</button
          >
        </div>
      {/if}

      <div class="dialog-continue">
        <span class="blink-arrow">▼</span>
      </div>
    </div>
  {:else}
    <div class="detail-empty">
      <div class="empty-icon">
        <div class="pq-icon pq-icon-flag"></div>
      </div>
      <p class="empty-text">SELECT A SPOT</p>
      <div class="empty-hint">
        <span class="blink-cursor">_</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .detail-panel {
    background: var(--pq-bg-dark);
    border-top: 4px solid var(--pq-border-outer);
    padding: 12px;
    min-height: 140px;
    image-rendering: pixelated;
  }

  .pq-dialog-box {
    background: linear-gradient(180deg, var(--pq-bg-medium) 0%, #3d2a1c 100%);
    border: 4px solid var(--pq-border-inner);
    padding: 16px;
    position: relative;
    box-shadow:
      inset 2px 2px 0 rgba(255, 255, 255, 0.1),
      inset -2px -2px 0 rgba(0, 0, 0, 0.2),
      6px 6px 0 var(--pq-border-outer);
  }

  .dialog-corner {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--pq-ui-gold);
    z-index: 2;
  }

  .dialog-corner-tl {
    top: -4px;
    left: -4px;
  }
  .dialog-corner-tr {
    top: -4px;
    right: -4px;
  }
  .dialog-corner-bl {
    bottom: -4px;
    left: -4px;
  }
  .dialog-corner-br {
    bottom: -4px;
    right: -4px;
  }

  .dialog-border-top,
  .dialog-border-bottom,
  .dialog-border-left,
  .dialog-border-right {
    position: absolute;
    background: var(--pq-ui-gold);
  }

  .dialog-border-top,
  .dialog-border-bottom {
    left: 8px;
    right: 8px;
    height: 2px;
  }

  .dialog-border-left,
  .dialog-border-right {
    top: 8px;
    bottom: 8px;
    width: 2px;
  }

  .dialog-border-top {
    top: -2px;
  }
  .dialog-border-bottom {
    bottom: -2px;
  }
  .dialog-border-left {
    left: -2px;
  }
  .dialog-border-right {
    right: -2px;
  }

  .detail-header {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .detail-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(
      135deg,
      var(--pq-bg-light) 0%,
      var(--pq-bg-dark) 100%
    );
    border: 3px solid var(--pq-border-inner);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 2px 2px 0 var(--pq-border-outer);
    position: relative;
  }

  .detail-icon.completed {
    background: linear-gradient(135deg, #5d8a4a 0%, #3d6830 100%);
    border-color: #3d6830;
  }

  .completed-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    background: #5d8a4a;
    border: 2px solid var(--pq-border-outer);
    border-radius: 50%;
    color: #fff;
    font-size: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-title-area {
    flex: 1;
    min-width: 0;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pq-dialog-title {
    font-family: var(--pq-font-pixel);
    font-size: 1rem;
    color: var(--pq-text-primary);
    margin: 0;
    text-shadow: 1px 1px 0 var(--pq-border-outer);
  }

  .quest-status {
    font-family: var(--pq-font-pixel);
    font-size: 0.5rem;
    padding: 2px 6px;
    background: var(--pq-ui-red);
    color: var(--pq-text-primary);
    border: 2px solid var(--pq-border-outer);
    animation: status-blink 1s steps(2) infinite;
  }

  .quest-status.completed {
    background: var(--pq-ui-green);
    animation: none;
  }

  @keyframes status-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .detail-meta {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    font-family: var(--pq-font-pixel);
  }

  .detail-date {
    color: var(--pq-ui-green);
    font-size: 0.625rem;
  }

  .detail-time {
    color: var(--pq-ui-gold);
    font-size: 0.625rem;
    font-weight: bold;
  }

  .pq-dialog-content {
    font-family: var(--pq-font-pixel);
    font-size: 0.75rem;
    color: var(--pq-text-secondary);
  }

  .pq-dialog-location {
    margin-bottom: 8px;
  }

  .arrow-icon {
    color: var(--pq-ui-green);
    margin-right: 4px;
    animation: arrow-blink 0.5s steps(1) infinite;
  }

  @keyframes arrow-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .pq-dialog-notes {
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border: 2px solid var(--pq-border-inner);
  }

  .notes-text {
    line-height: 1.5;
    letter-spacing: 0.5px;
  }

  .pq-dialog-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 2px dashed var(--pq-border-inner);
  }

  .pq-btn-pixel {
    background: var(--pq-bg-dark);
    color: var(--pq-text-primary);
    border: 3px solid var(--pq-border-inner);
    padding: 6px 12px;
    font-family: var(--pq-font-pixel);
    font-size: 0.625rem;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--pq-border-outer);
    transition: transform 0.05s steps(1);
  }

  .pq-btn-pixel:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--pq-border-outer);
  }

  .pq-btn-pixel:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 var(--pq-border-outer);
  }

  .pq-btn-danger {
    border-color: var(--pq-ui-red);
  }

  .dialog-continue {
    position: absolute;
    bottom: 4px;
    right: 12px;
    color: var(--pq-text-primary);
    font-size: 0.5rem;
  }

  .blink-arrow {
    animation: blink-anim 0.6s steps(2) infinite;
  }

  @keyframes blink-anim {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }

  .detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100px;
    gap: 8px;
    background: var(--pq-bg-medium);
    border: 4px solid var(--pq-border-inner);
    box-shadow: 4px 4px 0 var(--pq-border-outer);
  }

  .empty-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
  }

  .empty-icon :global(.pq-icon) {
    transform: scale(1.2);
  }

  .empty-text {
    color: var(--pq-text-secondary);
    font-family: var(--pq-font-pixel);
    font-size: 0.75rem;
    margin: 0;
    letter-spacing: 1px;
  }

  .empty-hint {
    font-family: var(--pq-font-pixel);
    font-size: 0.75rem;
  }

  .blink-cursor {
    animation: blink-anim 0.5s steps(1) infinite;
    color: var(--pq-ui-gold);
  }

  @media (min-width: 768px) {
    .detail-panel {
      padding: 16px;
    }

    .detail-icon {
      width: 48px;
      height: 48px;
    }

    .pq-dialog-title {
      font-size: 1.125rem;
    }
  }
</style>
