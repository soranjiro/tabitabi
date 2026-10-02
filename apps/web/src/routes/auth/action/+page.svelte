<script lang="ts">
  import { onMount } from "svelte";
  import { userAuth } from "$lib/user-auth";
  import IconAirplane from "../../home/icons/IconAirplane.svelte";

  type ActionState = "loading" | "reset" | "submitting" | "success" | "error";

  let state = $state<ActionState>("loading");
  let mode = $state("");
  let actionCode = $state("");
  let email = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let message = $state("");
  let backHref = $state("/profile");

  onMount(async () => {
    const params = new URL(window.location.href).searchParams;
    mode = params.get("mode") ?? "";
    actionCode = params.get("oobCode") ?? "";
    backHref = safeContinueUrl(params.get("continueUrl"));

    if (!mode || !actionCode) {
      fail("この確認リンクは正しくありません。メールに記載された最新のリンクをもう一度開いてください。");
      return;
    }

    try {
      if (mode === "resetPassword") {
        email = await userAuth.verifyPasswordResetCode(actionCode);
        state = "reset";
        return;
      }

      if (mode === "verifyEmail" || mode === "verifyAndChangeEmail" || mode === "recoverEmail") {
        const info = await userAuth.checkActionCode(actionCode);
        email = info.email ?? info.previousEmail ?? "";
        await userAuth.applyActionCode(actionCode);

        if (mode === "recoverEmail") {
          message = "メールアドレスを元に戻しました。心当たりがない変更だった場合は、続けてパスワードも変更してください。";
        } else if (mode === "verifyAndChangeEmail") {
          message = "新しいメールアドレスの確認が完了しました。";
        } else {
          message = "メールアドレスの確認が完了しました。";
        }

        try {
          await userAuth.refreshUser();
        } catch {
          // 別のブラウザでリンクを開いた場合はログイン状態がないため、そのまま完了画面を表示する。
        }

        state = "success";
        return;
      }

      fail("この種類の確認リンクには対応していません。");
    } catch (error) {
      fail(actionErrorMessage(error));
    }
  });

  async function submitPasswordReset() {
    if (newPassword.length < 8) {
      message = "新しいパスワードは8文字以上で入力してください。";
      return;
    }
    if (newPassword !== confirmPassword) {
      message = "新しいパスワードが一致しません。";
      return;
    }

    message = "";
    state = "submitting";
    try {
      await userAuth.confirmPasswordReset(actionCode, newPassword);
      message = "パスワードを変更しました。新しいパスワードでログインできます。";
      newPassword = "";
      confirmPassword = "";
      state = "success";
    } catch (error) {
      state = "reset";
      message = actionErrorMessage(error);
    }
  }

  function safeContinueUrl(value: string | null) {
    if (!value || typeof window === "undefined") return "/profile";
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return "/profile";
      return url.pathname + url.search + url.hash;
    } catch {
      return "/profile";
    }
  }

  function fail(text: string) {
    message = text;
    state = "error";
  }

  function actionErrorMessage(value: unknown) {
    const code = (value as { code?: string })?.code ?? "";
    if (code.includes("expired-action-code")) return "確認リンクの有効期限が切れています。マイページから確認メールを再送してください。";
    if (code.includes("invalid-action-code")) return "確認リンクは無効か、すでに使用されています。最新のメールをご確認ください。";
    if (code.includes("user-disabled")) return "このアカウントは現在利用できません。";
    if (code.includes("weak-password")) return "新しいパスワードは8文字以上で入力してください。";
    return "手続きを完了できませんでした。時間をおいて、もう一度お試しください。";
  }
</script>

<svelte:head>
  <title>アカウント確認 - たびたび</title>
  <meta name="theme-color" content="#fffdf9" />
</svelte:head>

<div class="action-page">
  <header>
    <a href="/" class="brand" aria-label="たびたびのトップへ戻る">
      <span aria-hidden="true"><IconAirplane size={20} /></span>
      たびたび
    </a>
  </header>

  <main>
    <section class="intro">
      <div>
        <p class="eyebrow">ACCOUNT ACTION</p>
        <h1>
          {state === "reset"
            ? "新しいパスワードを設定。"
            : state === "success"
              ? "手続きが完了しました。"
              : state === "error"
                ? "リンクを確認してください。"
                : "アカウントを確認中。"}
        </h1>
        <p>旅の続きへ、安心して戻れるように。</p>
      </div>
      <svg viewBox="0 0 320 180" aria-hidden="true">
        <path d="M11 155c59 2 58-55 114-55 40 0 43 32 84 20 38-12 47-62 99-77" />
        <path d="m279 34 29-10-12 28-8-9-9-9Z" />
        <rect x="177" y="32" width="75" height="105" rx="16" />
        <circle cx="214" cy="71" r="19" />
        <path d="M214 58v27m-12-10 12-6 12 6m-18 17h29m-29 11h24" />
      </svg>
    </section>

    <section class="action-card" aria-live="polite">
      {#if state === "loading" || state === "submitting"}
        <div class="center-state">
          <span class="status-icon" aria-hidden="true">✈</span>
          <h2>{state === "submitting" ? "変更しています..." : "リンクを確認しています..."}</h2>
          <p>この画面は閉じずに、そのままお待ちください。</p>
        </div>
      {:else if state === "reset"}
        <form onsubmit={(event) => { event.preventDefault(); submitPasswordReset(); }}>
          <div class="heading">
            <span class="status-icon" aria-hidden="true">鍵</span>
            <div>
              <h2>パスワードを再設定</h2>
              {#if email}<p>{email}</p>{/if}
            </div>
          </div>

          {#if message}<p class="notice error" role="alert">{message}</p>{/if}

          <label for="new-password">新しいパスワード</label>
          <input id="new-password" type="password" bind:value={newPassword} minlength="8" autocomplete="new-password" placeholder="8文字以上で入力" required />

          <label for="confirm-password">新しいパスワード（確認）</label>
          <input id="confirm-password" type="password" bind:value={confirmPassword} minlength="8" autocomplete="new-password" placeholder="もう一度入力" required />

          <button type="submit" class="primary">パスワードを変更 <span aria-hidden="true">→</span></button>
        </form>
      {:else if state === "success"}
        <div class="center-state">
          <span class="status-icon success" aria-hidden="true">✓</span>
          <h2>完了しました</h2>
          <p>{message}</p>
          {#if email}<small>{email}</small>{/if}
          <a class="primary" href={backHref}>マイページへ戻る <span aria-hidden="true">→</span></a>
        </div>
      {:else}
        <div class="center-state">
          <span class="status-icon error" aria-hidden="true">!</span>
          <h2>手続きを完了できませんでした</h2>
          <p>{message}</p>
          <a class="secondary" href="/profile">マイページへ戻る</a>
        </div>
      {/if}

      <p class="security">Firebase Authentication の確認リンクを、たびたび上で安全に処理しています。</p>
    </section>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #fffdf9;
  }

  .action-page {
    min-height: 100vh;
    color: var(--home-ink-strong, #17263d);
    background:
      radial-gradient(circle at 88% 5%, rgba(190, 225, 245, .55), transparent 26rem),
      linear-gradient(180deg, #fffdf9 0%, #ffffff 70%, #f4f9fc 100%);
    font-family: var(--home-font-sans, sans-serif);
  }

  header {
    width: min(calc(100% - 2rem), 900px);
    margin: 0 auto;
    padding-top: 1.2rem;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: .7rem;
    color: var(--home-ink-strong, #17263d);
    font-family: var(--home-font-serif, serif);
    font-size: 1.05rem;
    letter-spacing: .08em;
    text-decoration: none;
  }

  .brand > span {
    display: grid;
    width: 2rem;
    height: 2rem;
    place-items: center;
    border: 1px solid #2b789f;
    border-radius: 50%;
    color: #2b789f;
  }

  main {
    width: min(calc(100% - 2rem), 900px);
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .intro {
    position: relative;
    display: grid;
    min-height: 13rem;
    grid-template-columns: 1fr .72fr;
    align-items: center;
    gap: 1rem;
  }

  .eyebrow {
    margin: 0 0 .5rem;
    color: #5f85a0;
    font-size: .67rem;
    font-weight: 800;
    letter-spacing: .17em;
  }

  h1 {
    max-width: 14ch;
    margin: 0;
    color: var(--home-ink-strong, #17263d);
    font-family: var(--home-font-serif, serif);
    font-size: clamp(2.1rem, 5vw, 3.45rem);
    font-weight: 500;
    line-height: 1.34;
    letter-spacing: .05em;
  }

  .intro p:last-child {
    margin: .9rem 0 0;
    color: #607386;
    font-family: var(--home-font-serif, serif);
    line-height: 1.8;
    letter-spacing: .05em;
  }

  .intro svg {
    width: 100%;
    fill: rgba(207, 233, 247, .3);
    stroke: #277293;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
  }

  .action-card {
    width: min(100%, 43rem);
    margin: 0 auto;
    padding: clamp(1.3rem, 3vw, 2.1rem);
    border: 1px solid #dfe7ec;
    border-radius: 1.8rem;
    background: rgba(255,255,255,.9);
    box-shadow: 0 20px 60px rgba(31, 58, 77, .08);
  }

  .center-state {
    display: grid;
    justify-items: center;
    gap: .9rem;
    text-align: center;
  }

  .status-icon {
    display: grid;
    width: 3.3rem;
    height: 3.3rem;
    place-items: center;
    border-radius: 1rem;
    color: white;
    background: #27799b;
    font-size: .9rem;
    font-weight: 900;
  }

  .status-icon.success {
    background: #3d8063;
  }

  .status-icon.error {
    background: #a25757;
  }

  h2 {
    margin: 0;
    color: #1d3449;
    font-family: var(--home-font-serif, serif);
    font-size: 1.45rem;
    font-weight: 500;
  }

  .center-state p,
  .heading p {
    margin: 0;
    color: #697b8b;
    font-size: .82rem;
    line-height: 1.75;
  }

  .center-state small {
    color: #8895a1;
    font-size: .72rem;
  }

  form {
    display: grid;
    gap: .85rem;
  }

  .heading {
    display: flex;
    margin-bottom: .6rem;
    align-items: center;
    gap: .9rem;
  }

  label {
    margin-top: .3rem;
    color: #253a4d;
    font-size: .82rem;
    font-weight: 800;
  }

  input {
    min-height: 3.35rem;
    padding: 0 .9rem;
    border: 1px solid #cbd5df;
    border-radius: .85rem;
    outline: 0;
    color: #17263d;
    background: white;
    font: inherit;
    font-size: 1rem;
  }

  input:focus {
    border-color: #3f7898;
    box-shadow: 0 0 0 3px rgba(63, 120, 152, .11);
  }

  .primary,
  .secondary {
    display: inline-flex;
    min-height: 3.45rem;
    padding: 0 1.3rem;
    border-radius: 999px;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    font: inherit;
    font-size: .9rem;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }

  button.primary {
    width: 100%;
    margin-top: .45rem;
  }

  .primary {
    border: 1px solid #1e6f91;
    color: white;
    background: linear-gradient(135deg, #17799f, #286b8b);
    box-shadow: 0 12px 30px rgba(33, 108, 139, .15);
  }

  .secondary {
    border: 1px solid #bdd0dc;
    color: #2f6c89;
    background: white;
  }

  .notice {
    margin: 0;
    padding: .75rem .9rem;
    border: 1px solid;
    border-radius: .75rem;
    font-size: .78rem;
    line-height: 1.65;
  }

  .notice.error {
    border-color: #eccdcd;
    color: #934848;
    background: #fff5f5;
  }

  .security {
    margin: 1.4rem 0 0;
    color: #87929d;
    font-size: .68rem;
    text-align: center;
  }

  @media (max-width: 650px) {
    header,
    main {
      width: min(calc(100% - 1.5rem), 900px);
    }

    main {
      padding-top: 1rem;
    }

    .intro {
      min-height: 12rem;
      grid-template-columns: 1fr;
    }

    .intro svg {
      position: absolute;
      right: -1rem;
      bottom: -.4rem;
      width: 46%;
      opacity: .62;
    }

    .intro p:last-child {
      max-width: 63%;
      font-size: .86rem;
    }

    .action-card {
      padding: 1.15rem;
      border-radius: 1.4rem;
    }
  }
</style>
