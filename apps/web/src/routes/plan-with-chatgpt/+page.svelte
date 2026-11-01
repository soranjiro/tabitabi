<script lang="ts">
  import { onMount } from 'svelte';
  import { itineraryApi } from '$lib/api/itinerary';
  import { stepApi } from '$lib/api/step';
  import { buildPlannerPrompt, buildChatGptUrl } from '$lib/chatgpt/planner';
  import type { ItineraryResponse, Step } from '@tabitabi/types';

  let itinerary = $state<ItineraryResponse | null>(null);
  let steps = $state<Step[]>([]);
  let loading = $state(true);
  let error = $state('');
  let origin = $state('https://tabitabi.pages.dev');
  let includeSchedule = $state(false);
  let request = $state('');
  let copied = $state(false);
  let readOnly = $state(false);

  onMount(async () => {
    origin = window.location.origin;
    const id = new URLSearchParams(window.location.search).get('itinerary');
    if (!id) {
      loading = false;
      return;
    }
    if (id.length > 128) {
      error = 'しおりのURLを確認してください。';
      loading = false;
      return;
    }
    try {
      const result = await itineraryApi.get(id);
      itinerary = result;
      readOnly = result.is_shared_snapshot;
      steps = await stepApi.list(id);
      // Sensitive or secret-mode itineraries require an explicit opt-in.
      includeSchedule = !result.is_password_protected && !result.secret_settings?.enabled;
    } catch {
      error = 'しおりを読み込めませんでした。URLを確認するか、しおりから開き直してください。';
    } finally {
      loading = false;
    }
  });

  const prompt = $derived(buildPlannerPrompt({
    itinerary, steps, origin, includeSchedule, request, readOnly,
  }));
  const chatGptUrl = $derived(buildChatGptUrl(prompt));

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      const input = document.getElementById('prompt-preview') as HTMLTextAreaElement | null;
      input?.focus();
      input?.select();
      copied = false;
    }
  }
</script>

<svelte:head>
  <title>ChatGPTで旅を考える | たびたび</title>
  <meta name="description" content="ChatGPTで旅の計画を相談し、たびたびでしおりにまとめる。" />
</svelte:head>

<div class="planner">
  <div class="content">
    <header class="top">
      <a class="brand" href="/" aria-label="たびたびのトップへ">
        <span class="brand-mark" aria-hidden="true">✳</span> たびたび
      </a>
      <span class="step-label">旅の計画を相談する</span>
    </header>

    <main class="main">
      <div class="intro">
        <p class="eyebrow">PLAN YOUR NEXT TRIP</p>
        <h1>旅のアイデアは、<br /><em>ChatGPT</em> と。</h1>
        <p class="lead">行き先や予定を相談して、旅のしおりは「たびたび」で完成させましょう。</p>
      </div>

      {#if loading}
        <p class="loading" role="status">しおりを読み込んでいます…</p>
      {:else if error}
        <div class="error" role="alert">{error}</div>
        <a class="back" href="/">トップへ戻る</a>
      {:else}
        <section class="panel" aria-labelledby="details-heading">
          <div class="panel-header">
            <span class="number">01</span>
            <h2 id="details-heading">相談したいこと</h2>
          </div>
          {#if itinerary}
            <div class="itinerary">
              <span class="field-name">引き継ぐしおり</span>
              <strong>{itinerary.title}</strong>
              <span class="muted">{steps.filter(s => !s.is_hidden).length}件の予定 / しおりのリンクを含めます</span>
            </div>
            {#if steps.length > 0}
              <label class="option">
                <input type="checkbox" bind:checked={includeSchedule} />
                <span><strong>登録済みの予定も含める</strong><small>タイトル・日時・場所をChatGPTに送ります。メモや編集用トークンは送りません。</small></span>
              </label>
            {:else}
              <p class="empty-note">予定はまだありません。ChatGPTに希望を伝えて、一緒に決められます。</p>
            {/if}
          {:else}
            <div class="itinerary"><span class="field-name">しおりは未作成</span><strong>ゼロから旅を考える</strong><span class="muted">目的地や日程が未定でも大丈夫です。</span></div>
          {/if}
          <label for="trip-request" class="field-name request-label">旅について伝えたいこと（任意）</label>
          <textarea id="trip-request" bind:value={request} maxlength="600" rows="4" placeholder="例：来年の春に友人3人と京都へ。食事を楽しみたい。移動は公共交通機関で。"></textarea>
        </section>

        <section class="panel finish" aria-labelledby="handoff-heading">
          <div class="panel-header">
            <span class="number">02</span>
            <h2 id="handoff-heading">ChatGPTに引き継ぐ</h2>
          </div>
          <p>下書きを用意してChatGPTを開きます。送信前に内容を確認・修正できます。</p>
          <a href={chatGptUrl} class="open-link" target="_blank" rel="noopener noreferrer">ChatGPTで考える <span aria-hidden="true">↗</span></a>
          <div class="fallback">
            <button type="button" onclick={copyPrompt}>{copied ? 'コピーしました' : 'プロンプトをコピー'}</button>
            <span>アプリで下書きが表示されない場合は、コピーして貼り付けてください。</span>
          </div>
          <details class="prompt-details">
            <summary>ChatGPTに渡す内容を確認</summary>
            <textarea id="prompt-preview" readonly value={prompt} aria-label="ChatGPTに渡すプロンプト"></textarea>
          </details>
        </section>
        <p class="privacy">※ ChatGPTは外部サービスです。しおりのリンクや選択した予定は、ChatGPTに送信される可能性があります。MCPによる直接編集は、別途ChatGPTでtabitabiを接続・認証した場合にのみ利用できます。</p>
        {#if itinerary}
          <a class="back" href={(readOnly ? '/s/' : '/itineraries/') + encodeURIComponent(itinerary.id)}>← しおりに戻る</a>
        {:else}
          <a class="back" href="/">← トップに戻る</a>
        {/if}
      {/if}
    </main>
    <footer>旅の計画から、思い出になるしおりへ。</footer>
  </div>
</div>

<style>
  .planner { min-height:100vh; background:#f8f7f2; color:#283c38; font-family: "Noto Sans JP", sans-serif; padding:0 22px; }
  .content { max-width:800px; margin:auto; }
  .top { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:30px 0 25px; border-bottom:1px solid #d9ded7; }
  .brand { color:#335a50; font-size:20px; font-weight:700; letter-spacing:.08em; text-decoration:none; white-space:nowrap; }
  .brand-mark { font-size:22px; margin-right:6px; }
  .step-label { color:#75817a; font-size:12px; }
  .main { padding:56px 0 48px; }
  .eyebrow { color:#67867a; font-size:11px; letter-spacing:.2em; font-weight:700; }
  h1 { margin:14px 0 18px; font-size:clamp(32px,6vw,58px); font-family:Georgia,"Noto Serif JP",serif; font-weight:500; line-height:1.4; letter-spacing:-.035em; }
  h1 em { color:#3f816b; font-style:normal; }
  .lead { margin:0 0 42px; color:#66736d; font-size:15px; line-height:1.9; }
  .panel { padding:30px 32px; margin:0 0 20px; background:#fff; border:1px solid #e0e4dc; border-radius:17px; box-shadow:0 7px 28px rgba(30,65,55,.035); }
  .panel-header { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
  .number { color:#739787; font-size:12px; font-weight:700; letter-spacing:.12em; }
  h2 { font-size:18px; font-weight:700; margin:0; }
  .itinerary { border:1px solid #e0e7df; background:#f9fbf8; border-radius:10px; padding:17px 20px; display:grid; gap:5px; margin-bottom:22px; }
  .itinerary strong { font-size:17px; }
  .field-name { display:block; color:#536f64; font-size:12px; font-weight:700; }
  .muted, .empty-note { font-size:13px; color:#74817a; }
  .option { display:flex; gap:12px; align-items:flex-start; cursor:pointer; margin:8px 0 24px; }
  .option input { width:18px; height:18px; flex:none; accent-color:#4d7969; margin-top:3px; }
  .option span { display:grid; gap:5px; }
  .option strong { font-size:14px; }
  .option small { color:#77837d; font-size:12px; line-height:1.7; }
  .request-label { margin:0 0 10px; }
  textarea { box-sizing:border-box; width:100%; resize:vertical; padding:14px 16px; border:1px solid #cdd7d0; border-radius:10px; color:#2e4037; font:inherit; font-size:14px; line-height:1.75; background:white; }
  textarea:focus { outline:2px solid #9fbfae; outline-offset:2px; }
  .finish>p { font-size:14px; color:#67776c; line-height:1.8; margin:0 0 21px; }
  .open-link { display:flex; justify-content:space-between; align-items:center; gap:14px; border-radius:10px; background:#315e50; padding:17px 21px; color:white; font-size:16px; font-weight:700; text-decoration:none; transition:background .15s; }
  .open-link:hover { background:#244c40; }
  .fallback { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-top:18px; }
  .fallback button { cursor:pointer; background:transparent; border:1px solid #b9cac0; border-radius:8px; padding:9px 13px; color:#385d50; font-weight:700; font-size:12px; }
  .fallback span { font-size:12px; color:#78867e; line-height:1.7; }
  .prompt-details { margin-top:22px; font-size:12px; color:#6b7b72; }
  .prompt-details summary { cursor:pointer; }
  .prompt-details textarea { margin-top:12px; min-height:160px; font-size:12px; }
  .privacy { font-size:12px; line-height:1.85; color:#74817a; padding:4px 5px 12px; }
  .back { color:#547768; text-decoration:none; font-size:13px; font-weight:700; }
  .loading, .error { padding:22px 0; line-height:1.8; }
  .error { color:#a53d36; }
  footer { padding:25px 0 40px; border-top:1px solid #e0e5df; color:#8a9990; text-align:center; font-size:12px; }
  @media (max-width:600px) {
    .planner { padding:0 16px; }
    .top { padding:20px 0; }
    .main { padding:36px 0 36px; }
    .lead { margin-bottom:30px; }
    .panel { padding:23px 20px; border-radius:13px; }
  }
  @media (prefers-reduced-motion:reduce) { .open-link { transition:none; } }
</style>
