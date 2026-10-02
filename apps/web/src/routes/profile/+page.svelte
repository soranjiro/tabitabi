<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { userApi } from "$lib/api/user";
  import { itineraryApi } from "$lib/api/itinerary";
  import { userAuth } from "$lib/user-auth";
  import { auth } from "$lib/auth";
  import BookShelf from "$lib/sharing/BookShelf.svelte";
  import JapanMap from "$lib/explore/JapanMap.svelte";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import IconAirplane from "../home/icons/IconAirplane.svelte";
  import ProfileIcon from "./ProfileIcon.svelte";
  import { PREFECTURES, type Prefecture, type PublicFeedItem, type UserBookmarkWithItinerary, type UserSessionProfile } from "@tabitabi/types";

  type Mode = "login" | "register" | "verify" | "forgot" | "setup";
  const usernamePattern = "[\\p{L}\\p{N}\\p{M}]+";
  const betaMailNotice = "現在はベータ版のため noreply@tabitabi-47ccd.firebaseapp.com というアカウントから確認メールが届きます。迷惑メールに含まれていないか確認してください。";

  let mode = $state<Mode>("login");
  let loading = $state(true);
  let submitting = $state(false);
  let loggedIn = $state(false);
  let account = $state<UserSessionProfile | null>(null);
  let bookmarks: UserBookmarkWithItinerary[] = $state([]);
  let favoriteItineraries: PublicFeedItem[] = $state([]);
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
  let showAccount = $state(false);
  let showPassword = $state(false);
  let showLogoutConfirm = $state(false);
  let shareFocusToken = $state(0);
  let activeTab = $state<"itineraries" | "favorites" | "map">("itineraries");
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
      await Promise.all([loadBookmarks(), loadFavoriteItineraries()]);
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
      notice = `確認メールを再送しました。${betaMailNotice}`;
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
      await Promise.all([loadBookmarks(), loadFavoriteItineraries()]);
      await continuePendingAction();
    } catch (e) { error = apiMessage(e); }
    finally { submitting = false; }
  }

  async function handleLogout() {
    showLogoutConfirm = false;
    await userAuth.signOut();
    loggedIn = false;
    account = null;
    bookmarks = [];
    favoriteItineraries = [];
    await goto("/");
  }

  function requestLogout() {
    showLogoutConfirm = true;
  }

  async function syncLocalBookmarks() {
    const ids = auth.getHistory().filter((item) => item.shioriId !== "demo" && item.token).map((item) => item.shioriId);
    try {
      for (let i = 0; i < ids.length; i += 50) await userApi.syncBookmarks(ids.slice(i, i + 50));
    } catch { /* 次回ログイン時に再同期する */ }
  }

  async function continuePendingAction() {
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

  async function loadFavoriteItineraries() {
    try { favoriteItineraries = (await userApi.getFavoriteItineraries()).items; }
    catch { error = "お気に入りの読み込みに失敗しました。"; }
  }

  function handleFavoriteChange(itineraryId: string, favorited: boolean) {
    if (!favorited) favoriteItineraries = favoriteItineraries.filter((item) => item.itinerary_id !== itineraryId);
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
      editSuccess = `${editEmail} に確認メールを送りました。リンクを開くと変更されます。${betaMailNotice}`;
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

  function openShareSettings() {
    activeTab = "itineraries";
    shareFocusToken += 1;
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => document.getElementById("profile-library")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function openVisitedMap() {
    activeTab = "map";
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => document.getElementById("profile-library")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function formatDate(value: string) { return new Date(value).toLocaleDateString("ja-JP"); }
</script>

<svelte:head>
  <title>{loggedIn ? "マイページ" : "ログイン / 新規登録"} - たびたび</title>
  <meta name="theme-color" content="#fffdf9" />
</svelte:head>

<div class="profile-page">
  <header class="brand-header">
    <div class="brand-header-inner">
      <a href="/" class="brand-link" aria-label="たびたびのトップへ戻る">
        <span class="brand-mark" aria-hidden="true"><IconAirplane size={20} /></span>
        <span>たびたび</span>
      </a>
    </div>
  </header>

  {#if loading}
    <main class="loading-state" aria-live="polite">
      <span class="loading-plane" aria-hidden="true">✈</span>
      <p>アカウントを確認しています...</p>
    </main>
  {:else if !loggedIn}
    <main class="auth-layout">
      <section class="auth-hero" aria-labelledby="auth-title">
        <div>
          <p class="eyebrow">TABITABI ACCOUNT</p>
          <h1 id="auth-title">
            {mode === "verify"
              ? "メールを確認してください。"
              : mode === "forgot"
                ? "パスワードを再設定。"
                : mode === "setup"
                  ? "旅のプロフィールを整える。"
                  : "ログイン / 新規登録"}
          </h1>
          <p class="auth-lead">
            {mode === "verify"
              ? "届いた確認メールから手続きを完了すると、旅の本棚を使えます。"
              : mode === "forgot"
                ? "登録したメールアドレスへ、再設定の案内をお送りします。"
                : mode === "setup"
                  ? "最後に公開名と地域を設定して、旅の本棚を完成させましょう。"
                  : "旅の予定を、もっと自由に、もっと楽しく。"}
          </p>
        </div>

        <svg class="auth-illustration" viewBox="0 0 320 180" aria-hidden="true">
          <path class="route-line" d="M14 151c43-2 53-34 86-38 34-4 42 23 71 17 33-7 39-47 77-55 21-5 37 1 56 14" />
          <rect class="soft-fill" x="174" y="31" width="70" height="101" rx="15" />
          <rect class="route-line" x="168" y="25" width="70" height="101" rx="15" />
          <circle class="route-line" cx="203" cy="62" r="16" />
          <path class="route-line" d="M203 50v24m-10-8 10-5 10 5m-16 17h26m-26 10h21" />
          <path class="route-line" d="m244 91 44 12-9 34-44-12z" />
          <path class="route-line" d="m252 104 25 7m-27 4 20 6" />
          <path class="route-line plane" d="m270 55 35-15-10 35-8-11-17-9Z" />
        </svg>
      </section>

      <section class="auth-card" aria-label="アカウント認証">
        {#if mode === "login" || mode === "register"}
          <div class="auth-switch" role="tablist" aria-label="ログインと新規登録">
            <button
              type="button"
              class:active={mode === "login"}
              role="tab"
              aria-selected={mode === "login"}
              onclick={() => { mode = "login"; error = null; notice = null; }}
            >ログイン</button>
            <button
              type="button"
              class:active={mode === "register"}
              role="tab"
              aria-selected={mode === "register"}
              onclick={() => { mode = "register"; error = null; notice = null; }}
            >新規登録</button>
          </div>
        {/if}

        {#if notice}
          <p class="notice success" role="status">{notice}</p>
        {/if}
        {#if error}
          <p class="notice error" role="alert">{error}</p>
        {/if}

        {#if mode === "verify"}
          <div class="auth-state">
            <span class="state-icon" aria-hidden="true"><ProfileIcon name="mail" size={23} /></span>
            <h2>確認メールを送りました</h2>
            <p><strong>{verificationSentTo || email}</strong> に届いたメールのリンクを開いてください。</p>
            <div class="beta-mail-note">
              <strong>確認メールについて</strong>
              <span>{betaMailNotice}</span>
            </div>
            <p class="subtle-note">既存アカウントも、これまでのパスワードでログイン後に一度だけ確認が必要です。</p>
            <button onclick={checkVerification} disabled={submitting} class="primary auth-submit">
              {submitting ? "確認中..." : "確認が完了しました"}
              <span aria-hidden="true">→</span>
            </button>
            <button onclick={resendVerification} disabled={submitting} class="secondary auth-submit">確認メールを再送</button>
            <button onclick={requestLogout} class="text-link">別のアカウントでログイン</button>
          </div>
        {:else if mode === "forgot"}
          <form onsubmit={(event) => { event.preventDefault(); requestPasswordReset(); }} class="auth-form">
            <div class="field-group">
              <label for="forgot-email">メールアドレス</label>
              <div class="input-shell">
                <input id="forgot-email" type="email" bind:value={email} autocomplete="email" placeholder="例：taro@tabitabi.jp" required />
              </div>
            </div>
            <button type="submit" disabled={submitting} class="primary auth-submit">
              {submitting ? "送信中..." : "再設定メールを送る"} <span aria-hidden="true">→</span>
            </button>
            <button type="button" onclick={() => mode = "login"} class="text-link">ログインに戻る</button>
          </form>
        {:else if mode === "setup"}
          <form onsubmit={(event) => { event.preventDefault(); completeProfile(); }} class="auth-form">
            <div class="field-group">
              <label for="setup-username">ユーザー名</label>
              <div class="input-shell">
                <input id="setup-username" bind:value={usernameInput} minlength="3" maxlength="20" pattern={usernamePattern} title="3〜20文字の日本語・英数字が使えます" autocomplete="username" required />
              </div>
            </div>
            <div class="field-group">
              <label for="setup-prefecture">お住まいの都道府県</label>
              <div class="input-shell select-shell">
                <select id="setup-prefecture" bind:value={prefecture} required>
                  <option value="" disabled>選択してください</option>
                  {#each PREFECTURES as item}<option value={item}>{item}</option>{/each}
                </select>
              </div>
              <p class="field-help">都道府県は旅の傾向改善に利用し、公開プロフィールには表示しません。</p>
            </div>
            <button type="submit" disabled={submitting} class="primary auth-submit">
              {submitting ? "設定中..." : "利用を開始する"} <span aria-hidden="true">→</span>
            </button>
          </form>
        {:else}
          <form onsubmit={(event) => { event.preventDefault(); handleAuthSubmit(); }} class="auth-form">
            {#if mode === "register"}
              <div class="field-group">
                <label for="username">ユーザー名 <em>*</em></label>
                <div class="input-shell">
                    <input id="username" bind:value={usernameInput} minlength="3" maxlength="20" pattern={usernamePattern} title="3〜20文字の日本語・英数字が使えます" autocomplete="username" placeholder="例：tabitabitaro" required />
                </div>
              </div>
            {/if}

            <div class="field-group">
              <label for="email">メールアドレス <em>*</em></label>
              <div class="input-shell">
                <input id="email" type="email" bind:value={email} autocomplete="email" placeholder="例：taro@tabitabi.jp" required />
              </div>
            </div>

            <div class="field-group">
              <label for="password">パスワード <em>*</em></label>
              <div class="input-shell">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  bind:value={password}
                  minlength={mode === "register" ? 8 : undefined}
                  maxlength="128"
                  autocomplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder={mode === "register" ? "8文字以上で入力" : "パスワードを入力してください"}
                  required
                />
                <button
                  type="button"
                  class="visibility-toggle"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  aria-pressed={showPassword}
                  onclick={() => showPassword = !showPassword}
                ><ProfileIcon name={showPassword ? "eye-off" : "eye"} size={20} /></button>
              </div>
            </div>

            {#if mode === "register"}
              <div class="field-group">
                <label for="prefecture">お住まいの都道府県 <em>*</em></label>
                <div class="input-shell select-shell">
                    <select id="prefecture" bind:value={prefecture} required>
                    <option value="" disabled>選択してください</option>
                    {#each PREFECTURES as item}<option value={item}>{item}</option>{/each}
                  </select>
                </div>
                <p class="field-help">公開されないプロフィール情報です。</p>
              </div>
              <div class="beta-mail-note">
                <strong>登録後の確認メールについて</strong>
                <span>{betaMailNotice}</span>
              </div>
            {/if}

            <button type="submit" disabled={submitting} class="primary auth-submit">
              {submitting ? "処理中..." : mode === "register" ? "確認メールを送る" : "ログイン"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {#if mode === "login"}
            <button onclick={() => mode = "forgot"} class="text-link forgot-link">パスワードを忘れた方</button>
          {/if}

          <div class="auth-divider"><span>または</span></div>
          <button
            type="button"
            class="register-cta"
            onclick={() => mode = mode === "login" ? "register" : "login"}
          >
            {mode === "login" ? "新規登録する" : "ログインに戻る"}
            <span aria-hidden="true">→</span>
          </button>
        {/if}

        <p class="security-note"><span aria-hidden="true"><ProfileIcon name="lock" size={15} /></span> Firebase Authentication で安全にアカウントを管理します</p>
      </section>

      <footer class="auth-footer">
        <p>たびたびで、<br />次の旅をつくろう。</p>
        <svg viewBox="0 0 360 95" aria-hidden="true">
          <path d="M0 64c48-20 83 17 126 1 55-21 74-54 132-31 38 15 51 30 102 8" />
          <path d="m298 26 31-12-13 28-7-9-11-7Z" />
        </svg>
      </footer>
    </main>
  {:else}
    <main class="dashboard-layout">
      <section class="dashboard-heading">
        <p class="eyebrow">MY JOURNEYS</p>
        <h1>マイページ</h1>
        <p>つくった旅が、もっと広がる。</p>
      </section>

      <section class="dashboard-hero">
        <div class="hero-background" aria-hidden="true"></div>
        <div class="hero-content">
          <div class="avatar">{account?.username.slice(0, 1).toUpperCase()}</div>
          <div class="hero-copy">
            <p>旅の本棚</p>
            <h2>こんにちは、{account?.username}さん</h2>
            <span>{bookmarks.length}の旅　{bookmarks.filter(item => item.is_visible).length}つの共有</span>
          </div>
          <a class="create-journey" href="/#create"><ProfileIcon name="plus" size={18} /> しおりを作る <ProfileIcon name="arrow-right" size={17} /></a>
          <div class="hero-line-art" aria-hidden="true">
            <svg viewBox="0 0 240 105">
              <path d="M8 91c46-12 45-61 95-56 29 3 35 23 59 10 24-14 27-37 62-36" />
              <path d="m202 8 28-7-12 24-7-8-9-9Z" />
            </svg>
            <span>次の旅を、<br />つくろう。</span>
          </div>
        </div>
      </section>

      {#if editSuccess}<p class="notice success dashboard-notice" role="status">{editSuccess}</p>{/if}
      {#if error}<p class="notice error dashboard-notice" role="alert">{error}</p>{/if}

      <section class="account-actions" aria-label="アカウント操作">
        <button type="button" onclick={() => showAccount = !showAccount} aria-expanded={showAccount}>
          <span class="action-icon" aria-hidden="true"><ProfileIcon name="user" size={20} /></span>
          <span><strong>アカウント設定</strong><small>プロフィール・メールなど</small></span>
        </button>
        <button type="button" onclick={openShareSettings}>
          <span class="action-icon" aria-hidden="true"><ProfileIcon name="share" size={20} /></span>
          <span><strong>共有設定</strong><small>共有中のしおりを管理</small></span>
        </button>
        <button type="button" class="logout-action" onclick={requestLogout}>
          <span class="action-icon" aria-hidden="true"><ProfileIcon name="logout" size={20} /></span>
          <span><strong>ログアウト</strong><small>アカウントからサインアウト</small></span>
        </button>
      </section>

      {#if showAccount}
        <section class="account-card" aria-labelledby="account-settings-title">
          <div class="account-card-heading">
            <div>
              <p class="eyebrow">ACCOUNT</p>
              <h2 id="account-settings-title">アカウント設定</h2>
              <p>{account?.email} · {account?.prefecture}</p>
            </div>
            <span class="verified-badge">メール確認済み</span>
          </div>

          {#if editSection === "none"}
            <div class="account-menu">
              <button onclick={() => editSection = "profile"}><span>プロフィール</span><small>ユーザー名・都道府県</small><b aria-hidden="true"><ProfileIcon name="chevron-right" size={18} /></b></button>
              <button onclick={() => { editEmail = account?.email ?? ""; editSection = "email"; }}><span>メールアドレス変更</span><small>{account?.email}</small><b aria-hidden="true"><ProfileIcon name="chevron-right" size={18} /></b></button>
              <button onclick={() => editSection = "password"}><span>パスワード変更</span><small>ログイン用パスワード</small><b aria-hidden="true"><ProfileIcon name="chevron-right" size={18} /></b></button>
              <a href="/users/{account?.username}"><span>公開プロフィール</span><small>ほかの人から見えるページ</small><b aria-hidden="true"><ProfileIcon name="chevron-right" size={18} /></b></a>
            </div>
          {:else}
            <div class="account-editor">
              {#if editError}<p class="notice error">{editError}</p>{/if}
              {#if editSection === "profile"}
                <form onsubmit={(event) => { event.preventDefault(); updateProfile(); }} class="settings-form">
                  <div class="field-group">
                    <label for="edit-username">ユーザー名</label>
                    <div class="input-shell"><input id="edit-username" bind:value={editUsername} minlength="3" maxlength="20" pattern={usernamePattern} title="3〜20文字の日本語・英数字が使えます" required /></div>
                  </div>
                  <div class="field-group">
                    <label for="edit-prefecture">お住まいの都道府県</label>
                    <div class="input-shell select-shell"><select id="edit-prefecture" bind:value={editPrefecture} required>{#each PREFECTURES as item}<option value={item}>{item}</option>{/each}</select></div>
                  </div>
                  <div class="settings-actions"><button type="button" onclick={() => editSection = "none"} class="secondary">キャンセル</button><button type="submit" disabled={submitting} class="primary">保存</button></div>
                </form>
              {:else if editSection === "email"}
                <form onsubmit={(event) => { event.preventDefault(); changeEmail(); }} class="settings-form">
                  <div class="field-group">
                    <label for="edit-email">新しいメールアドレス</label>
                    <div class="input-shell"><input id="edit-email" type="email" bind:value={editEmail} autocomplete="email" required /></div>
                    <p class="field-help">新しいアドレスに届く確認リンクを開くまで変更されません。</p>
                  </div>
                  <div class="beta-mail-note"><strong>確認メールについて</strong><span>{betaMailNotice}</span></div>
                  <div class="settings-actions"><button type="button" onclick={() => editSection = "none"} class="secondary">キャンセル</button><button type="submit" disabled={submitting} class="primary">確認メールを送る</button></div>
                </form>
              {:else}
                <form onsubmit={(event) => { event.preventDefault(); changePassword(); }} class="settings-form">
                  <div class="field-group"><label for="current-password">現在のパスワード</label><div class="input-shell"><input id="current-password" type="password" bind:value={currentPassword} autocomplete="current-password" required /></div></div>
                  <div class="field-group"><label for="new-password">新しいパスワード</label><div class="input-shell"><input id="new-password" type="password" bind:value={newPassword} minlength="8" autocomplete="new-password" required /></div></div>
                  <div class="field-group"><label for="confirm-password">新しいパスワード（確認）</label><div class="input-shell"><input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" required /></div></div>
                  <div class="settings-actions"><button type="button" onclick={() => editSection = "none"} class="secondary">キャンセル</button><button type="submit" disabled={submitting} class="primary">変更する</button></div>
                </form>
              {/if}
            </div>
          {/if}
        </section>
      {/if}

      <nav class="library-tabs" aria-label="マイページの表示切り替え">
        <button class:active={activeTab === "itineraries"} onclick={() => (activeTab = "itineraries")}>しおり</button>
        <button class:active={activeTab === "favorites"} onclick={() => (activeTab = "favorites")}>お気に入り</button>
        <button class:active={activeTab === "map"} onclick={() => (activeTab = "map")}>訪問マップ</button>
      </nav>

      <section id="profile-library" class="library-content">
        {#if activeTab === "map"}
          <section class="visited-map-card" aria-labelledby="visited-map-title">
            <div class="library-heading"><div><p>MY TRAVEL MAP</p><h2 id="visited-map-title">行った場所</h2></div><span>{Object.keys(visitedCounts).length}都道府県</span></div>
            <p class="map-intro">アカウントに紐づくしおりの旅行先を、しおりの件数で色分けしています。</p>
            <JapanMap counts={visitedCounts} variant="visited" />
          </section>
        {:else if activeTab === "favorites"}
          <div class="library-heading"><div><p>FAVORITES</p><h2>お気に入り</h2></div><span>{favoriteItineraries.length}件</span></div>
          {#if favoriteItineraries.length === 0}
            <div class="library-empty"><span>♡</span><h3>お気に入りはまだありません</h3><p>みんなのしおりで気になる旅程を保存すると、ここからいつでも確認できます。</p><a href="/explore">みんなのしおりを見る</a></div>
          {:else}
            <div class="favorite-grid">
              {#each favoriteItineraries as itinerary}
                <ItineraryCard {itinerary} compact onFavoriteChange={handleFavoriteChange} />
              {/each}
            </div>
          {/if}
        {:else}
          <BookShelf {bookmarks} onRefresh={loadBookmarks} onUnlink={(item) => unlinkTarget = item} focusShared={shareFocusToken} />
        {/if}
      </section>

      <nav class="mobile-nav" aria-label="メインナビゲーション">
        <a href="/" aria-label="ホーム"><span aria-hidden="true"><ProfileIcon name="home" size={21} /></span><small>ホーム</small></a>
        <a href="/explore" aria-label="見つける"><span aria-hidden="true"><ProfileIcon name="search" size={21} /></span><small>見つける</small></a>
        <a href="/#create" class="mobile-create" aria-label="しおりを作る"><span aria-hidden="true"><ProfileIcon name="plus" size={25} /></span><small>しおりを作る</small></a>
        <button type="button" class:active={activeTab === "map"} onclick={openVisitedMap} aria-label="訪問マップ"><span aria-hidden="true"><ProfileIcon name="map" size={21} /></span><small>地図</small></button>
        <a href="/profile" class="active" aria-current="page" aria-label="マイページ"><span aria-hidden="true"><ProfileIcon name="user" size={21} /></span><small>マイページ</small></a>
      </nav>

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
    </main>
  {/if}

  {#if showLogoutConfirm}
    <div class="logout-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showLogoutConfirm = false)}>
      <section class="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
        <span class="logout-dialog-icon" aria-hidden="true"><ProfileIcon name="logout" size={23} /></span>
        <h2 id="logout-title">ログアウトしますか？</h2>
        <p id="logout-description">この端末のアカウントからログアウトします。作成したしおりや共有内容は削除されません。</p>
        <div class="logout-dialog-actions">
          <button type="button" class="secondary" onclick={() => showLogoutConfirm = false}>キャンセル</button>
          <button type="button" class="logout-confirm" onclick={handleLogout}>ログアウト</button>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background: #fffdf9;
  }

  .profile-page {
    min-height: 100vh;
    color: var(--home-ink-strong, #17263d);
    background:
      radial-gradient(circle at 88% 4%, rgba(199, 229, 247, .46), transparent 28rem),
      linear-gradient(180deg, #fffdf9 0%, #fffefb 68%, #f8fbfd 100%);
    font-family: var(--home-font-sans);
  }

  .brand-header {
    padding: 1.15rem 1.25rem 0;
  }

  .brand-header-inner {
    width: min(100%, 960px);
    margin: 0 auto;
  }

  .brand-link {
    display: inline-flex;
    align-items: center;
    gap: .7rem;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 1.05rem;
    letter-spacing: .08em;
    text-decoration: none;
  }

  .brand-mark {
    display: grid;
    width: 2rem;
    height: 2rem;
    place-items: center;
    border: 1px solid #2b789f;
    border-radius: 50%;
    color: #2b789f;
    background: rgba(255,255,255,.78);
  }

  .brand-mark svg {
    width: 1.15rem;
    height: 1.15rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.45;
  }

  .loading-state {
    display: grid;
    min-height: 65vh;
    place-items: center;
    align-content: center;
    gap: .8rem;
    color: var(--home-muted);
  }

  .loading-plane {
    font-size: 1.65rem;
  }

  .loading-state p {
    margin: 0;
    font-size: .9rem;
  }

  .auth-layout,
  .dashboard-layout {
    width: min(calc(100% - 2rem), 960px);
    margin: 0 auto;
  }

  .auth-layout {
    padding: 2rem 0 3rem;
  }

  .auth-hero {
    position: relative;
    display: grid;
    min-height: 15.5rem;
    grid-template-columns: minmax(0, 1fr) minmax(14rem, .82fr);
    align-items: center;
    gap: 1.5rem;
  }

  .eyebrow {
    margin: 0 0 .45rem;
    color: #5f85a0;
    font-size: .67rem;
    font-weight: 800;
    letter-spacing: .17em;
  }

  .auth-hero h1,
  .dashboard-heading h1 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-weight: 500;
    letter-spacing: .06em;
  }

  .auth-hero h1 {
    max-width: 14ch;
    font-size: clamp(2.15rem, 5vw, 3.7rem);
    line-height: 1.34;
  }

  .auth-lead {
    max-width: 30rem;
    margin: 1rem 0 0;
    color: #52677c;
    font-family: var(--home-font-serif);
    font-size: clamp(.95rem, 2vw, 1.15rem);
    line-height: 1.95;
    letter-spacing: .06em;
  }

  .auth-illustration {
    width: 100%;
    max-width: 22rem;
    justify-self: end;
  }

  .route-line {
    fill: none;
    stroke: #286f93;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  .soft-fill {
    fill: rgba(196, 226, 244, .5);
  }

  .auth-card {
    width: min(100%, 47rem);
    margin: 0 auto;
    padding: clamp(1.4rem, 3vw, 2.2rem);
    border: 1px solid rgba(212, 222, 230, .8);
    border-radius: 2rem;
    background: rgba(255, 255, 255, .88);
    box-shadow: 0 20px 60px rgba(31, 58, 77, .08);
    backdrop-filter: blur(14px);
  }

  .auth-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-bottom: 2rem;
    padding: .35rem;
    border-radius: 1rem;
    background: #f4f2ed;
  }

  .auth-switch button {
    min-height: 3.2rem;
    border: 0;
    border-radius: .8rem;
    color: #7c8a9a;
    background: transparent;
    font: inherit;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
  }

  .auth-switch button.active {
    color: var(--home-ink-strong);
    background: #fff;
    box-shadow: 0 5px 18px rgba(34, 54, 73, .08);
  }

  .auth-form,
  .settings-form {
    display: grid;
    gap: 1.2rem;
  }

  .field-group {
    display: grid;
    gap: .52rem;
  }

  .field-group label {
    color: var(--home-ink-strong);
    font-size: .88rem;
    font-weight: 800;
  }

  .field-group em {
    color: #b44747;
    font-style: normal;
  }

  .input-shell {
    display: flex;
    min-height: 3.4rem;
    padding: 0 .95rem;
    border: 1px solid #cbd5df;
    border-radius: .9rem;
    align-items: center;
    gap: .65rem;
    background: rgba(255,255,255,.9);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }

  .input-shell:focus-within {
    border-color: #3f7898;
    box-shadow: 0 0 0 3px rgba(63, 120, 152, .11);
  }

  .input-shell > span {
    flex: 0 0 auto;
    color: #6f8194;
    font-size: .86rem;
  }

  .input-shell input,
  .input-shell select {
    width: 100%;
    min-width: 0;
    padding: .75rem 0;
    border: 0;
    outline: 0;
    color: var(--home-ink-strong);
    background: transparent;
    font: inherit;
    font-size: 1rem;
  }

  .input-shell input::placeholder {
    color: #a6b0bc;
  }

  .select-shell select {
    appearance: none;
  }

  .visibility-toggle {
    flex: 0 0 auto;
    width: 2.1rem;
    height: 2.1rem;
    border: 0;
    border-radius: 50%;
    color: #60788c;
    background: #eef4f7;
    font-size: .7rem;
    font-weight: 800;
    cursor: pointer;
  }

  .field-help {
    margin: 0;
    color: #778596;
    font-size: .75rem;
    line-height: 1.65;
  }

  .primary,
  .secondary,
  .register-cta,
  .text-link {
    font: inherit;
    cursor: pointer;
  }

  .primary,
  .secondary {
    border-radius: .9rem;
    padding: .85rem 1rem;
    font-size: .9rem;
    font-weight: 800;
  }

  .primary {
    border: 1px solid #1e6f91;
    color: #fff;
    background: linear-gradient(135deg, #17799f, #286b8b);
    box-shadow: 0 12px 30px rgba(33, 108, 139, .16);
  }

  .primary:hover {
    background: linear-gradient(135deg, #146b8c, #245f7c);
  }

  .secondary {
    border: 1px solid #c9d7e0;
    color: #315b73;
    background: #fff;
  }

  .auth-submit {
    display: flex;
    width: 100%;
    min-height: 3.65rem;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    border-radius: 999px;
    font-size: 1rem;
  }

  .text-link {
    display: block;
    width: 100%;
    padding: .3rem;
    border: 0;
    color: #23749a;
    background: transparent;
    font-size: .85rem;
    text-align: center;
    text-decoration: underline;
    text-underline-offset: .24rem;
  }

  .forgot-link {
    margin-top: 1rem;
  }

  .auth-divider {
    display: flex;
    margin: 1.5rem 0 1rem;
    align-items: center;
    gap: .8rem;
    color: #82909e;
    font-size: .76rem;
  }

  .auth-divider::before,
  .auth-divider::after {
    content: "";
    height: 1px;
    flex: 1;
    background: #dbe1e6;
  }

  .register-cta {
    display: flex;
    width: 100%;
    min-height: 3.45rem;
    border: 1px solid #2d7595;
    border-radius: 999px;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #196c90;
    background: #fff;
    font-size: .92rem;
    font-weight: 800;
  }

  .security-note {
    display: flex;
    margin: 1.3rem 0 0;
    align-items: center;
    justify-content: center;
    gap: .45rem;
    color: #7d8995;
    font-size: .72rem;
    text-align: center;
  }

  .notice {
    margin: 0 0 1rem;
    padding: .8rem 1rem;
    border: 1px solid;
    border-radius: .8rem;
    font-size: .8rem;
    line-height: 1.65;
  }

  .notice.success {
    border-color: #c7e5d6;
    color: #35634e;
    background: #f1faf5;
  }

  .notice.error {
    border-color: #eccdcd;
    color: #934848;
    background: #fff5f5;
  }

  .beta-mail-note {
    display: grid;
    gap: .28rem;
    padding: .9rem 1rem;
    border: 1px solid #d8e4eb;
    border-radius: .8rem;
    color: #50697b;
    background: #f5f9fb;
    font-size: .76rem;
    line-height: 1.7;
  }

  .beta-mail-note strong {
    color: #315c73;
    font-size: .78rem;
  }

  .auth-state {
    display: grid;
    gap: 1rem;
    text-align: center;
  }

  .state-icon {
    display: grid;
    width: 3.2rem;
    height: 3.2rem;
    margin: 0 auto;
    place-items: center;
    border-radius: 1rem;
    color: #fff;
    background: #24779a;
  }

  .auth-state h2 {
    margin: .2rem 0 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 1.55rem;
    font-weight: 500;
  }

  .auth-state p {
    margin: 0;
    color: #627486;
    font-size: .84rem;
    line-height: 1.75;
  }

  .subtle-note {
    padding: .8rem;
    border-radius: .75rem;
    background: #faf8f3;
  }

  .auth-footer {
    position: relative;
    display: grid;
    min-height: 8rem;
    margin-top: 2rem;
    align-items: center;
    overflow: hidden;
  }

  .auth-footer p {
    position: relative;
    z-index: 1;
    margin: 0 0 0 1rem;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 1.15rem;
    line-height: 1.8;
    letter-spacing: .06em;
  }

  .auth-footer svg {
    position: absolute;
    right: 0;
    bottom: 0;
    width: min(72%, 34rem);
    fill: none;
    stroke: #4c92b4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.4;
  }

  .dashboard-layout {
    padding: 2rem 0 4rem;
  }

  .dashboard-heading {
    margin-bottom: 1.25rem;
  }

  .dashboard-heading h1 {
    font-size: clamp(2.35rem, 5vw, 3.7rem);
  }

  .dashboard-heading > p:last-child {
    margin: .55rem 0 0;
    color: #66798b;
    font-family: var(--home-font-serif);
    letter-spacing: .07em;
  }

  .dashboard-hero {
    position: relative;
    min-height: 17rem;
    overflow: hidden;
    border: 1px solid rgba(198, 218, 230, .86);
    border-radius: 1.85rem;
    background: #dff1fb;
    box-shadow: 0 16px 42px rgba(33, 74, 95, .09);
  }

  .hero-background {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(224,244,254,.96) 0%, rgba(225,244,253,.78) 48%, rgba(218,238,247,.18) 100%),
      url('/hero/background-summer.avif') center 60% / cover no-repeat;
  }

  .hero-background::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 48%;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,.18));
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: grid;
    min-height: 17rem;
    padding: clamp(1.2rem, 3vw, 2rem);
    grid-template-columns: auto minmax(0, 1fr) minmax(12rem, .65fr);
    grid-template-rows: 1fr auto;
    align-items: center;
    gap: 1rem;
  }

  .avatar {
    display: grid;
    width: 4.7rem;
    height: 4.7rem;
    place-items: center;
    border-radius: 1.35rem;
    color: #fff;
    background: linear-gradient(135deg, #59aee6, #727de8);
    box-shadow: 0 10px 30px rgba(70, 118, 181, .2);
    font-size: 1.45rem;
    font-weight: 900;
  }

  .hero-copy p {
    margin: 0 0 .35rem;
    color: #2f83a9;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .12em;
  }

  .hero-copy h2 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: clamp(1.25rem, 3vw, 2rem);
    font-weight: 500;
    line-height: 1.45;
    letter-spacing: .04em;
  }

  .hero-copy span {
    display: block;
    margin-top: .45rem;
    color: #667b8c;
    font-size: .86rem;
  }

  .create-journey {
    display: inline-flex;
    width: fit-content;
    min-width: 18rem;
    min-height: 3.3rem;
    grid-column: 1 / 3;
    padding: 0 1.4rem;
    border-radius: 999px;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    color: white;
    background: #22799a;
    box-shadow: 0 12px 26px rgba(34, 121, 154, .19);
    font-size: .9rem;
    font-weight: 900;
    text-decoration: none;
  }

  .hero-line-art {
    position: relative;
    align-self: stretch;
    grid-column: 3;
    grid-row: 1 / 3;
  }

  .hero-line-art svg {
    position: absolute;
    inset: 18% 0 auto;
    width: 100%;
    fill: none;
    stroke: #236f90;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.4;
  }

  .hero-line-art span {
    position: absolute;
    right: 0;
    bottom: 1.2rem;
    color: #31566a;
    font-family: var(--home-font-serif);
    font-size: .86rem;
    line-height: 1.7;
    letter-spacing: .06em;
  }

  .dashboard-notice {
    margin: 1rem 0 0;
  }

  .account-actions {
    display: grid;
    margin-top: 1rem;
    padding: .55rem;
    border: 1px solid #e5e9ec;
    border-radius: 1.35rem;
    grid-template-columns: repeat(3, 1fr);
    background: rgba(255,255,255,.86);
    box-shadow: 0 10px 28px rgba(42, 65, 82, .055);
  }

  .account-actions button {
    display: grid;
    min-width: 0;
    padding: .95rem .7rem;
    border: 0;
    border-right: 1px solid #e8ecef;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: .7rem;
    color: var(--home-ink-strong);
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .account-actions button:last-child {
    border-right: 0;
  }

  .account-actions button:hover {
    border-radius: .9rem;
    background: #f8fafb;
  }

  .action-icon {
    display: grid;
    width: 2.4rem;
    height: 2.4rem;
    place-items: center;
    border-radius: .8rem;
    color: #246d8d;
    background: #eef7fb;
    font-size: .78rem;
    font-weight: 900;
  }

  .account-actions strong,
  .account-actions small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-actions strong {
    font-size: .82rem;
  }

  .account-actions small {
    margin-top: .2rem;
    color: #8a97a3;
    font-size: .64rem;
    font-weight: 500;
  }

  .logout-action strong {
    color: #704f52;
  }

  .account-card {
    margin-top: 1rem;
    padding: clamp(1rem, 2.5vw, 1.5rem);
    border: 1px solid #dfe7ec;
    border-radius: 1.25rem;
    background: rgba(255,255,255,.92);
    box-shadow: 0 12px 34px rgba(42, 65, 82, .065);
  }

  .account-card-heading {
    display: flex;
    margin-bottom: 1rem;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .account-card-heading h2 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 1.35rem;
    font-weight: 500;
  }

  .account-card-heading > div > p:last-child {
    margin: .35rem 0 0;
    color: #7b8794;
    font-size: .72rem;
  }

  .verified-badge {
    padding: .35rem .6rem;
    border-radius: 999px;
    color: #39745b;
    background: #edf8f2;
    font-size: .65rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .account-menu {
    display: grid;
    border-top: 1px solid #edf0f2;
  }

  .account-menu button,
  .account-menu a {
    display: grid;
    width: 100%;
    min-height: 4.1rem;
    padding: .75rem .2rem;
    border: 0;
    border-bottom: 1px solid #edf0f2;
    grid-template-columns: 1fr auto;
    align-items: center;
    color: var(--home-ink-strong);
    background: transparent;
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .account-menu span,
  .account-menu small {
    grid-column: 1;
  }

  .account-menu span {
    font-size: .82rem;
    font-weight: 800;
  }

  .account-menu small {
    margin-top: .15rem;
    color: #8a96a2;
    font-size: .68rem;
  }

  .account-menu b {
    grid-column: 2;
    grid-row: 1 / 3;
    color: #7c8c99;
    font-size: 1.35rem;
    font-weight: 400;
  }

  .account-editor {
    padding-top: .25rem;
  }

  .settings-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .7rem;
    margin-top: .35rem;
  }

  .library-tabs {
    display: grid;
    margin: 2rem 0 1rem;
    border-bottom: 1px solid #dce4e9;
    grid-template-columns: repeat(3, 1fr);
  }

  .library-tabs button {
    min-height: 3rem;
    border: 0;
    border-bottom: 2px solid transparent;
    color: #8b98a5;
    background: transparent;
    font: inherit;
    font-size: .84rem;
    font-weight: 800;
    cursor: pointer;
  }

  .library-tabs button.active {
    border-bottom-color: #2c7797;
    color: #236f90;
  }

  .library-content {
    scroll-margin-top: 1rem;
  }

  .visited-map-card {
    padding: 1.15rem;
    border: 1px solid #e1e7eb;
    border-radius: 1.1rem;
    background: #fff;
    box-shadow: 0 8px 22px rgba(47, 67, 103, .04);
  }

  .library-heading {
    display: flex;
    margin: 1.25rem 0 .9rem;
    align-items: flex-end;
    justify-content: space-between;
  }

  .visited-map-card .library-heading {
    margin-top: 0;
  }

  .library-heading p {
    margin: 0 0 .2rem;
    color: #5f85a0;
    font-size: .64rem;
    font-weight: 900;
    letter-spacing: .14em;
  }

  .library-heading h2 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 1.35rem;
    font-weight: 500;
  }

  .library-heading > span {
    padding: .35rem .6rem;
    border-radius: 999px;
    color: #527b94;
    background: #eef6fa;
    font-size: .68rem;
    font-weight: 800;
  }

  .map-intro {
    margin: -.2rem 0 1rem;
    color: #7d899d;
    font-size: .72rem;
  }

  .favorite-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: .9rem;
  }

  .library-empty {
    padding: 3rem 1rem;
    border: 1px dashed #cadbe5;
    border-radius: 1rem;
    color: #718096;
    background: rgba(255,255,255,.7);
    text-align: center;
  }

  .library-empty > span {
    display: block;
    color: #6e99b1;
    font-size: 1.5rem;
  }

  .library-empty h3 {
    margin: .65rem 0 .35rem;
    color: #344761;
  }

  .library-empty p {
    margin: 0 0 1rem;
    font-size: .75rem;
  }

  .library-empty a {
    display: inline-block;
    padding: .65rem .9rem;
    border-radius: .6rem;
    color: white;
    background: #28799a;
    font-size: .75rem;
    font-weight: 800;
    text-decoration: none;
  }

  .mobile-nav {
    display: none;
  }

  .publication-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    padding: 1rem;
    place-items: center;
    background: rgba(31, 45, 72, .52);
    backdrop-filter: blur(6px);
  }

  .publication-dialog {
    position: relative;
    width: min(29rem, 100%);
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    box-sizing: border-box;
    padding: 1.7rem;
    border-radius: 1.1rem;
    background: white;
    box-shadow: 0 24px 70px rgba(31,45,72,.25);
  }

  .dialog-close {
    position: absolute;
    right: .8rem;
    top: .8rem;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    color: #748197;
    background: #f0f3f7;
    font-size: 1.1rem;
    cursor: pointer;
  }

  .dialog-eyebrow {
    margin: 0;
    color: #6685c2;
    font-size: .62rem;
    font-weight: 900;
    letter-spacing: .14em;
  }

  .publication-dialog h2 {
    margin: .35rem 0 .55rem;
    color: #2b3e5e;
    font-size: 1.3rem;
  }

  .dialog-intro {
    margin: 0 0 1.1rem;
    color: #748096;
    font-size: .75rem;
    line-height: 1.7;
  }

  .unlink-dialog {
    max-width: 25rem;
  }

  .unlink-actions {
    display: flex;
    margin-top: 1.25rem;
    gap: .55rem;
  }

  .unlink-actions .cancel-button,
  .unlink-confirm {
    width: 50%;
    margin: 0;
    padding: .75rem;
    border-radius: .65rem;
    font: inherit;
    font-size: .78rem;
    font-weight: 900;
    cursor: pointer;
  }

  .unlink-actions .cancel-button {
    border: 1px solid #dce4f1;
    color: #64748b;
    background: white;
  }

  .unlink-confirm {
    border: 0;
    color: white;
    background: #a15d65;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  @media (max-width: 720px) {
    .brand-header {
      padding-inline: 1rem;
    }

    .auth-layout,
    .dashboard-layout {
      width: min(calc(100% - 1.5rem), 960px);
    }

    .auth-layout {
      padding-top: 1rem;
    }

    .auth-hero {
      min-height: 14rem;
      grid-template-columns: 1fr;
    }

    .auth-hero h1 {
      max-width: 10ch;
    }

    .auth-illustration {
      position: absolute;
      right: -.8rem;
      bottom: -.6rem;
      width: 45%;
      min-width: 10rem;
      opacity: .72;
    }

    .auth-lead {
      max-width: 62%;
      font-size: .9rem;
    }

    .auth-card {
      padding: 1.25rem;
      border-radius: 1.45rem;
    }

    .dashboard-layout {
      padding-top: 1.25rem;
      padding-bottom: 6.8rem;
    }

    .mobile-nav {
      position: fixed;
      z-index: 40;
      right: .65rem;
      bottom: max(.65rem, env(safe-area-inset-bottom));
      left: .65rem;
      display: grid;
      min-height: 4.35rem;
      padding: .35rem .45rem;
      border: 1px solid rgba(220, 228, 234, .9);
      border-radius: 1.35rem;
      grid-template-columns: repeat(5, 1fr);
      align-items: center;
      background: rgba(255, 255, 255, .94);
      box-shadow: 0 14px 42px rgba(28, 50, 66, .16);
      backdrop-filter: blur(18px);
    }

    .mobile-nav a,
    .mobile-nav button {
      display: grid;
      min-width: 0;
      height: 3.45rem;
      padding: .15rem;
      border: 0;
      place-items: center;
      align-content: center;
      gap: .18rem;
      color: #718091;
      background: transparent;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }

    .mobile-nav span {
      font-size: 1.05rem;
      font-weight: 800;
      line-height: 1;
    }

    .mobile-nav small {
      overflow: hidden;
      max-width: 100%;
      font-size: .54rem;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-nav .active {
      color: #1f7092;
    }

    .mobile-nav .mobile-create {
      position: relative;
      color: #1d718f;
    }

    .mobile-nav .mobile-create span {
      display: grid;
      width: 3rem;
      height: 3rem;
      margin-top: -.9rem;
      place-items: center;
      border-radius: 50%;
      color: white;
      background: linear-gradient(135deg, #1781a6, #256b8a);
      box-shadow: 0 8px 20px rgba(31, 113, 146, .25);
      font-size: 1.5rem;
      font-weight: 400;
    }

    .mobile-nav .mobile-create small {
      margin-top: -.05rem;
    }

    .dashboard-hero {
      min-height: 18rem;
      border-radius: 1.45rem;
    }

    .hero-content {
      min-height: 18rem;
      padding: 1.15rem;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto 1fr;
      align-content: start;
    }

    .avatar {
      width: 3.9rem;
      height: 3.9rem;
      border-radius: 1.1rem;
    }

    .hero-copy h2 {
      font-size: 1.3rem;
    }

    .hero-copy span {
      font-size: .76rem;
    }

    .create-journey {
      min-width: 0;
      width: 100%;
      grid-column: 1 / 3;
      grid-row: 3;
      align-self: end;
    }

    .hero-line-art {
      display: none;
    }

    .account-actions {
      grid-template-columns: repeat(3, 1fr);
      padding: .3rem;
    }

    .account-actions button {
      min-height: 5.4rem;
      padding: .65rem .35rem;
      border-right: 1px solid #e8ecef;
      grid-template-columns: 1fr;
      justify-items: center;
      gap: .35rem;
      text-align: center;
    }

    .action-icon {
      width: 2.15rem;
      height: 2.15rem;
    }

    .account-actions strong {
      font-size: .72rem;
    }

    .account-actions small {
      display: none;
    }

    .account-card-heading {
      display: grid;
    }

    .verified-badge {
      width: fit-content;
    }

    .library-tabs {
      margin-top: 1.45rem;
    }

    .library-tabs button {
      font-size: .76rem;
    }

    .publication-backdrop {
      padding: 0;
      align-items: end;
    }

    .publication-dialog {
      max-height: 92vh;
      border-radius: 1.1rem 1.1rem 0 0;
    }
  }

  @media (max-width: 430px) {
    .auth-hero {
      min-height: 12rem;
    }

    .auth-hero h1 {
      font-size: 2.05rem;
    }

    .auth-lead {
      max-width: 73%;
      line-height: 1.75;
    }

    .auth-illustration {
      width: 48%;
      opacity: .6;
    }

    .auth-card {
      padding: 1rem;
    }

    .auth-switch {
      margin-bottom: 1.3rem;
    }

    .auth-switch button {
      min-height: 2.9rem;
      font-size: .9rem;
    }

    .input-shell {
      min-height: 3.25rem;
    }

    .dashboard-heading h1 {
      font-size: 2.5rem;
    }

    .dashboard-heading > p:last-child {
      font-size: .82rem;
    }

    .hero-copy h2 {
      font-size: 1.14rem;
    }

    .account-actions {
      border-radius: 1rem;
    }

    .library-tabs button {
      padding-inline: .2rem;
      font-size: .72rem;
    }
  }
</style>