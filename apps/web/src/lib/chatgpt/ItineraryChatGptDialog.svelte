<script lang="ts">
  import { onMount } from "svelte";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import Dialog from "$lib/themes/standard/core/components/Dialog.svelte";
  import { buildPlannerPrompt, buildChatGptUrl } from "./planner";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onClose: () => void;
  }

  let { itinerary, steps, onClose }: Props = $props();
  let request = $state("");
  let includeSchedule = $state(!itinerary.is_password_protected && !itinerary.secret_settings?.enabled);
  let origin = $state("https://tabitabi.pages.dev");
  let copied = $state(false);
  let copyFailed = $state(false);

  onMount(() => { origin = window.location.origin; });

  const prompt = $derived(buildPlannerPrompt({
    itinerary, steps, origin, includeSchedule, request,
  }));
  const link = $derived(buildChatGptUrl(prompt));
  const visibleCount = $derived(steps.filter(step => !step.is_hidden).length);

  async function copyPrompt() {
    copyFailed = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      const field = document.getElementById("chatgpt-prompt-preview") as HTMLTextAreaElement | null;
      field?.focus();
      field?.select();
      copyFailed = true;
    }
  }
</script>

<Dialog show={true} title="ChatGPTで考える" {onClose}>
  {#snippet children()}
    <div class="planner-form">
      <p class="planner-intro">このしおりの予定を、ChatGPTと一緒に考えます。変更内容は、編集権限を確認したうえでしおりに反映できます。</p>

      <div class="planner-current">
        <span class="planner-caption">編集するしおり</span>
        <strong>{itinerary.title}</strong>
        <small>{visibleCount > 0 ? visibleCount + "件の予定" : "まだ予定はありません"} · しおりのURLを引き継ぎます</small>
      </div>

      {#if steps.length > 0}
        <label class="planner-option">
          <input type="checkbox" bind:checked={includeSchedule} />
          <span>
            <strong>既存の予定もChatGPTに渡す</strong>
            <small>予定のタイトル・日時・場所のみ。メモや編集用の認証情報は送りません。</small>
          </span>
        </label>
        {#if itinerary.secret_settings?.enabled}
          <p class="planner-warning">シークレットモードのしおりです。非表示の予定は送らず、表示済みの予定のみ引き継ぎます。</p>
        {/if}
      {/if}

      <label class="planner-label" for="chatgpt-trip-request">相談・変更したいこと（任意）</label>
      <textarea id="chatgpt-trip-request" rows="3" maxlength="600" bind:value={request}
        placeholder="例：2日目の午後を見直して。移動時間も考慮し、変更前に確認してほしい。"></textarea>

      <a class="planner-action" href={link} target="_blank" rel="noopener noreferrer">
        <span>ChatGPTでこのしおりを編集</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </a>

      <div class="planner-secondary">
        <button type="button" onclick={copyPrompt}>{copied ? "コピーしました" : "プロンプトをコピー"}</button>
        <span>下書きが開かなければコピーして貼り付けてください。</span>
      </div>
      {#if copyFailed}
        <p class="planner-warning" role="status">コピーできませんでした。下の文章を選択してコピーしてください。</p>
      {/if}
      <details class="planner-preview">
        <summary>ChatGPTに渡す文章を確認</summary>
        <textarea id="chatgpt-prompt-preview" rows="6" readonly value={prompt} aria-label="ChatGPTに渡す文章"></textarea>
      </details>

      <p class="planner-footnote">
        ChatGPTは外部サービスです。しおりのリンクと選択した予定が共有されます。
        MCPで直接保存するには、ChatGPTでtabitabiを接続し、このしおりの編集権限があるアカウントで認証してください。
      </p>
    </div>
  {/snippet}
</Dialog>

<style>
  .planner-form { display:grid; gap:16px; padding-bottom:22px; font-family:var(--theme-font-family,inherit); color:var(--theme-text,#344137); }
  .planner-intro { margin:0; color:var(--theme-text-light,#68756c); font-size:13px; line-height:1.8; }
  .planner-current { display:grid; gap:4px; padding:17px 18px; background:color-mix(in srgb,var(--theme-primary,#647b70) 5%,white); border:1px solid var(--theme-border,#dce3dc); border-radius:13px; }
  .planner-caption { font-size:11px; font-weight:700; color:var(--theme-text-light,#69776f); }
  .planner-current strong { font-size:16px; overflow-wrap:anywhere; }
  .planner-current small { font-size:12px; color:var(--theme-text-light,#68756c); }
  .planner-option { display:flex; align-items:flex-start; gap:11px; cursor:pointer; }
  .planner-option input { flex-shrink:0; width:18px; height:18px; margin:3px 0 0; accent-color:var(--theme-primary,#456c59); }
  .planner-option span { display:grid; gap:4px; }
  .planner-option strong { font-size:13px; }
  .planner-option small { font-size:11px; line-height:1.65; color:var(--theme-text-light,#68756c); }
  .planner-label { display:block; margin-bottom:-9px; font-size:12px; font-weight:700; }
  textarea { width:100%; min-width:0; box-sizing:border-box; resize:vertical; padding:12px 13px; border-radius:11px; border:1px solid var(--theme-border,#d3ddd5); background:#fff; color:var(--theme-text,#344137); font:inherit; font-size:14px; line-height:1.65; }
  textarea:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible { outline:2px solid var(--theme-primary,#456c59); outline-offset:3px; }
  .planner-action { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:50px; padding:12px 16px; border-radius:12px; background:var(--theme-primary,#456c59); color:white; font-size:13px; font-weight:700; text-decoration:none; }
  .planner-action:hover { filter:brightness(.92); }
  .planner-secondary { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; }
  .planner-secondary button { padding:8px 12px; border:1px solid var(--theme-border,#d3ddd5); border-radius:9px; background:#fff; cursor:pointer; color:var(--theme-text,#344137); font-size:12px; font-weight:700; }
  .planner-secondary span,.planner-preview,.planner-footnote,.planner-warning { font-size:11px; line-height:1.7; color:var(--theme-text-light,#68756c); }
  .planner-warning { margin:0; }
  .planner-preview summary { cursor:pointer; }
  .planner-preview textarea { margin-top:10px; font-size:12px; }
  .planner-footnote { margin:0; border-top:1px solid var(--theme-border,#dce3dc); padding-top:14px; }
  @media(max-width:600px) { .planner-form { gap:14px; padding-bottom:18px; } .planner-action { font-size:12px; } }
</style>
