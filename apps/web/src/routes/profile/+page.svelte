<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { userApi } from "$lib/api/user";
  import { itineraryApi } from "$lib/api/itinerary";
  import { userAuth } from "$lib/user-auth";
  import PageShell from "$lib/PageShell.svelte";
  import { auth } from "$lib/auth";
  import { PREFECTURES, type Prefecture, type UserBookmarkWithItinerary, type UserSessionProfile } from "@tabitabi/types";

  type Mode = "login" | "register" | "verify" | "forgot" | "setup";

  let mode = $state<Mode>("login");
  let loading = $state(true);
  let submitting = $state(false);
  let loggedIn = $state(false);
  let account = $state<UserSessionProfile | null>(null);
  let bookmarks: UserBookmarkWithItinerary[] = $state([]);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);

  let email = $state("");
  let password = $state("");
  let usernameInput = $state("");
  let prefecture = $state<Prefecture | "">("");
  let verificationSentTo = $state("");

  let editSection = $state<"none" | "profile" | "email" | "password">("none");
  let editUsername = $state("");
  let editPrefecture = $state<Prefecture | "">("");
  let editEmail = $state("");
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let editError = $state<string | null>(null);
  let editSuccess = $state<string | null>(null);
  let publishingIds = $state(new Set<string>());

  onMount(async () => {
    try {
      const firebaseUser = await userAuth.ready();
      if (!firebaseUser) return;
      email = firebaseUser.email ?? "";
      if (!firebaseUser.emailVerified) {
        verificationSentTo = email;
        mode = "verify";
        return;
      }
      await finishAuthentication();
    } catch (e) {
      error = firebaseMessage(e);
    } finally {
      loading = false;
    }
  });

  async function finishAuthentication() {
    const firebaseUser = await userAuth.ready();
    const storedPending = userAuth.getPendingProfile();
    const pending = storedPending?.uid === firebaseUser?.uid ? storedPending : null;
    try {
      const profile = await userApi.bootstrap(pending ? {
        username: pending.username,
        prefecture: pending.prefecture as Prefecture,
      } : {});
      account = profile;
      usernameInput = profile.username;
      prefecture = profile.prefecture ?? "";
      if (!profile.profile_complete) {
        mode = "setup";
        return;
      }
      userAuth.setUser(profile);
      userAuth.clearPendingProfile();
      loggedIn = true;
      editUsername = profile.username;
      editPrefecture = profile.prefecture ?? "";
      editEmail = profile.email;
      await syncLocalBookmarks();
      await loadBookmarks();
      await continuePendingFork();
    } catch (e) {
      if (errorCode(e) === "PROFILE_SETUP_REQUIRED") {
        mode = "setup";
        usernameInput = pending?.username ?? "";
        prefecture = (pending?.prefecture as Prefecture | undefined) ?? "";
        return;
      }
      throw e;
    }
  }

  async function handleAuthSubmit() {
    error = null;
    notice = null;
    submitting = true;
    try {
      if (mode === "register") {
        if (!prefecture) throw new Error("PREFECTURE_REQUIRED");
        const firebaseUser = await userAuth.signUp(email, password);
        userAuth.setPendingProfile({ uid: firebaseUser.uid, username: usernameInput, prefecture });
        await userAuth.sendVerification();
        verificationSentTo = firebaseUser.email ?? email;
        password = "";
        mode = "verify";
      } else {
        const firebaseUser = await userAuth.signIn(email, password);
        password = "";
        if (!firebaseUser.emailVerified) {
          verificationSentTo = firebaseUser.email ?? email;
          mode = "verify";
          return;
        }
        await finishAuthentication();
      }
    } catch (e) {
      error = firebaseMessage(e);
    } finally {
      submitting = false;
    }
  }

  async function checkVerification() {
    error = null;
    submitting = true;
    try {
      const firebaseUser = await userAuth.refreshUser();
      if (!firebaseUser.emailVerified) {
        error = "まだ確認できていません。メール内のリンクを開いてから、もう一度お試しください。";
        return;
      }
      notice = "メールアドレスを確認しました。";
      await finishAuthentication();
    } catch (e) {
      error = firebaseMessage(e);
    } finally { submitting = false; }
  }

  async function resendVerification() {
    error = null;
    submitting = true;
    try {
      await userAuth.sendVerification();
      notice = "確認メールを再送しました。迷惑メールフォルダもご確認ください。";
    } catch (e) { error = firebaseMessage(e); }
    finally { submitting = false; }
  }

  async function requestPasswordReset() {
    error = null;
    submitting = true;
    try {
      await userAuth.sendPasswordReset(email);
      notice = "再設定メールを送信しました。登録がない場合も同じ表示になります。";
    } catch (e) { error = firebaseMessage(e); }
    finally { submitting = false; }
  }

  async function completeProfile() {
    error = null;
    if (!usernameInput || !prefecture) {
      error = "ユーザー名と都道府県を入力してください。";
      return;
    }
    submitting = true;
    try {
      account = await userApi.bootstrap({ username: usernameInput, prefecture });
      userAuth.setUser(account);
      userAuth.clearPendingProfile();
      loggedIn = true;
      editUsername = account.username;
      editPrefecture = account.prefecture ?? "";
      editEmail = account.email;
      notice = "アカウントの準備が完了しました。";
      await syncLocalBookmarks();
      await loadBookmarks();
      await continuePendingFork();
    } catch (e) { error = apiMessage(e); }
    finally { submitting = false; }
  }

  async function handleLogout() {
    await userAuth.signOut();
    loggedIn = false;
    account = null;
    bookmarks = [];
    await goto("/");
  }

  async function syncLocalBookmarks() {
    const ids = auth.getHistory().filter((item) => item.shioriId !== "demo" && item.token).map((item) => item.shioriId);
    try {
      for (let i = 0; i < ids.length; i += 50) await userApi.syncBookmarks(ids.slice(i, i + 50));
    } catch { /* 次回ログイン時に再同期する */ }
  }

  async function continuePendingFork() {
    const itineraryId = sessionStorage.getItem("tabitabi_pending_fork");
    if (!itineraryId) return;
    sessionStorage.removeItem("tabitabi_pending_fork");
    const result = await itineraryApi.fork(itineraryId);
    auth.setToken(result.id, result.title, result.token);
    await goto(`/itineraries/${result.id}`);
  }

  async function loadBookmarks() {
    try { bookmarks = (await userApi.getMyBookmarks()).bookmarks; }
    catch { error = "しおりの読み込みに失敗しました。"; }
  }

  async function updateProfile() {
    editError = null;
    if (!editUsername || !editPrefecture) { editError = "すべて入力してください。"; return; }
    submitting = true;
    try {
      account = await userApi.updateProfile({ username: editUsername, prefecture: editPrefecture });
      userAuth.setUser(account);
      editSuccess = "プロフィールを更新しました。";
      editSection = "none";
    } catch (e) { editError = apiMessage(e); }
    finally { submitting = false; }
  }

  async function changeEmail() {
    editError = null;
    submitting = true;
    try {
      await userAuth.requestEmailChange(editEmail);
      editSuccess = `${editEmail} に確認メールを送りました。リンクを開くと変更されます。`;
      editSection = "none";
    } catch (e) { editError = firebaseMessage(e); }
    finally { submitting = false; }
  }

  async function changePassword() {
    editError = null;
    if (newPassword.length < 8) { editError = "新しいパスワードは8文字以上で入力してください。"; return; }
    if (newPassword !== confirmPassword) { editError = "新しいパスワードが一致しません。"; return; }
    submitting = true;
    try {
      await userAuth.changePassword(currentPassword, newPassword);
      currentPassword = newPassword = confirmPassword = "";
      editSuccess = "パスワードを変更しました。";
      editSection = "none";
    } catch (e) { editError = firebaseMessage(e); }
    finally { submitting = false; }
  }

  async function toggleVisibility(id: string, current: boolean) {
    bookmarks = bookmarks.map((item) => item.itinerary_id === id ? { ...item, is_visible: !current } : item);
    try { await userApi.updateVisibility(id, { is_visible: !current }); }
    catch { bookmarks = bookmarks.map((item) => item.itinerary_id === id ? { ...item, is_visible: current } : item); }
  }

  async function republish(id: string) {
    if (publishingIds.has(id)) return;
    publishingIds = new Set([...publishingIds, id]);
    try { await itineraryApi.publish(id); await loadBookmarks(); }
    catch { error = "最新版の公開に失敗しました。"; }
    finally { publishingIds = new Set([...publishingIds].filter((item) => item !== id)); }
  }

  function errorCode(value: unknown): string {
    if (value instanceof Error) return value.message;
    return "UNKNOWN_ERROR";
  }

  function apiMessage(value: unknown): string {
    const code = errorCode(value);
    if (code === "USERNAME_ALREADY_EXISTS") return "このユーザー名はすでに使われています。";
    if (code === "EMAIL_ALREADY_EXISTS") return "このメールアドレスはすでに使われています。";
    return "処理に失敗しました。時間をおいてもう一度お試しください。";
  }

  function firebaseMessage(value: unknown): string {
    const code = (value as { code?: string })?.code ?? errorCode(value);
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "メールアドレスまたはパスワードが正しくありません。";
    if (code.includes("email-already-in-use")) return "このメールアドレスはすでに使われています。";
    if (code.includes("weak-password")) return "パスワードは8文字以上で入力してください。";
    if (code.includes("too-many-requests")) return "試行回数が多すぎます。しばらく待ってからお試しください。";
    if (code.includes("requires-recent-login")) return "安全のため、いったんログアウトして再ログインしてください。";
    if (code.includes("invalid-email")) return "メールアドレスの形式が正しくありません。";
    if (code === "PREFECTURE_REQUIRED") return "お住まいの都道府県を選択してください。";
    if (code === "FIREBASE_CONFIG_MISSING") return "認証設定が未完了です。管理者にお問い合わせください。";
    return "処理に失敗しました。時間をおいてもう一度お試しください。";
  }

  function formatDate(value: string) { return new Date(value).toLocaleDateString("ja-JP"); }
</script>

<svelte:head><title>マイページ - たびたび</title></svelte:head>

<PageShell title="マイページ">
  {#snippet children()}
    {#if loading}
      <div class="py-16 text-center text-gray-500">アカウントを確認しています...</div>
    {:else if !loggedIn}
      <section class="max-w-md mx-auto rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-6"><div class="grid place-items-center w-11 h-11 rounded-xl bg-indigo-600 text-white text-xl">✈</div><div><h2 class="text-xl font-bold text-gray-900">{mode === "register" ? "旅のアカウントを作る" : mode === "verify" ? "メールを確認してください" : mode === "forgot" ? "パスワードを再設定" : mode === "setup" ? "プロフィールを完成させる" : "おかえりなさい"}</h2><p class="text-xs text-gray-500 mt-1">Firebaseで安全にアカウントを管理します</p></div></div>
        {#if notice}<p class="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm" role="status">{notice}</p>{/if}
        {#if error}<p class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">{error}</p>{/if}

        {#if mode === "verify"}
          <div class="space-y-4"><p class="text-sm text-gray-600 leading-7"><strong>{verificationSentTo || email}</strong> に確認メールを送りました。リンクを開いたあと、下のボタンを押してください。</p><p class="p-3 rounded-lg border bg-white text-xs text-gray-500">既存アカウントも、これまでのパスワードでログイン後に一度だけ確認が必要です。</p><button onclick={checkVerification} disabled={submitting} class="primary">{submitting ? "確認中..." : "確認が完了しました"}</button><button onclick={resendVerification} disabled={submitting} class="secondary">確認メールを再送</button><button onclick={handleLogout} class="link">別のアカウントでログイン</button></div>
        {:else if mode === "forgot"}
          <form onsubmit={(event) => { event.preventDefault(); requestPasswordReset(); }} class="space-y-4"><p class="text-sm text-gray-600">登録したメールアドレスにFirebaseから再設定リンクを送ります。</p><label for="forgot-email">メールアドレス</label><input id="forgot-email" type="email" bind:value={email} autocomplete="email" required /><button type="submit" disabled={submitting} class="primary">{submitting ? "送信中..." : "再設定メールを送る"}</button><button type="button" onclick={() => mode = "login"} class="link">ログインに戻る</button></form>
        {:else if mode === "setup"}
          <form onsubmit={(event) => { event.preventDefault(); completeProfile(); }} class="space-y-4"><p class="text-sm text-gray-600">メール確認が完了しました。公開名とお住まいの地域を設定してください。</p><label for="setup-username">ユーザー名</label><input id="setup-username" bind:value={usernameInput} minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" required /><label for="setup-prefecture">お住まいの都道府県</label><select id="setup-prefecture" bind:value={prefecture} required><option value="" disabled>選択してください</option>{#each PREFECTURES as item}<option value={item}>{item}</option>{/each}</select><p class="text-xs text-gray-500">都道府県は旅の傾向改善に利用し、公開プロフィールには表示しません。</p><button type="submit" disabled={submitting} class="primary">{submitting ? "設定中..." : "利用を開始する"}</button></form>
        {:else}
          <form onsubmit={(event) => { event.preventDefault(); handleAuthSubmit(); }} class="space-y-4">
            {#if mode === "register"}<label for="username">ユーザー名</label><input id="username" bind:value={usernameInput} minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" required />{/if}
            <label for="email">メールアドレス</label><input id="email" type="email" bind:value={email} autocomplete="email" required />
            <label for="password">パスワード</label><input id="password" type="password" bind:value={password} minlength={mode === "register" ? 8 : undefined} maxlength="128" autocomplete={mode === "register" ? "new-password" : "current-password"} required />
            {#if mode === "register"}<label for="prefecture">お住まいの都道府県</label><select id="prefecture" bind:value={prefecture} required><option value="" disabled>選択してください</option>{#each PREFECTURES as item}<option value={item}>{item}</option>{/each}</select><p class="text-xs text-gray-500">公開されないプロフィール情報です。</p>{/if}
            <button type="submit" disabled={submitting} class="primary">{submitting ? "処理中..." : mode === "register" ? "確認メールを送る" : "ログイン"}</button>
          </form>
          {#if mode === "login"}<button onclick={() => mode = "forgot"} class="link mt-3">パスワードを忘れた方</button>{/if}
          <p class="mt-5 pt-5 border-t text-sm text-center text-gray-600">{mode === "login" ? "初めての方は " : "アカウントをお持ちの方は "}<button onclick={() => mode = mode === "login" ? "register" : "login"} class="text-indigo-600 font-semibold hover:underline">{mode === "login" ? "新規登録" : "ログイン"}</button></p>
        {/if}
      </section>
    {:else}
      <div class="flex justify-between items-center mb-6"><a href="/users/{account?.username}" class="text-sm text-indigo-600 hover:underline">@{account?.username} の公開プロフィール</a><button onclick={handleLogout} class="secondary compact">ログアウト</button></div>
      {#if editSuccess}<p class="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm" role="status">{editSuccess}</p>{/if}
      {#if error}<p class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</p>{/if}

      <section class="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div class="flex items-center gap-2"><h2 class="font-semibold text-gray-900">アカウント設定</h2><span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">メール確認済み</span></div><p class="text-sm text-gray-500 mt-1">{account?.email} · {account?.prefecture}</p></div>{#if editSection === "none"}<div class="flex flex-wrap gap-2"><button onclick={() => editSection = "profile"} class="secondary compact">プロフィール</button><button onclick={() => { editEmail = account?.email ?? ""; editSection = "email"; }} class="secondary compact">メール変更</button><button onclick={() => editSection = "password"} class="secondary compact">パスワード</button></div>{/if}</div>
        {#if editSection !== "none"}<div class="mt-5 pt-5 border-t">{#if editError}<p class="mb-3 text-sm text-red-600">{editError}</p>{/if}
          {#if editSection === "profile"}<form onsubmit={(event) => { event.preventDefault(); updateProfile(); }} class="space-y-3"><label for="edit-username">ユーザー名</label><input id="edit-username" bind:value={editUsername} minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required /><label for="edit-prefecture">お住まいの都道府県</label><select id="edit-prefecture" bind:value={editPrefecture} required>{#each PREFECTURES as item}<option value={item}>{item}</option>{/each}</select><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">保存</button></div></form>
          {:else if editSection === "email"}<form onsubmit={(event) => { event.preventDefault(); changeEmail(); }} class="space-y-3"><label for="edit-email">新しいメールアドレス</label><input id="edit-email" type="email" bind:value={editEmail} autocomplete="email" required /><p class="text-xs text-gray-500">新しいアドレスに届く確認リンクを開くまで変更されません。</p><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">確認メールを送る</button></div></form>
          {:else}<form onsubmit={(event) => { event.preventDefault(); changePassword(); }} class="space-y-3"><label for="current-password">現在のパスワード</label><input id="current-password" type="password" bind:value={currentPassword} autocomplete="current-password" required /><label for="new-password">新しいパスワード</label><input id="new-password" type="password" bind:value={newPassword} minlength="8" autocomplete="new-password" required /><label for="confirm-password">新しいパスワード（確認）</label><input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" required /><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">変更する</button></div></form>{/if}
        </div>{/if}
      </section>

      <h2 class="text-lg font-semibold mb-3">保存したしおり</h2>
      {#if bookmarks.length === 0}<div class="py-12 text-center rounded-xl border bg-white text-gray-500">保存したしおりはまだありません</div>{:else}<div class="space-y-3">{#each bookmarks as item}<article class="bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div class="min-w-0"><a href="/itineraries/{item.itinerary_id}" class="font-medium text-gray-900 hover:text-indigo-600 block truncate">{item.title}</a><p class="text-xs text-gray-500 mt-1">更新 {formatDate(item.itinerary_updated_at)}</p></div><div class="flex items-center gap-2">{#if item.is_visible && item.shared_itinerary_id}<button onclick={() => republish(item.itinerary_id)} disabled={publishingIds.has(item.itinerary_id)} class="secondary compact">{publishingIds.has(item.itinerary_id) ? "更新中" : "最新版を公開"}</button>{/if}<label class="inline-flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={item.is_visible} onchange={() => toggleVisibility(item.itinerary_id, item.is_visible)} />公開</label></div></article>{/each}</div>{/if}
    {/if}
  {/snippet}
</PageShell>

<style>
  label { display: block; font-size: .875rem; font-weight: 500; color: rgb(55 65 81); }
  input, select { width: 100%; border: 1px solid rgb(209 213 219); border-radius: .5rem; padding: .625rem .75rem; font-size: .875rem; background: white; }
  input:focus, select:focus { outline: 2px solid rgb(99 102 241); outline-offset: 1px; }
  .primary, .secondary, .link { width: 100%; border-radius: .5rem; padding: .625rem .875rem; font-size: .875rem; font-weight: 600; }
  .primary { background: rgb(79 70 229); color: white; }
  .primary:hover { background: rgb(67 56 202); }
  .secondary { border: 1px solid rgb(199 210 254); color: rgb(67 56 202); background: white; }
  .secondary:hover { background: rgb(238 242 255); }
  .link { color: rgb(79 70 229); font-weight: 500; }
  .link:hover { text-decoration: underline; }
  .compact { width: auto; padding: .45rem .75rem; }
  .actions { display: flex; justify-content: flex-end; gap: .5rem; padding-top: .5rem; }
  button:disabled { opacity: .55; cursor: not-allowed; }
</style>
