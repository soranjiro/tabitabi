<script lang="ts">
  import { tick } from "svelte";
  import type { FeedbackCategory } from "./feedback";

  let open = $state(false);
  let category = $state<FeedbackCategory>("feature");
  let title = $state("");
  let description = $state("");
  let website = $state("");
  let submitting = $state(false);
  let errorMessage = $state("");
  let issueUrl = $state<string | null>(null);
  let issueNumber = $state<number | null>(null);
  let titleInput = $state<HTMLInputElement | null>(null);

  function openDialog() {
    open = true;
    errorMessage = "";
    tick().then(() => titleInput?.focus());
  }

  function closeDialog() {
    if (submitting) return;
    open = false;
    if (issueUrl !== null) {
      category = "feature";
      title = "";
      description = "";
      issueUrl = null;
      issueNumber = null;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") closeDialog();
  }

  async function submitFeedback(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = "";

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          description,
          pageUrl: window.location.href,
          website,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        issueUrl?: string | null;
        issueNumber?: number;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "要望を送信できませんでした");
      }

      issueUrl = result.issueUrl ?? null;
      issueNumber = result.issueNumber ?? null;
      if (result.issueUrl === null) closeDialog();
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "要望を送信できませんでした。もう一度お試しください";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<button
  type="button"
  class="feedback-trigger"
  onclick={openDialog}
  aria-haspopup="dialog"
>
  <span aria-hidden="true">✦</span>
  要望を送る
</button>

{#if open}
  <div class="feedback-layer">
    <button
      type="button"
      class="feedback-backdrop"
      onclick={closeDialog}
      aria-label="要望フォームを閉じる"
    ></button>

    <div
      class="feedback-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <button
        type="button"
        class="close-button"
        onclick={closeDialog}
        aria-label="閉じる"
        disabled={submitting}
      >
        ×
      </button>

      {#if issueUrl}
        <div class="success-content" aria-live="polite">
          <div class="success-mark" aria-hidden="true">✓</div>
          <p class="eyebrow">送信完了</p>
          <h2 id="feedback-title">要望を受け付けました</h2>
          <p>
            ありがとうございます。いただいた内容は開発チームで確認します。
          </p>
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            GitHub Issue #{issueNumber} を見る
          </a>
          <button type="button" class="primary-button" onclick={closeDialog}>
            閉じる
          </button>
        </div>
      {:else}
        <header>
          <p class="eyebrow">FEEDBACK</p>
          <h2 id="feedback-title">こんな機能がほしい！</h2>
          <p class="intro">
            たびたびをもっと便利にするアイデアを、気軽に教えてください。
          </p>
        </header>

        <form onsubmit={submitFeedback}>
          <fieldset>
            <legend>要望の種類</legend>
            <div class="category-options">
              <label>
                <input type="radio" bind:group={category} value="feature" />
                <span>＋ 新しい機能</span>
              </label>
              <label>
                <input type="radio" bind:group={category} value="improvement" />
                <span>↑ 使いやすさ</span>
              </label>
              <label>
                <input type="radio" bind:group={category} value="other" />
                <span>… その他</span>
              </label>
            </div>
          </fieldset>

          <label class="field-label" for="feedback-summary">
            ひとこと要約
            <span>必須</span>
          </label>
          <input
            id="feedback-summary"
            bind:this={titleInput}
            bind:value={title}
            minlength="3"
            maxlength="120"
            placeholder="例：旅程をPDFで保存したい"
            required
          />

          <label class="field-label" for="feedback-description">
            詳しい内容
            <span>必須</span>
          </label>
          <textarea
            id="feedback-description"
            bind:value={description}
            minlength="10"
            maxlength="4000"
            rows="5"
            placeholder="どんなときに、どのように使いたいか教えてください"
            required
          ></textarea>
          <div class="character-count">{description.length} / 4000</div>

          <label class="website-field" aria-hidden="true">
            ウェブサイト
            <input bind:value={website} tabindex="-1" autocomplete="off" />
          </label>

          {#if errorMessage}
            <p class="error-message" role="alert">{errorMessage}</p>
          {/if}

          <p class="notice">
            送信内容は公開のGitHub Issueとして作成されます。個人情報は入力しないでください。
          </p>

          <button type="submit" class="primary-button" disabled={submitting}>
            {submitting ? "送信しています…" : "要望を送る"}
            {#if !submitting}<span aria-hidden="true">→</span>{/if}
          </button>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .feedback-trigger {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 900;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0.65rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 9999px;
    background: #243b67;
    color: white;
    box-shadow: 0 6px 24px rgba(23, 37, 67, 0.25);
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      transform 0.2s,
      background 0.2s,
      box-shadow 0.2s;
  }

  .feedback-trigger:hover {
    transform: translateY(-2px);
    background: #1d3158;
    box-shadow: 0 9px 28px rgba(23, 37, 67, 0.32);
  }

  .feedback-trigger:focus-visible,
  .close-button:focus-visible,
  .primary-button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #8bb8ff;
    outline-offset: 2px;
  }

  .feedback-layer {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .feedback-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    background: rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(4px);
    cursor: default;
  }

  .feedback-dialog {
    position: relative;
    z-index: 1;
    width: min(100%, 540px);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    border: 1px solid #dce5f3;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
    padding: 2rem;
    color: #182238;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 50%;
    background: #f2f5fa;
    color: #58657a;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: #5475b8;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 0;
    padding-right: 2.5rem;
    color: #1e3157;
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .intro {
    margin: 0.55rem 0 1.5rem;
    color: #647087;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  form {
    display: flex;
    flex-direction: column;
  }

  fieldset {
    margin: 0 0 1.25rem;
    padding: 0;
    border: 0;
  }

  legend,
  .field-label {
    margin-bottom: 0.5rem;
    color: #34425a;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.2rem;
  }

  .field-label span {
    border-radius: 4px;
    background: #eef3fc;
    color: #5475b8;
    padding: 0.1rem 0.35rem;
    font-size: 0.65rem;
  }

  .category-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .category-options label {
    cursor: pointer;
  }

  .category-options input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .category-options span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    border: 1px solid #d8e0ed;
    border-radius: 10px;
    background: #f8fafc;
    color: #5e6a7d;
    font-size: 0.76rem;
    font-weight: 700;
    text-align: center;
    transition:
      border-color 0.2s,
      background 0.2s,
      color 0.2s;
  }

  .category-options input:checked + span {
    border-color: #6f91d0;
    background: #edf3ff;
    color: #2e5598;
    box-shadow: inset 0 0 0 1px #6f91d0;
  }

  .category-options input:focus-visible + span {
    outline: 3px solid #8bb8ff;
    outline-offset: 2px;
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid #ced8e7;
    border-radius: 12px;
    background: #fbfcfe;
    color: #1d293d;
    font: inherit;
    font-size: 0.9rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input {
    min-height: 46px;
    margin-bottom: 1.15rem;
    padding: 0 0.85rem;
  }

  textarea {
    resize: vertical;
    min-height: 120px;
    padding: 0.75rem 0.85rem;
    line-height: 1.55;
  }

  input:focus,
  textarea:focus {
    border-color: #6f91d0;
    box-shadow: 0 0 0 3px rgba(111, 145, 208, 0.16);
  }

  .character-count {
    margin: 0.3rem 0 0.8rem;
    color: #8490a2;
    font-size: 0.7rem;
    text-align: right;
  }

  .notice {
    margin: 0 0 1rem;
    border-radius: 10px;
    background: #f5f7fa;
    color: #697588;
    padding: 0.65rem 0.75rem;
    font-size: 0.72rem;
    line-height: 1.55;
  }

  .error-message {
    margin: 0 0 0.8rem;
    border-radius: 10px;
    background: #fff1f2;
    color: #b4233f;
    padding: 0.7rem 0.8rem;
    font-size: 0.8rem;
  }

  .primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 48px;
    width: 100%;
    border: 0;
    border-radius: 12px;
    background: #365f9f;
    color: white;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition:
      background 0.2s,
      transform 0.2s;
  }

  .primary-button:hover:not(:disabled) {
    background: #2d518a;
    transform: translateY(-1px);
  }

  .primary-button:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .website-field {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .success-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.25rem 0 0.25rem;
    text-align: center;
  }

  .success-mark {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    margin-bottom: 1rem;
    border-radius: 50%;
    background: #e8f7ef;
    color: #168554;
    font-size: 1.75rem;
    font-weight: 800;
  }

  .success-content h2 {
    padding: 0;
  }

  .success-content > p:not(.eyebrow) {
    max-width: 380px;
    margin: 0.75rem 0 1rem;
    color: #647087;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .success-content a {
    margin-bottom: 1.25rem;
    color: #365f9f;
    font-size: 0.85rem;
    font-weight: 700;
  }

  @media (max-width: 600px) {
    .feedback-trigger {
      right: 0.75rem;
      bottom: 4.75rem;
    }

    .feedback-layer {
      align-items: end;
      padding: 0;
    }

    .feedback-dialog {
      width: 100%;
      max-height: calc(100dvh - 0.75rem);
      border-radius: 24px 24px 0 0;
      padding: 1.5rem 1.15rem calc(1.25rem + env(safe-area-inset-bottom));
    }

    .category-options {
      gap: 0.35rem;
    }

    .category-options span {
      font-size: 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .feedback-trigger,
    .primary-button {
      transition: none;
    }
  }
</style>
