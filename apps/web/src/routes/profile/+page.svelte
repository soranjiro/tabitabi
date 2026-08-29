<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { userApi } from "$lib/api/user";
  import { itineraryApi } from "$lib/api/itinerary";
  import { userAuth } from "$lib/user-auth";
  import PageShell from "$lib/PageShell.svelte";
  import { auth } from "$lib/auth";
  import { prefectureName } from "$lib/explore/data";
  import JapanMap from "$lib/explore/JapanMap.svelte";
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
  let unlinkTarget = $state<UserBookmarkWithItinerary | null>(null);
  let activeTab = $state<"itineraries" | "map">("itineraries");
  const visitedCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const item of bookmarks) {
      for (const slug of item.prefecture_slugs ?? []) counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  });

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
      await continuePendingAction();
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
      await continuePendingAction();
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

  async function continuePendingAction() {
    const publishId = sessionStorage.getItem("tabitabi_pending_publish");
    if (publishId) {
      sessionStorage.removeItem("tabitabi_pending_publish");
      await goto(`/itineraries/${publishId}?publish=1`);
      return;
    }

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

  async function unpublish(id: string) {
    publishingIds = new Set([...publishingIds, id]);
    try {
      await userApi.unpublishBookmark(id);
      editSuccess = "みんなのしおりから取り下げました。公開用URLは引き続き利用できます。";
      await loadBookmarks();
    } catch {
      error = "公開の取り下げに失敗しました。";
    } finally {
      publishingIds = new Set([...publishingIds].filter((item) => item !== id));
    }
  }

  async function unlinkBookmark(id: string) {
    publishingIds = new Set([...publishingIds, id]);
    try {
      await userApi.unlinkBookmark(id);
      // ログイン時の履歴同期で、解除済みのしおりを直ちに再紐付けしない。
      auth.removeFromHistory(id);
      unlinkTarget = null;
      editSuccess = "アカウントからしおりの紐付けを解除しました。しおり自体は削除されていません。";
      await loadBookmarks();
    } catch {
      error = "しおりの紐付け解除に失敗しました。";
    } finally {
      publishingIds = new Set([...publishingIds].filter((item) => item !== id));
    }
  }

  async function republish(id: string) {
    if (publishingIds.has(id)) return;
    const item = bookmarks.find((bookmark) => bookmark.itinerary_id === id);
    if (!item) return;
    if (!item.prefecture_slugs?.length) {
      editSuccess = "公開前に、しおりの設定で旅行先を登録してください。";
      await goto(`/itineraries/${id}?metadata=1`);
      return;
    }
    publishingIds = new Set([...publishingIds, id]);
    try {
      await userApi.publishBookmark(id, {
        prefecture_slugs: item.prefecture_slugs,
        areas: item.areas ?? [],
        tags: item.tags ?? [],
      });
      editSuccess = "公開ページを最新版に更新しました。";
      await loadBookmarks();
    }
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
      <section class="dashboard-hero">
        <div class="avatar">{account?.username.slice(0, 1).toUpperCase()}</div>
        <div><p>TRAVEL LIBRARY</p><h2>@{account?.username} のしおり</h2><span>旅の編集・公開・更新を、ここからまとめて管理できます。</span></div>
        <div class="dashboard-links"><a href="/users/{account?.username}">公開プロフィール</a><a href="/explore">みんなのしおり</a><button onclick={handleLogout}>ログアウト</button></div>
      </section>
      {#if editSuccess}<p class="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm" role="status">{editSuccess}</p>{/if}
      {#if error}<p class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</p>{/if}

      <section class="account-card">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div class="flex items-center gap-2"><h2 class="font-semibold text-gray-900">アカウント設定</h2><span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">メール確認済み</span></div><p class="text-sm text-gray-500 mt-1">{account?.email} · {account?.prefecture}</p></div>{#if editSection === "none"}<div class="flex flex-wrap gap-2"><button onclick={() => editSection = "profile"} class="secondary compact">プロフィール</button><button onclick={() => { editEmail = account?.email ?? ""; editSection = "email"; }} class="secondary compact">メール変更</button><button onclick={() => editSection = "password"} class="secondary compact">パスワード</button></div>{/if}</div>
        {#if editSection !== "none"}<div class="mt-5 pt-5 border-t">{#if editError}<p class="mb-3 text-sm text-red-600">{editError}</p>{/if}
          {#if editSection === "profile"}<form onsubmit={(event) => { event.preventDefault(); updateProfile(); }} class="space-y-3"><label for="edit-username">ユーザー名</label><input id="edit-username" bind:value={editUsername} minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required /><label for="edit-prefecture">お住まいの都道府県</label><select id="edit-prefecture" bind:value={editPrefecture} required>{#each PREFECTURES as item}<option value={item}>{item}</option>{/each}</select><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">保存</button></div></form>
          {:else if editSection === "email"}<form onsubmit={(event) => { event.preventDefault(); changeEmail(); }} class="space-y-3"><label for="edit-email">新しいメールアドレス</label><input id="edit-email" type="email" bind:value={editEmail} autocomplete="email" required /><p class="text-xs text-gray-500">新しいアドレスに届く確認リンクを開くまで変更されません。</p><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">確認メールを送る</button></div></form>
          {:else}<form onsubmit={(event) => { event.preventDefault(); changePassword(); }} class="space-y-3"><label for="current-password">現在のパスワード</label><input id="current-password" type="password" bind:value={currentPassword} autocomplete="current-password" required /><label for="new-password">新しいパスワード</label><input id="new-password" type="password" bind:value={newPassword} minlength="8" autocomplete="new-password" required /><label for="confirm-password">新しいパスワード（確認）</label><input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" required /><div class="actions"><button type="button" onclick={() => editSection = "none"} class="secondary compact">キャンセル</button><button type="submit" disabled={submitting} class="primary compact">変更する</button></div></form>{/if}
        </div>{/if}
      </section>

      <nav class="library-tabs" aria-label="マイページの表示切り替え">
        <button class:active={activeTab === "itineraries"} onclick={() => (activeTab = "itineraries")}>保存したしおり</button>
        <button class:active={activeTab === "map"} onclick={() => (activeTab = "map")}>訪問マップ</button>
      </nav>

      {#if activeTab === "map"}
        <section class="visited-map-card" aria-labelledby="visited-map-title">
          <div class="library-heading"><div><p>MY TRAVEL MAP</p><h2 id="visited-map-title">行った場所</h2></div><span>{Object.keys(visitedCounts).length}都道府県</span></div>
          <p class="map-intro">アカウントに紐づくしおりの旅行先を、しおりの件数で色分けしています。</p>
          <JapanMap counts={visitedCounts} variant="visited" />
        </section>
      {:else}
        <div class="library-heading"><div><p>MY ITINERARIES</p><h2>保存したしおり</h2></div><span>{bookmarks.filter((item) => item.is_visible).length}件 公開中</span></div>
        {#if bookmarks.length === 0}
        <div class="library-empty"><span>✈</span><h3>最初のしおりを作りましょう</h3><p>作成したしおりは自動でここに保存され、完成後に公開できます。</p><a href="/#create">しおりを作る</a></div>
        {:else}
        <div class="bookmark-grid">
          {#each bookmarks as item}
            <article class:published={item.is_visible}>
              <div class="bookmark-status"><span>{item.is_visible ? "公開中" : "非公開"}</span><small>更新 {formatDate(item.itinerary_updated_at)}</small></div>
              <a class="bookmark-title" href="/itineraries/{item.itinerary_id}">{item.title}</a>
              {#if item.prefecture_slugs.length || item.tags.length}
                <div class="publication-meta">
                  {#each item.prefecture_slugs ?? [] as slug}<span>{prefectureName(slug)}</span>{/each}
                  {#each item.tags ?? [] as tag}<span>#{tag}</span>{/each}
                </div>
              {/if}
              {#if item.is_visible}
                <p class="publication-note">公開用ID: <a href="/itineraries/{item.shared_itinerary_id}">{item.shared_itinerary_id}</a></p>
              {:else}
                <p class="publication-note">公開すると、元の編集用IDとは別に閲覧専用IDを発行します。</p>
              {/if}
              <div class="bookmark-actions">
                <a href="/itineraries/{item.itinerary_id}">編集する</a>
                {#if item.is_visible}
                  <button onclick={() => republish(item.itinerary_id)} disabled={publishingIds.has(item.itinerary_id)}>{publishingIds.has(item.itinerary_id) ? "更新中…" : "最新版を反映"}</button>
                  <button class="danger" onclick={() => unpublish(item.itinerary_id)} disabled={publishingIds.has(item.itinerary_id)}>取り下げ</button>
                {:else}
                  <button class="publish-action" onclick={() => republish(item.itinerary_id)} disabled={publishingIds.has(item.itinerary_id)}>みんなに公開</button>
                  <button class="danger" onclick={() => (unlinkTarget = item)} disabled={publishingIds.has(item.itinerary_id)}>紐付けを解除</button>
                {/if}
              </div>
            </article>
          {/each}
        </div>
        {/if}
      {/if}

      {#if unlinkTarget}
        <div class="publication-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (unlinkTarget = null)}>
          <div class="publication-dialog unlink-dialog" role="dialog" aria-modal="true" aria-labelledby="unlink-title">
            <button class="dialog-close" onclick={() => (unlinkTarget = null)} aria-label="閉じる">×</button>
            <p class="dialog-eyebrow">UNLINK ITINERARY</p>
            <h2 id="unlink-title">紐付けを解除しますか？</h2>
            <p class="dialog-intro">「{unlinkTarget.title}」はこのアカウントのしおり一覧から見えなくなります。しおり自体や共有URLは削除されません。</p>
            <div class="unlink-actions">
              <button type="button" class="cancel-button" onclick={() => (unlinkTarget = null)}>キャンセル</button>
              <button type="button" class="unlink-confirm" onclick={() => unlinkBookmark(unlinkTarget!.itinerary_id)} disabled={publishingIds.has(unlinkTarget.itinerary_id)}>{publishingIds.has(unlinkTarget.itinerary_id) ? "解除しています…" : "紐付けを解除する"}</button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {/snippet}
</PageShell>

<style>
  .dashboard-hero { display: grid; grid-template-columns: auto 1fr auto; margin-bottom: 1.25rem; padding: 1.35rem; border: 1px solid #dce7f7; border-radius: 1.1rem; align-items: center; gap: 1rem; background: linear-gradient(135deg, #f3f8ff, #f3f1ff); }
  .avatar { display: grid; width: 3.25rem; height: 3.25rem; border-radius: 1rem; place-items: center; color: white; background: linear-gradient(135deg, #5ca4ee, #7b88ec); font-size: 1.2rem; font-weight: 900; }
  .dashboard-hero p, .library-heading p { margin: 0 0 .2rem; color: #718dc5; font-size: .65rem; font-weight: 900; letter-spacing: .14em; }
  .dashboard-hero h2 { margin: 0; color: #293b5c; font-size: 1.2rem; }
  .dashboard-hero span { display: block; margin-top: .25rem; color: #738098; font-size: .75rem; }
  .dashboard-links { display: flex; align-items: center; gap: .35rem; }
  .dashboard-links a, .dashboard-links button { width: auto; padding: .5rem .65rem; border: 0; border-radius: .55rem; color: #526f9f; background: rgba(255,255,255,.75); font-size: .68rem; font-weight: 700; text-decoration: none; cursor: pointer; }
  .account-card { margin-bottom: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f1; border-radius: .9rem; background: white; box-shadow: 0 8px 25px rgba(52, 72, 110, .05); }
  .library-heading { display: flex; margin: 1.8rem 0 .85rem; align-items: flex-end; justify-content: space-between; }
  .library-heading h2 { margin: 0; color: #293b5b; font-size: 1.2rem; }
  .library-heading > span { padding: .35rem .6rem; border-radius: 999px; color: #5271ac; background: #edf3ff; font-size: .68rem; font-weight: 800; }
  .library-tabs { display: flex; margin: 1.7rem 0 1rem; border-bottom: 1px solid #e2e8f1; gap: .25rem; }
  .library-tabs button { padding: .7rem 1rem; border: 0; border-bottom: 2px solid transparent; color: #8794a8; background: transparent; font-size: .78rem; font-weight: 800; cursor: pointer; }
  .library-tabs button.active { border-bottom-color: #547bd0; color: #426bc0; }
  .visited-map-card { padding: 1.15rem; border: 1px solid #e1e7f0; border-radius: .9rem; background: white; box-shadow: 0 7px 20px rgba(47, 67, 103, .04); }
  .visited-map-card .library-heading { margin-top: 0; }
  .map-intro { margin: -.35rem 0 1rem; color: #7d899d; font-size: .72rem; }
  .bookmark-grid { display: grid; gap: .8rem; }
  .bookmark-grid article { padding: 1.15rem; border: 1px solid #e1e7f0; border-left: 4px solid #d6deea; border-radius: .9rem; background: white; box-shadow: 0 7px 20px rgba(47, 67, 103, .04); }
  .bookmark-grid article.published { border-left-color: #5d8be0; }
  .bookmark-status { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .bookmark-status span { padding: .25rem .5rem; border-radius: 999px; color: #68758a; background: #f0f3f7; font-size: .62rem; font-weight: 900; }
  .published .bookmark-status span { color: #3467bd; background: #eaf2ff; }
  .bookmark-status small { color: #99a3b2; font-size: .65rem; }
  .bookmark-title { display: block; margin-top: .7rem; overflow: hidden; color: #263751; font-size: 1rem; font-weight: 800; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  .bookmark-title:hover { color: #4d71cb; }
  .publication-meta { display: flex; flex-wrap: wrap; margin-top: .6rem; gap: .3rem; }
  .publication-meta span { padding: .25rem .4rem; border-radius: .35rem; color: #64748b; background: #f2f5f9; font-size: .62rem; }
  .publication-note { margin: .7rem 0 0; color: #8893a5; font-size: .66rem; line-height: 1.6; }
  .publication-note a { color: #5475ad; }
  .bookmark-actions { display: flex; flex-wrap: wrap; margin-top: .9rem; padding-top: .8rem; border-top: 1px solid #edf0f5; align-items: center; gap: .4rem; }
  .bookmark-actions a, .bookmark-actions button { width: auto; padding: .5rem .65rem; border: 1px solid #dce4f1; border-radius: .55rem; color: #4f6486; background: white; font-size: .68rem; font-weight: 800; text-decoration: none; cursor: pointer; }
  .bookmark-actions .publish-action { margin-left: auto; border-color: #547bd0; color: white; background: #547bd0; }
  .bookmark-actions .danger { margin-left: auto; border-color: transparent; color: #a15d65; background: transparent; }
  .library-empty { padding: 3rem 1rem; border: 1px dashed #cbd8eb; border-radius: 1rem; color: #718096; background: rgba(255,255,255,.65); text-align: center; }
  .library-empty > span { display: block; color: #6e91d4; font-size: 1.5rem; }
  .library-empty h3 { margin: .65rem 0 .35rem; color: #344761; }
  .library-empty p { margin: 0 0 1rem; font-size: .75rem; }
  .library-empty a { display: inline-block; padding: .65rem .9rem; border-radius: .6rem; color: white; background: #557bd0; font-size: .75rem; font-weight: 800; text-decoration: none; }
  .publication-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; padding: 1rem; place-items: center; background: rgba(31, 45, 72, .52); backdrop-filter: blur(6px); }
  .publication-dialog { position: relative; width: min(29rem, 100%); max-height: calc(100vh - 2rem); overflow-y: auto; box-sizing: border-box; padding: 1.7rem; border-radius: 1.1rem; background: white; box-shadow: 0 24px 70px rgba(31,45,72,.25); }
  .dialog-close { position: absolute; right: .8rem; top: .8rem; width: 2rem; height: 2rem; border: 0; border-radius: 50%; color: #748197; background: #f0f3f7; font-size: 1.1rem; cursor: pointer; }
  .dialog-eyebrow { margin: 0; color: #6685c2; font-size: .62rem; font-weight: 900; letter-spacing: .14em; }
  .publication-dialog h2 { margin: .35rem 0 .55rem; color: #2b3e5e; font-size: 1.3rem; }
  .dialog-intro { margin: 0 0 1.1rem; color: #748096; font-size: .75rem; line-height: 1.7; }
  .unlink-dialog { max-width: 25rem; }
  .unlink-actions { display: flex; margin-top: 1.25rem; gap: .55rem; }
  .unlink-actions .cancel-button, .unlink-confirm { width: 50%; margin: 0; padding: .75rem; border-radius: .65rem; font: inherit; font-size: .78rem; font-weight: 900; cursor: pointer; }
  .unlink-actions .cancel-button { border: 1px solid #dce4f1; color: #64748b; background: white; }
  .unlink-confirm { border: 0; color: white; background: #a15d65; }
  .unlink-confirm:disabled { cursor: wait; opacity: .55; }
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
  @media (max-width: 640px) {
    .dashboard-hero { grid-template-columns: auto 1fr; }
    .dashboard-links { grid-column: 1 / -1; flex-wrap: wrap; }
    .dashboard-hero span { line-height: 1.5; }
    .bookmark-actions .danger { margin-left: 0; }
    .publication-backdrop { padding: 0; align-items: end; }
    .publication-dialog { max-height: 92vh; border-radius: 1.1rem 1.1rem 0 0; }
  }
</style>
