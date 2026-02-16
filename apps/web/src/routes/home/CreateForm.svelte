<script lang="ts">
  import { goto } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import { auth } from "$lib/auth";
  import { defaultThemeId, getAvailableThemes } from "$lib/themes/catalog";

  let title = $state("");
  let password = $state("");
  let usePassword = $state(false);
  let theme_id = $state(defaultThemeId);
  let creating = $state(false);
  let titleError = $state("");

  let activeTab = $state<"create" | "add">("create");
  let url = $state("");
  let urlError = $state("");

  const themes = getAvailableThemes();

  async function createItinerary() {
    titleError = "";

    if (!title.trim()) {
      titleError = "タイトルを入力してください";
      return;
    }

    creating = true;
    try {
      const created = await itineraryApi.create({
        title: title.trim(),
        theme_id,
        password: usePassword && password.trim() ? password.trim() : undefined,
      });

      if (created.token) {
        auth.setToken(created.id, created.title, created.token);
      }

      goto(`/${created.id}`);
    } catch (error) {
      console.error("Failed to create:", error);
      alert("しおりの作成に失敗しました");
    } finally {
      creating = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !creating) {
      createItinerary();
    }
  }

  function handleUrlSubmit() {
    urlError = "";

    if (!url.trim()) {
      urlError = "URLを入力してください";
      return;
    }

    try {
      const urlObj = new URL(url.trim(), window.location.origin);

      if (urlObj.origin !== window.location.origin) {
        urlError = "このサイトのURLを入力してください";
        return;
      }

      const pathname = urlObj.pathname;
      const match = pathname.match(/^\/([a-zA-Z0-9_-]+)/);

      if (!match) {
        urlError = "無効なURLです";
        return;
      }

      const id = match[1];
      const token = urlObj.searchParams.get("token");

      if (token) {
        goto(`/${id}?token=${token}`);
      } else {
        goto(`/${id}`);
      }
    } catch {
      urlError = "無効なURLです";
    }
  }

  function handleUrlKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleUrlSubmit();
    }
  }
</script>

<div class="form-card">
  <div class="tab-bar">
    <button
      onclick={() => (activeTab = "create")}
      class="tab-btn {activeTab === 'create' ? 'active' : ''}"
    >
      作成
    </button>
    <button
      onclick={() => (activeTab = "add")}
      class="tab-btn {activeTab === 'add' ? 'active' : ''}"
    >
      追加
    </button>
  </div>

  {#if activeTab === "create"}
    <div class="form-body">
      <div class="form-group">
        <label for="title" class="form-label">
          タイトル <span class="required">*</span>
        </label>
        <input
          id="title"
          type="text"
          bind:value={title}
          onkeypress={handleKeyPress}
          placeholder="例: 沖縄旅行 2025"
          class="form-input {titleError ? 'error' : ''}"
        />
        {#if titleError}
          <p class="form-error">{titleError}</p>
        {/if}
      </div>

      <div class="form-group">
        <label for="theme" class="form-label">テーマ</label>
        <select id="theme" bind:value={theme_id} class="form-select">
          {#each themes as theme}
            <option value={theme.id}>{theme.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={usePassword} />
          <span class="checkbox-text">パスワードで保護する</span>
        </label>
      </div>

      {#if usePassword}
        <div class="form-group password-group">
          <label for="password" class="form-label">編集用パスワード</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="パスワードを入力"
            class="form-input"
          />
        </div>
      {/if}

      <button onclick={createItinerary} disabled={creating} class="btn-submit">
        {creating ? "作成中..." : "しおりを作成 →"}
      </button>
    </div>
  {:else}
    <div class="form-body">
      <p class="form-description">共有されたしおりのURLを貼り付け</p>
      <div class="form-group">
        <label for="url" class="form-label">
          しおりのURL <span class="required">*</span>
        </label>
        <input
          id="url"
          type="text"
          bind:value={url}
          onkeypress={handleUrlKeyPress}
          placeholder="https://tabitabi.pages.dev/..."
          class="form-input {urlError ? 'error' : ''}"
        />
        {#if urlError}
          <p class="form-error">{urlError}</p>
        {/if}
      </div>

      <button onclick={handleUrlSubmit} class="btn-submit"> 開く → </button>
    </div>
  {/if}
</div>

<style>
  .form-card {
    background: white;
    border-radius: 20px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-btn {
    flex: 1;
    padding: 1rem;
    background: none;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .tab-btn.active {
    color: #4b6cb7;
  }

  .tab-btn.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: #6b8cce;
    border-radius: 3px 3px 0 0;
  }

  .form-body {
    padding: 1.5rem;
  }

  .form-description {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 1rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #ef4444;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
    background: white;
    color: #333333;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #6b8cce;
    box-shadow: 0 0 0 3px rgba(107, 140, 206, 0.15);
  }

  .form-input.error {
    border-color: #ef4444;
  }

  .form-error {
    color: #ef4444;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .checkbox-group {
    margin-bottom: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #6b8cce;
    cursor: pointer;
  }

  .checkbox-text {
    font-size: 0.9rem;
    color: #374151;
  }

  .password-group {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 12px;
    margin-bottom: 1.25rem;
  }

  .password-group .form-label {
    margin-bottom: 0.5rem;
  }

  .password-group .form-input {
    background: white;
  }

  .btn-submit {
    width: 100%;
    background: linear-gradient(145deg, #73bbfa 0%, #41a0f4 60%, #299bff 100%);
    color: white;
    font-size: 1.125rem;
    font-weight: 700;
    padding: 1rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(107, 140, 206, 0.4);
  }

  .btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
