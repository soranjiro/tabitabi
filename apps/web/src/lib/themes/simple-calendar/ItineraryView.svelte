<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { authApi } from "$lib/api/auth";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import "./styles/index.css";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      memo?: string;
      walica_id?: string | null;
      secret_settings?: {
        enabled: boolean;
        offset_minutes: number;
      } | null;
    }) => Promise<void>;
    onCreateStep?: (data: {
      title: string;
      date: string;
      time: string;
      location?: string;
      notes?: string;
    }) => Promise<void>;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    itinerary,
    steps,
    onUpdateItinerary,
    onCreateStep,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  const themes = getAvailableThemes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isAddingStep = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let showThemeMenu = $state(false);
  let showSettingsMenu = $state(false);
  let editedMemo = $state(getMemoText(itinerary.memo));
  let password = $state("");
  let isAuthenticating = $state(false);
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let walicaId = $state(itinerary.walica_id ?? "");

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");

  // Sync newStep.time with hour/minute changes
  $effect(() => {
    const hour = newStepHour.padStart(2, "0");
    const minute = newStepMinute.padStart(2, "0");
    newStep.time = `${hour}:${minute}`;
  });

  onMount(() => {
    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = auth.hasEditPermission(itinerary.id);
    auth.updateAccessTime(itinerary.id, itinerary.title);
  });

  async function onPasswordAuth() {
    await handlePasswordAuth({
      shioriId: itinerary.id,
      title: itinerary.title,
      password,
      onSuccess: () => {
        hasEditPermission = true;
        showPasswordDialog = false;
        password = "";
      },
      onError: (message) => alert(message),
      setAuthenticating: (value) => (isAuthenticating = value),
    });
  }

  async function attemptEditModeActivation() {
    const token = auth.getToken(itinerary.id);

    if (token) {
      const isValid = await authApi.verifyToken(itinerary.id);
      if (isValid) {
        hasEditPermission = true;
        return;
      }
    }

    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
      return;
    }

    showPasswordDialog = true;
  }

  function exitEditMode() {
    hasEditPermission = false;
    isEditingTitle = false;
    isAddingStep = false;
  }

  async function handleTitleUpdate() {
    if (!editedTitle.trim()) {
      alert("タイトルは必須です");
      editedTitle = itinerary.title;
      isEditingTitle = false;
      return;
    }
    if (onUpdateItinerary) {
      await onUpdateItinerary({ title: editedTitle.trim() });
    }
    isEditingTitle = false;
  }

  async function handleCreateStep() {
    if (
      !newStep.title.trim() ||
      !newStep.date ||
      !newStepHour.trim() ||
      !newStepMinute.trim()
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    if (onCreateStep) {
      try {
        await onCreateStep({
          title: newStep.title.trim(),
          date: newStep.date,
          time: newStep.time,
          location: newStep.location.trim() || undefined,
          notes: newStep.notes.trim() || undefined,
        });

        newStep = { title: "", date: "", time: "", location: "", notes: "" };
        newStepHour = "09";
        newStepMinute = "00";
        isAddingStep = false;
      } catch (error) {
        console.error("Failed to create step:", error);
        alert("予定の作成に失敗しました");
      }
    }
  }

  async function handleMemoUpdate() {
    if (onUpdateItinerary) {
      const memoText = editedMemo.trim();
      const memo = updateMemoText(itinerary.memo, memoText);
      await onUpdateItinerary({ memo });
    }
    showMemoDialog = false;
  }

  async function handleThemeChange(themeId: string) {
    if (onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
    }
    showThemeMenu = false;
  }

  async function handleWalicaUpdate() {
    if (onUpdateItinerary) {
      const id = walicaId.trim() || null;
      await onUpdateItinerary({ walica_id: id });
      showSettingsMenu = false;
    }
  }

  async function handleSecretModeUpdate() {
    if (onUpdateItinerary) {
      await onUpdateItinerary({
        secret_settings: secretModeEnabled
          ? { enabled: true, offset_minutes: secretModeOffset }
          : null,
      });
      showSettingsMenu = false;
    }
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/${itinerary.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("閲覧URLをコピーしました");
    });
  }

  function copyEditUrl() {
    if (!auth.getToken(itinerary.id)) {
      alert("編集URLはコピーできません。編集モードでURLを確認してください。");
      return;
    }
    const token = auth.getToken(itinerary.id);
    const url = `${window.location.origin}/${itinerary.id}?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("編集URLをコピーしました");
    });
  }

  function handlePrint() {
    window.print();
  }

  function getStartAndEndDate(): { start: string; end: string } {
    if (steps.length === 0) return { start: "", end: "" };
    const dates = steps.map((s) => s.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  const { start, end } = $derived(getStartAndEndDate());
</script>

<div class="simple-calendar-theme">
  <header class="header">
    <div class="header-top">
      <button class="home-btn" onclick={() => goto("/")}> ホーム </button>
      <div class="header-spacer"></div>

      {#if hasEditPermission}
        <button class="mode-btn active" onclick={exitEditMode}>
          編集中を終了
        </button>
      {:else}
        <button class="mode-btn" onclick={attemptEditModeActivation}>
          編集
        </button>
      {/if}

      <button
        class="menu-btn"
        onclick={() => (showSettingsMenu = !showSettingsMenu)}
      >
        ≡
      </button>
    </div>

    {#if showSettingsMenu}
      <div class="settings-menu">
        <button onclick={() => copyShareUrl()}>閲覧URLをコピー</button>
        {#if hasEditPermission}
          <button onclick={() => copyEditUrl()}>編集URLをコピー</button>
          <button onclick={() => (showThemeMenu = true)}>テーマを変更</button>
          <button onclick={() => (showMemoDialog = true)}>メモを編集</button>
        {/if}
        <button onclick={() => handlePrint()}>印刷</button>
      </div>
    {/if}

    <div class="title-section">
      {#if isEditingTitle && hasEditPermission}
        <div class="title-input-group">
          <input
            type="text"
            bind:value={editedTitle}
            placeholder="タイトルを入力"
          />
          <button class="btn-save" onclick={handleTitleUpdate}>保存</button>
          <button
            class="btn-cancel"
            onclick={() => {
              editedTitle = itinerary.title;
              isEditingTitle = false;
            }}
          >
            キャンセル
          </button>
        </div>
      {:else}
        <h1
          class="title"
          ondblclick={hasEditPermission
            ? () => (isEditingTitle = true)
            : undefined}
        >
          {itinerary.title}
        </h1>
      {/if}

      {#if start && end}
        <div class="date-range">
          {new Date(start).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
          →
          {new Date(end).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </div>
      {/if}
    </div>
  </header>

  {#if showThemeMenu}
    <div class="dialog-overlay" onclick={() => (showThemeMenu = false)}>
      <div class="dialog" onclick={(e) => e.stopPropagation()}>
        <h2>テーマを選択</h2>
        <div class="theme-list">
          {#each themes as theme (theme.id)}
            <button
              class="theme-option"
              class:selected={theme.id === itinerary.theme_id}
              onclick={() => handleThemeChange(theme.id)}
            >
              <span class="theme-name">{theme.name}</span>
              <span class="theme-desc">{theme.description}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if showMemoDialog}
    <div class="dialog-overlay" onclick={() => (showMemoDialog = false)}>
      <div class="dialog" onclick={(e) => e.stopPropagation()}>
        <h2>メモ編集</h2>
        <textarea bind:value={editedMemo} placeholder="メモを入力"></textarea>
        <div class="dialog-actions">
          <button class="btn-primary" onclick={handleMemoUpdate}>保存</button>
          <button
            class="btn-secondary"
            onclick={() => {
              editedMemo = getMemoText(itinerary.memo);
              showMemoDialog = false;
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showPasswordDialog}
    <div class="dialog-overlay" onclick={() => (showPasswordDialog = false)}>
      <div class="dialog" onclick={(e) => e.stopPropagation()}>
        <h2>パスワード入力</h2>
        <input
          type="password"
          bind:value={password}
          placeholder="パスワード"
          onkeypress={(e) => e.key === "Enter" && onPasswordAuth()}
        />
        <div class="dialog-actions">
          <button
            class="btn-primary"
            onclick={onPasswordAuth}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? "確認中..." : "確認"}
          </button>
          <button
            class="btn-secondary"
            onclick={() => (showPasswordDialog = false)}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Memo Display (View Mode) -->
  {#if !hasEditPermission && itinerary.memo && getMemoText(itinerary.memo).trim()}
    <div class="memo-banner">
      <div class="memo-label">メモ</div>
      <div class="memo-text">
        {getMemoText(itinerary.memo)}
      </div>
    </div>
  {/if}

  <!-- Walica Display -->
  {#if itinerary.walica_id}
    <div class="walica-banner">
      <a
        href="https://walica.jp/group/{itinerary.walica_id}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Walicaグループを表示
      </a>
    </div>
  {/if}

  <!-- Secret Mode Indicator -->
  {#if itinerary.secret_settings?.enabled}
    <div class="secret-banner">
      シークレットモード有効 (公開まで {itinerary.secret_settings
        .offset_minutes}分)
    </div>
  {/if}

  <!-- Main Content -->
  <main class="main-content">
    <section class="section">
      <StepList {steps} {hasEditPermission} {onUpdateStep} {onDeleteStep} />
    </section>

    {#if hasEditPermission}
      <section class="section add-step-section">
        {#if isAddingStep}
          <div class="add-step-form">
            <h3>新しい予定を追加</h3>

            <div class="form-group">
              <label>タイトル *</label>
              <input
                type="text"
                bind:value={newStep.title}
                placeholder="予定のタイトル"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>日付 *</label>
                <input type="date" bind:value={newStep.date} />
              </div>
              <div class="form-group">
                <label>時刻 *</label>
                <div class="time-input">
                  <input
                    type="text"
                    bind:value={newStepHour}
                    maxlength="2"
                    placeholder="09"
                  />
                  <span>:</span>
                  <input
                    type="text"
                    bind:value={newStepMinute}
                    maxlength="2"
                    placeholder="00"
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>場所</label>
              <input
                type="text"
                bind:value={newStep.location}
                placeholder="場所（オプション）"
              />
            </div>

            <div class="form-group">
              <label>メモ</label>
              <textarea
                bind:value={newStep.notes}
                placeholder="メモ（オプション）"
              ></textarea>
            </div>

            <div class="form-actions">
              <button class="btn-primary" onclick={handleCreateStep}
                >追加</button
              >
              <button
                class="btn-secondary"
                onclick={() => {
                  isAddingStep = false;
                  newStep = {
                    title: "",
                    date: "",
                    time: "",
                    location: "",
                    notes: "",
                  };
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        {:else}
          <button class="btn-add-step" onclick={() => (isAddingStep = true)}>
            予定を追加
          </button>
        {/if}
      </section>

      <section class="section settings-section">
        <h3>Walica連携</h3>
        <div class="setting-item">
          <label>グループID</label>
          <input
            type="text"
            bind:value={walicaId}
            placeholder="グループIDを入力"
          />
          <button class="btn-save" onclick={handleWalicaUpdate}>保存</button>
        </div>
      </section>

      <section class="section settings-section">
        <h3>シークレットモード</h3>
        <div class="setting-item">
          <label>
            <input type="checkbox" bind:checked={secretModeEnabled} />
            シークレットモードを有効化
          </label>
          {#if secretModeEnabled}
            <div class="secret-setting">
              <label>公開まで待機する時間（分）</label>
              <input
                type="number"
                bind:value={secretModeOffset}
                min="1"
                step="1"
              />
            </div>
          {/if}
          <button class="btn-save" onclick={handleSecretModeUpdate}>保存</button
          >
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  .simple-calendar-theme {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: white;
  }

  .header {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e5e5;
    background: white;
    position: relative;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
  }

  .home-btn,
  .mode-btn,
  .menu-btn {
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
  }

  .home-btn:hover,
  .mode-btn:hover,
  .menu-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .mode-btn.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .header-spacer {
    flex: 1;
  }

  .menu-btn {
    padding: 8px 10px;
    min-width: 38px;
  }

  .settings-menu {
    position: absolute;
    right: 16px;
    top: 44px;
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    min-width: 180px;
  }

  .settings-menu button {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: #333;
    font-size: 13px;
    transition: background 0.2s;
  }

  .settings-menu button:hover {
    background: #f5f5f5;
  }

  .settings-menu button:first-child {
    border-radius: 8px 8px 0 0;
  }

  .settings-menu button:last-child {
    border-radius: 0 0 8px 8px;
  }

  .title-section {
    margin-bottom: 8px;
  }

  .title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #1f2937;
    word-break: break-word;
    cursor: default;
  }

  .title-input-group {
    display: flex;
    gap: 8px;
  }

  .title-input-group input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #2563eb;
    border-radius: 6px;
    font-size: 18px;
    font-weight: 700;
  }

  .title-input-group input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .btn-save,
  .btn-cancel {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }

  .btn-save {
    background: #2563eb;
    color: white;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .btn-cancel {
    background: #f0f0f0;
    color: #666;
  }

  .btn-cancel:hover {
    background: #e0e0e0;
  }

  .date-range {
    font-size: 13px;
    color: #999;
    margin-top: 6px;
  }

  .memo-banner {
    padding: 12px 16px;
    background: #f9fbff;
    border-bottom: 1px solid #e0e7ff;
    border-left: 3px solid #2563eb;
  }

  .memo-label {
    font-size: 11px;
    font-weight: 600;
    color: #2563eb;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .memo-text {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .walica-banner {
    padding: 12px 16px;
    background: #f0f9ff;
    border-bottom: 1px solid #bae6fd;
  }

  .walica-banner a {
    color: #2563eb;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }

  .walica-banner a:hover {
    text-decoration: underline;
  }

  .secret-banner {
    padding: 12px 16px;
    background: #fef3c7;
    border-bottom: 1px solid #fcd34d;
    font-size: 13px;
    color: #92400e;
    font-weight: 500;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
  }

  .section {
    border-bottom: 1px solid #e5e5e5;
  }

  .add-step-section,
  .settings-section {
    padding: 16px;
  }

  .settings-section h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .setting-item {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 12px;
  }

  .setting-item label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 6px;
  }

  .setting-item input[type="text"],
  .setting-item input[type="number"] {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    margin-bottom: 8px;
  }

  .setting-item input[type="checkbox"] {
    margin-right: 8px;
  }

  .secret-setting {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e5e5;
  }

  .secret-setting label {
    margin-bottom: 6px;
  }

  .secret-setting input {
    margin-bottom: 0;
  }

  .add-step-form {
    background: #f9fbff;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e0e7ff;
  }

  .add-step-form h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .time-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .time-input input {
    width: 50px;
    text-align: center;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    background: #bfdbfe;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: white;
    color: #666;
    border: 1px solid #d0d0d0;
  }

  .btn-secondary:hover {
    border-color: #666;
    color: #333;
  }

  .btn-add-step {
    width: 100%;
    padding: 12px;
    border: 2px dashed #2563eb;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #2563eb;
    transition: all 0.2s;
  }

  .btn-add-step:hover {
    background: #f0f4ff;
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .dialog h2 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1f2937;
  }

  .dialog input,
  .dialog textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
    margin-bottom: 12px;
  }

  .dialog textarea {
    min-height: 120px;
    resize: vertical;
  }

  .dialog input:focus,
  .dialog textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .dialog-actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dialog-actions .btn-primary {
    background: #2563eb;
    color: white;
  }

  .dialog-actions .btn-primary:hover {
    background: #1d4ed8;
  }

  .dialog-actions .btn-secondary {
    background: #f0f0f0;
    color: #666;
  }

  .dialog-actions .btn-secondary:hover {
    background: #e0e0e0;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .theme-option {
    padding: 12px;
    border: 1px solid #d0d0d0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .theme-option:hover {
    border-color: #2563eb;
    background: #f9fbff;
  }

  .theme-option.selected {
    border-color: #2563eb;
    background: #f0f4ff;
    font-weight: 600;
  }

  .theme-name {
    display: block;
    font-size: 13px;
    color: #1f2937;
  }

  .theme-desc {
    display: block;
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }

  @media (max-width: 480px) {
    .header {
      padding: 8px 12px;
    }

    .title {
      font-size: 18px;
    }

    .date-range {
      font-size: 12px;
    }

    .dialog {
      width: 95%;
    }
  }
</style>
