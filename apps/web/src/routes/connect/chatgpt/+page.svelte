<script lang="ts">
  import { onMount } from 'svelte';
  import { userAuth } from '$lib/user-auth';

  const base = (import.meta.env.PUBLIC_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined) ||
    'http://localhost:8787/api/v1';
  const authOrigin = new URL(base).origin;

  let requestId = $state('');
  let loading = $state(true);
  let approving = $state(false);
  let signedIn = $state(false);
  let error = $state('');
  let expiry = $state(0);

  async function checkSession() {
    try {
      const user = await userAuth.ready();
      signedIn = Boolean(user?.emailVerified);
    } catch { signedIn = false; }
  }

  onMount(async () => {
    requestId = new URLSearchParams(location.search).get('request') ?? '';
    if (!/^[0-9a-f]{64}$/.test(requestId)) {
      error = '認証リクエストが無効です。';
      loading = false;
      return;
    }
    try {
      const result = await fetch(authOrigin + '/oauth/request/' + encodeURIComponent(requestId), { cache: 'no-store' });
      if (!result.ok) throw new Error('expired_request');
      const info: { expires_at: number } = await result.json();
      expiry = info.expires_at;
      await checkSession();
    } catch {
      error = '接続リクエストの有効期限が切れました。ChatGPTから接続し直してください。';
    } finally { loading = false; }
  });

  async function approve() {
    if (approving || !requestId) return;
    approving = true;
    error = '';
    try {
      const token = await userAuth.getToken();
      if (!token) throw new Error('ログインしてください。');
      const result = await fetch(authOrigin + '/oauth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ request: requestId }),
        cache: 'no-store',
      });
      if (!result.ok) throw new Error(result.status === 403
        ? 'アカウントの本人確認・プロフィール設定を完了してください。'
        : '認証できませんでした。再度ChatGPTから接続してください。');
      const body: { redirect_url: string } = await result.json();
      const redirect = new URL(body.redirect_url);
      if (redirect.protocol !== 'https:' || redirect.hostname !== 'chatgpt.com') throw new Error('リダイレクト先が不正です。');
      location.assign(redirect.toString());
    } catch (err) {
      error = err instanceof Error ? err.message : '認証処理に失敗しました。';
      approving = false;
    }
  }
</script>

<svelte:head>
  <title>ChatGPTと連携 | たびたび</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="screen">
  <main class="dialog">
    <a class="brand" href="/">✳ たびたび</a>
    <p class="eyebrow">ACCOUNT CONNECTION</p>
    <h1>ChatGPTと<br />たびたびを連携</h1>
    <p class="description">ChatGPTからあなたのしおりを参照し、予定を追加・編集できるようにします。</p>
    <div class="permissions">
      <strong>許可する操作</strong>
      <p>編集権限を持つしおりの一覧・予定の閲覧</p>
      <p>編集権限を持つしおりへの予定の追加・変更</p>
      <small>しおりの削除・共有設定の変更は許可しません。パスワードや編集トークンはChatGPTに渡しません。</small>
    </div>

    {#if loading}
      <p role="status">接続情報を確認しています…</p>
    {:else if error}
      <p class="error" role="alert">{error}</p>
    {/if}
    {#if !loading && requestId && expiry > Date.now()}
      {#if !signedIn}
        <p class="login-note">たびたびにログインし、プロフィール設定を完了してください。</p>
        <a href="/profile" target="_blank" rel="noopener noreferrer" class="login">ログイン・新規登録 ↗</a>
        <button class="refresh" type="button" onclick={checkSession}>ログイン状態を再確認</button>
      {:else}
        <button class="approve" type="button" onclick={approve} disabled={approving}>{approving ? '認証しています…' : '許可してChatGPTに戻る'}</button>
      {/if}
    {/if}
    <a class="cancel" href="/">キャンセルしてトップに戻る</a>
  </main>
</div>

<style>
  .screen { display:grid; place-items:center; min-height:100vh; padding:24px; background:#f7f8f3; color:#30493f; font-family:"Noto Sans JP",sans-serif; }
  .dialog { width:min(100%,470px); padding:42px; border:1px solid #e1e7df; border-radius:18px; background:#fff; box-shadow:0 18px 50px #2042350d; }
  .brand { display:inline-block; margin-bottom:36px; color:#335e50; font-size:19px; font-weight:700; text-decoration:none; }
  .eyebrow { font-size:11px; color:#648a75; font-weight:700; letter-spacing:.18em; }
  h1 { font-family:Georgia,"Noto Serif JP",serif; font-weight:500; font-size:clamp(30px,6vw,42px); line-height:1.45; margin:12px 0 15px; }
  .description { color:#63766c; font-size:14px; line-height:1.85; margin-bottom:28px; }
  .permissions { padding:21px 23px; border-radius:10px; background:#f7faf7; border:1px solid #e2eae2; margin-bottom:27px; }
  .permissions strong { display:block; margin-bottom:14px; font-size:14px; }
  .permissions p { font-size:13px; margin:12px 0; }
  .permissions p:before { content:"✓"; margin-right:10px; color:#42755f; }
  .permissions small { display:block; margin-top:16px; color:#7a877f; font-size:11px; line-height:1.7; }
  .error { color:#b04442; font-size:13px; line-height:1.7; }
  .login-note { font-size:13px; line-height:1.8; }
  .approve, .login { box-sizing:border-box; display:block; width:100%; background:#35634f; border:0; border-radius:10px; padding:15px; color:white; font-size:14px; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; }
  .approve:disabled { opacity:.6; cursor:wait; }
  .refresh { display:block; margin:16px auto 0; padding:10px; border:0; color:#3e6f59; background:transparent; cursor:pointer; text-decoration:underline; }
  .cancel { display:block; margin:25px auto 0; width:fit-content; color:#76857b; text-decoration:none; font-size:12px; }
  @media (max-width:600px) { .dialog { padding:28px 22px; } }
</style>
