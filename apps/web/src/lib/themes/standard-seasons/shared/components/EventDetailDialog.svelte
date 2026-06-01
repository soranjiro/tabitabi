<script lang="ts">
  import type { Step, StepType } from "@tabitabi/types";
  import {
    getStepDate,
    getStepTime,
    getStepEndTime,
    getStepEndDate,
    createTimestamp,
    createEndTimestamp,
    STEP_TYPE,
  } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";
  import {
    getMemoText,
    parseMemoData,
    stringifyMemoData,
    updateMemoText,
  } from "$lib/memo";
  import TypePicker from "./TypePicker.svelte";
  import { getBookingCard } from "../utils/booking-card";
  import "../styles/EventDetailDialog.css";

  interface Props {
    step?: Step | null;
    mode?: "view" | "edit" | "create";
    hasEditPermission?: boolean;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    onClose: () => void;
    onCreateStep?: (data: {
      title: string;
      start_at: number;
      end_at: number;
      location?: string;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        start_at?: number;
        end_at?: number;
        location?: string;
        notes?: string;
        link?: string | null;
        type?: StepType;
        is_all_day?: boolean;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    step = null,
    mode = "view",
    hasEditPermission = false,
    secretModeEnabled = false,
    secretModeOffset = 60,
    onClose,
    onCreateStep,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  function isSecretStep(step: Step): boolean {
    if (!secretModeEnabled) return false;
    const now = Date.now();
    const revealTime = step.start_at - secretModeOffset * 60 * 1000;
    return now < revealTime;
  }

  const isCreateMode = mode === "create";
  let isEditing = $state(isCreateMode);
  let editedStep = $state<{
    title?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    location?: string | null;
    notes?: string;
    link?: string;
    type?: StepType;
    is_all_day?: boolean;
  }>({});
  let editStartHour = $state(step ? getStepTime(step).split(":")[0] : "09");
  let editStartMinute = $state(step ? getStepTime(step).split(":")[1] : "00");
  let editEndHour = $state("10");
  let editEndMinute = $state("00");
  let startUserChanged = $state(false);
  let endUserChanged = $state(false);
  let originalDuration = $state(60);
  let editIsAllDay = $state(step?.is_all_day || false);
  let linkHelperOpen = $state(false);
  let linkBrowserUrl = $state("");
  let bookingCard = $derived(step ? getBookingCard(step) : null);

  type LinkProvider = {
    label: string;
    url: string;
    iconDomain: string;
  };

  const DEFAULT_LINK_PROVIDERS: LinkProvider[] = [
    { label: "Google", url: "https://www.google.com/", iconDomain: "google.com" },
    { label: "Google Maps", url: "https://www.google.com/maps", iconDomain: "google.com" },
  ];

  const LINK_PROVIDER_PRESETS: Partial<Record<StepType, LinkProvider[]>> = {
    [STEP_TYPE.NORMAL_HOTEL]: [
      { label: "じゃらん", url: "https://www.jalan.net/", iconDomain: "jalan.net" },
      { label: "楽天トラベル", url: "https://travel.rakuten.co.jp/", iconDomain: "travel.rakuten.co.jp" },
      { label: "一休", url: "https://www.ikyu.com/", iconDomain: "ikyu.com" },
      { label: "Booking.com", url: "https://www.booking.com/", iconDomain: "booking.com" },
    ],
    [STEP_TYPE.NORMAL_FOOD]: [
      { label: "食べログ", url: "https://tabelog.com/", iconDomain: "tabelog.com" },
      { label: "ぐるなび", url: "https://www.gnavi.co.jp/", iconDomain: "gnavi.co.jp" },
      { label: "ホットペッパー", url: "https://www.hotpepper.jp/", iconDomain: "hotpepper.jp" },
    ],
    [STEP_TYPE.NORMAL_MEAL]: [
      { label: "食べログ", url: "https://tabelog.com/", iconDomain: "tabelog.com" },
      { label: "ぐるなび", url: "https://www.gnavi.co.jp/", iconDomain: "gnavi.co.jp" },
      { label: "ホットペッパー", url: "https://www.hotpepper.jp/", iconDomain: "hotpepper.jp" },
    ],
    [STEP_TYPE.NORMAL_SIGHTSEEING]: [
      { label: "じゃらん遊び", url: "https://www.jalan.net/activity/", iconDomain: "jalan.net" },
      { label: "アソビュー", url: "https://www.asoview.com/", iconDomain: "asoview.com" },
      { label: "Klook", url: "https://www.klook.com/ja/", iconDomain: "klook.com" },
    ],
    [STEP_TYPE.NORMAL_SHOPPING]: [
      { label: "楽天市場", url: "https://www.rakuten.co.jp/", iconDomain: "rakuten.co.jp" },
      { label: "Yahoo!", url: "https://shopping.yahoo.co.jp/", iconDomain: "shopping.yahoo.co.jp" },
    ],
    [STEP_TYPE.TRANSPORT_TRAIN]: [
      { label: "乗換案内", url: "https://transit.yahoo.co.jp/", iconDomain: "transit.yahoo.co.jp" },
      { label: "NAVITIME", url: "https://www.navitime.co.jp/", iconDomain: "navitime.co.jp" },
      { label: "Google Maps", url: "https://www.google.com/maps", iconDomain: "google.com" },
    ],
    [STEP_TYPE.TRANSPORT_CAR]: [
      { label: "Google Maps", url: "https://www.google.com/maps", iconDomain: "google.com" },
      { label: "NAVITIME", url: "https://www.navitime.co.jp/", iconDomain: "navitime.co.jp" },
    ],
    [STEP_TYPE.TRANSPORT_PLANE]: [
      { label: "Google Flights", url: "https://www.google.com/travel/flights", iconDomain: "google.com" },
      { label: "航空券", url: "https://travel.rakuten.co.jp/air/", iconDomain: "travel.rakuten.co.jp" },
    ],
    [STEP_TYPE.TRANSPORT_BUS]: [
      { label: "高速バス", url: "https://travel.rakuten.co.jp/bus/", iconDomain: "travel.rakuten.co.jp" },
      { label: "NAVITIME", url: "https://www.navitime.co.jp/", iconDomain: "navitime.co.jp" },
    ],
    [STEP_TYPE.TRANSPORT_SHIP]: [
      { label: "Google", url: "https://www.google.com/", iconDomain: "google.com" },
      { label: "NAVITIME", url: "https://www.navitime.co.jp/", iconDomain: "navitime.co.jp" },
    ],
  };

  function getLinkProviders(type: StepType | undefined): LinkProvider[] {
    return (type && LINK_PROVIDER_PRESETS[type]) || DEFAULT_LINK_PROVIDERS;
  }

  function getProviderIconUrl(provider: LinkProvider): string {
    return `https://www.google.com/s2/favicons?domain=${provider.iconDomain}&sz=64`;
  }

  function getProviderInitial(provider: LinkProvider): string {
    if (provider.label === "Google Maps") return "G";
    if (provider.label === "Booking.com") return "B";
    if (provider.label === "NAVITIME") return "N";
    if (provider.label === "Klook") return "K";
    return provider.label.slice(0, 1);
  }

  function getLinkFieldLabel(type: StepType | undefined): string {
    if (type === STEP_TYPE.NORMAL_HOTEL) return "宿泊・予約リンク";
    if (type === STEP_TYPE.NORMAL_FOOD || type === STEP_TYPE.NORMAL_MEAL) return "店舗・予約リンク";
    if (type === STEP_TYPE.NORMAL_SIGHTSEEING) return "観光・体験リンク";
    if (type === STEP_TYPE.NORMAL_SHOPPING) return "買い物リンク";
    return "関連リンク";
  }

  function getLinkPlaceholder(type: StepType | undefined): string {
    if (type === STEP_TYPE.NORMAL_HOTEL) return "https://www.jalan.net/...";
    if (type === STEP_TYPE.NORMAL_FOOD || type === STEP_TYPE.NORMAL_MEAL) return "https://tabelog.com/...";
    if (type === STEP_TYPE.NORMAL_SIGHTSEEING) return "https://www.asoview.com/...";
    return "https://...";
  }

  function openLinkProvider(url: string) {
    linkBrowserUrl = url;
    linkHelperOpen = true;
  }

  function closeLinkHelper() {
    linkHelperOpen = false;
  }

  function insertLinkFromBrowser() {
    editedStep.link = linkBrowserUrl.trim();
    closeLinkHelper();
  }

  function initializeEditedStep() {
    const referenceStartAt = step?.start_at ?? new Date().setHours(9, 0, 0, 0);
    const referenceEndAt = step?.end_at ?? referenceStartAt + 60 * 60 * 1000;
    const [startHour, startMinute] = formatTime(referenceStartAt);
    const [endHour, endMinute] = formatTime(referenceEndAt);

    editedStep = {
      title: step?.title ?? "",
      startDate: formatLocalDate(referenceStartAt),
      startTime: `${startHour}:${startMinute}`,
      endDate: formatLocalDate(referenceEndAt),
      endTime: `${endHour}:${endMinute}`,
      location: step?.location ?? "",
      notes: getMemoText(step?.notes ?? "") || "",
      link: step?.link ?? (parseMemoData(step?.notes).booking_url as string | undefined) ?? "",
      type: step?.type ?? STEP_TYPE.NORMAL_GENERAL,
      is_all_day: step?.is_all_day ?? false,
    };
    editStartHour = startHour;
    editStartMinute = startMinute;
    editEndHour = endHour;
    editEndMinute = endMinute;
    startUserChanged = false;
    endUserChanged = false;
    originalDuration = Math.max(
      1,
      Math.round((referenceEndAt - referenceStartAt) / 60000),
    );
    editIsAllDay = step?.is_all_day ?? false;
  }

  $effect(() => {
    if (isCreateMode) {
      initializeEditedStep();
    }
  });

  function formatTime(ms: number): [string, string] {
    const date = new Date(ms);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return [hours, minutes];
  }

  function formatLocalDate(ms: number): string {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeMinute(value: string): string {
    const valid = ["00", "15", "30", "45"];
    if (valid.includes(value)) return value;
    const minutes = Number(value);
    if (Number.isNaN(minutes) || minutes < 0) return "00";
    if (minutes >= 52) return "45";
    if (minutes >= 37) return "30";
    if (minutes >= 22) return "15";
    return "00";
  }

  function startEdit() {
    if (!step) return;
    isEditing = true;
    initializeEditedStep();
  }

  function cancelEdit() {
    if (isCreateMode) {
      onClose();
      return;
    }
    isEditing = false;
    editedStep = {};
    if (!step) return;
    const [startHour, startMinute] = formatTime(step.start_at);
    editStartHour = startHour;
    editStartMinute = startMinute;
    editEndHour = "10";
    editEndMinute = "00";
    startUserChanged = false;
    endUserChanged = false;
  }

  $effect(() => {
    // when start changes and end hasn't been edited by the user,
    // only auto-adjust end if the start would move past the current end
    if (!isEditing) return;
    if (!editedStep.startDate) return;
    if (endUserChanged) return;
    try {
      const startTime = `${editStartHour}:${editStartMinute}`;
      const startAt = createTimestamp(editedStep.startDate, startTime);
      const currentEndAt = createTimestamp(
        editedStep.endDate || editedStep.startDate,
        `${editEndHour}:${editEndMinute}`,
      );
      if (startAt >= currentEndAt) {
        const newEndAt = createEndTimestamp(startAt, originalDuration);
        const d = new Date(newEndAt);
        const eh = String(d.getHours()).padStart(2, "0");
        const em = String(d.getMinutes()).padStart(2, "0");
        editEndHour = eh;
        editEndMinute = em;
        editedStep.endDate = formatLocalDate(d.getTime());
        editedStep.endTime = `${eh}:${em}`;
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  $effect(() => {
    // when end changes and start hasn't been edited by the user,
    // only auto-adjust start if the end would move before the current start
    if (!isEditing) return;
    if (!editedStep.endDate) return;
    if (startUserChanged) return;
    try {
      const endTime = `${editEndHour}:${editEndMinute}`;
      const endAt = createTimestamp(editedStep.endDate, endTime);
      const currentStartAt = createTimestamp(
        editedStep.startDate || editedStep.endDate,
        `${editStartHour}:${editStartMinute}`,
      );
      if (endAt <= currentStartAt) {
        const newStartAt = endAt - Math.max(1, originalDuration) * 60 * 1000;
        const d = new Date(newStartAt);
        const sh = String(d.getHours()).padStart(2, "0");
        const sm = String(d.getMinutes()).padStart(2, "0");
        editStartHour = sh;
        editStartMinute = sm;
        editedStep.startDate = formatLocalDate(d.getTime());
        editedStep.startTime = `${sh}:${sm}`;
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  $effect(() => {
    if (!isEditing || editIsAllDay) return;
    editStartMinute = normalizeMinute(editStartMinute);
    editEndMinute = normalizeMinute(editEndMinute);
  });

  async function handleUpdate() {
    if (
      !editedStep.title?.trim() ||
      !editedStep.startDate ||
      (!editIsAllDay && (!editStartHour || !editStartMinute)) ||
      !editedStep.endDate ||
      (!editIsAllDay && (!editEndHour || !editEndMinute)) ||
      (!onUpdateStep && !onCreateStep)
    ) {
      alert("タイトル、日付は必須です。時刻付きイベントの場合は時刻も必須です");
      return;
    }

    const noteText = (editedStep.notes ?? "").trim();
    const baseNotes = step ? updateMemoText(step.notes, noteText) : stringifyMemoData({ text: noteText });
    const noteData = parseMemoData(baseNotes);
    delete noteData.public_title;
    delete noteData.public_location;
    delete noteData.public_text;
    delete noteData.booking_url;
    const notes = stringifyMemoData(noteData);
    const link = editedStep.link?.trim() || null;

    let startAt: number;
    let endAt: number;

    if (editIsAllDay) {
      startAt = createTimestamp(editedStep.startDate, "00:00");
      endAt = createTimestamp(
        editedStep.endDate || editedStep.startDate,
        "23:59",
      );
    } else {
      startAt = createTimestamp(
        editedStep.startDate,
        `${editStartHour}:${editStartMinute}`,
      );
      endAt = createTimestamp(
        editedStep.endDate,
        `${editEndHour}:${editEndMinute}`,
      );

      if (endAt <= startAt) {
        alert("終了時刻は開始時刻より後にしてください");
        return;
      }
    }

    if (isCreateMode) {
      await onCreateStep?.({
        title: editedStep.title.trim(),
        start_at: startAt,
        end_at: endAt,
        location: editedStep.location?.trim() || undefined,
        notes,
        link,
        type: editedStep.type,
        is_all_day: editIsAllDay,
      });
    } else {
      await onUpdateStep?.(step!.id, {
        title: editedStep.title.trim(),
        start_at: startAt,
        end_at: endAt,
        location: editedStep.location?.trim() || undefined,
        notes,
        link,
        type: editedStep.type,
        is_all_day: editIsAllDay,
      });
    }

    isEditing = false;
    onClose();
  }

  async function handleDelete() {
    if (!step || !confirm("この予定を削除しますか?") || !onDeleteStep) return;
    await onDeleteStep(step.id);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (linkHelperOpen) {
        closeLinkHelper();
        return;
      }
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="standard-event-dialog-backdrop"
  onclick={handleBackdropClick}
  role="presentation"
>
  <div class="standard-event-dialog" role="dialog" aria-modal="true">
    <div class="standard-event-dialog-header">
      <h3 class="standard-event-dialog-title">
        {isCreateMode ? "新しい予定を追加" : "予定の詳細"}
      </h3>
      <button
        type="button"
        class="standard-event-dialog-close"
        onclick={onClose}
        aria-label="閉じる"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <div class="standard-event-dialog-body">
      {#if step && isSecretStep(step) && !hasEditPermission}
        <div class="standard-event-secret-notice">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="standard-secret-icon"
          >
            <path
              d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
            />
          </svg>
          <p>この予定は秘密です</p>
          <p class="standard-secret-notice-sub">
            開始時刻に近づくと詳細が表示されます
          </p>
        </div>
      {:else if isEditing}
        <div class="standard-form-grid">
          <div class="standard-form-field standard-form-field-wide">
            <label for="title-input" class="standard-form-label"
              >タイトル *</label
            >
            <input
              id="title-input"
              type="text"
              bind:value={editedStep.title}
              placeholder="予定のタイトルを入力"
              class="standard-input"
            />
          </div>

          <div class="standard-checkbox-wrapper">
            <label>
              <input
                type="checkbox"
                bind:checked={editIsAllDay}
                class="standard-checkbox"
              />
              終日
            </label>
          </div>

          <div class="standard-form-field">
            <label for="start-date-input" class="standard-form-label"
              >開始日{#if !editIsAllDay}時{/if}</label
            >
            <div class="standard-datetime-group">
              <div class="standard-date-input-wrapper">
                <input
                  id="start-date-input"
                  type="date"
                  bind:value={editedStep.startDate}
                  onchange={() => (startUserChanged = true)}
                  class="standard-input"
                />
              </div>
              {#if !editIsAllDay}
                <div class="standard-time-picker">
                  <select
                    bind:value={editStartHour}
                    class="standard-select-time"
                    title="時間を選択"
                    onchange={() => (startUserChanged = true)}
                  >
                    {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                      <option value={hour}>{hour}</option>
                    {/each}
                  </select>
                  <span class="standard-time-separator">:</span>
                  <select
                    bind:value={editStartMinute}
                    class="standard-select-time"
                    title="分を選択"
                    onchange={() => (startUserChanged = true)}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>
          <div class="standard-form-field">
            <label for="end-date-input" class="standard-form-label"
              >終了日{#if !editIsAllDay}時{/if}</label
            >
            <div class="standard-datetime-group">
              <div class="standard-date-input-wrapper">
                <input
                  id="end-date-input"
                  type="date"
                  bind:value={editedStep.endDate}
                  onchange={() => (endUserChanged = true)}
                  class="standard-input"
                />
              </div>
              {#if !editIsAllDay}
                <div class="standard-time-picker">
                  <select
                    bind:value={editEndHour}
                    class="standard-select-time"
                    title="時間を選択"
                    onchange={() => (endUserChanged = true)}
                  >
                    {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                      <option value={hour}>{hour}</option>
                    {/each}
                  </select>
                  <span class="standard-time-separator">:</span>
                  <select
                    bind:value={editEndMinute}
                    class="standard-select-time"
                    title="分を選択"
                    onchange={() => (endUserChanged = true)}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>
          <div class="standard-form-field">
            <label for="location-input" class="standard-form-label">場所</label>
            <input
              id="location-input"
              type="text"
              bind:value={editedStep.location}
              placeholder="場所を入力"
              class="standard-input"
            />
          </div>
          <div class="standard-form-field standard-form-field-wide">
            <div class="standard-form-label">予定の種類</div>
            <TypePicker
              value={editedStep.type}
              onSelect={(type: StepType) => {
                editedStep.type = type;
              }}
            />
          </div>
          <div class="standard-public-fields standard-form-field-wide">
            <div class="standard-form-field">
              <label for="booking-url-input" class="standard-form-label"
                >{getLinkFieldLabel(editedStep.type)}</label
              >
              <input
                id="booking-url-input"
                type="url"
                bind:value={editedStep.link}
                placeholder={getLinkPlaceholder(editedStep.type)}
                class="standard-input"
              />
            </div>
            <div class="standard-link-provider-tools">
              {#each getLinkProviders(editedStep.type) as provider}
                <button
                  type="button"
                  class="standard-link-provider-btn"
                  title={`${provider.label}で探す`}
                  aria-label={`${provider.label}で探す`}
                  onclick={() => openLinkProvider(provider.url)}
                >
                  <span class="standard-link-provider-icon-wrap" aria-hidden="true">
                    <span class="standard-link-provider-icon-fallback">
                      {getProviderInitial(provider)}
                    </span>
                    <img
                      src={getProviderIconUrl(provider)}
                      alt=""
                      class="standard-link-provider-icon"
                      onerror={(event) => {
                        (event.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </span>
                  <span>{provider.label}</span>
                </button>
              {/each}
            </div>
          </div>
          <div class="standard-form-field standard-form-field-wide">
            <label for="notes-textarea" class="standard-form-label">メモ</label>
            <textarea
              id="notes-textarea"
              bind:value={editedStep.notes}
              placeholder="メモを入力"
              class="standard-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
      {:else if step}
        <div class="standard-event-detail-content">
          <div class="standard-event-detail-field">
            <span class="standard-event-detail-label">タイトル</span>
            <div class="standard-event-detail-value">{step.title}</div>
          </div>
          <div class="standard-event-detail-row">
            <div class="standard-event-detail-field">
              <span class="standard-event-detail-label">開始日時</span>
              <div class="standard-event-detail-value">
                <span class="standard-event-date">{getStepDate(step)}</span>
                <span class="standard-event-time">{getStepTime(step)}</span>
              </div>
            </div>
            <div class="standard-event-detail-field">
              <span class="standard-event-detail-label">終了日時</span>
              <div class="standard-event-detail-value">
                <span class="standard-event-date">{getStepEndDate(step)}</span>
                <span class="standard-event-time">{getStepEndTime(step)}</span>
              </div>
            </div>
          </div>
          {#if step.location}
            <div class="standard-event-detail-field">
              <span class="standard-event-detail-label">場所</span>
              <div class="standard-event-detail-value">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="standard-event-detail-icon"
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
                {step.location}
              </div>
            </div>
          {/if}
          {#if renderMarkdown(step.notes || "")}
            <div class="standard-event-detail-field">
              <span class="standard-event-detail-label">メモ</span>
              <div
                class="standard-event-detail-value standard-event-detail-notes"
              >
                {@html renderMarkdown(step.notes || "")}
              </div>
            </div>
          {/if}
          {#if bookingCard}
            <div class="standard-booking-card standard-booking-card-dialog">
              <div class="standard-booking-card-main">
                <span class="standard-booking-card-label">{bookingCard.label}</span>
                <span class="standard-booking-card-provider">
                  {bookingCard.providerLabel}
                </span>
              </div>
              <a
                class="standard-booking-card-button"
                href={bookingCard.actionUrl}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
              >
                開く
              </a>
            </div>
            {#if bookingCard.disclosure}
              <p class="standard-affiliate-disclosure">
                {bookingCard.disclosure}
              </p>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    {#if isEditing}
      <div class="standard-event-dialog-actions-footer">
        <button
          type="button"
          onclick={handleUpdate}
          class="standard-btn standard-btn-primary"
        >
          保存
        </button>
        <button
          type="button"
          onclick={cancelEdit}
          class="standard-btn standard-btn-secondary"
        >
          キャンセル
        </button>
      </div>
    {:else if hasEditPermission}
      <div class="standard-event-dialog-actions-footer">
        <button
          type="button"
          onclick={startEdit}
          class="standard-btn standard-btn-primary standard-btn-detail-edit"
        >
          編集
        </button>
        <button
          type="button"
          onclick={handleDelete}
          class="standard-btn standard-btn-danger"
        >
          削除
        </button>
      </div>
    {/if}
  </div>

  {#if linkHelperOpen}
    <div class="standard-link-browser-overlay" role="dialog" aria-modal="true">
      <div class="standard-link-browser-header">
        <button
          type="button"
          class="standard-link-browser-action standard-link-browser-close"
          onclick={closeLinkHelper}
        >
          閉じる
        </button>
        <input
          type="url"
          bind:value={linkBrowserUrl}
          placeholder="開きたいページのURL"
          class="standard-link-browser-address"
          aria-label="開いているURL"
        />
        <button
          type="button"
          class="standard-link-browser-action standard-link-browser-insert"
          onclick={insertLinkFromBrowser}
        >
          リンクを挿入
        </button>
      </div>
      <div class="standard-link-browser-surface">
        {#if linkBrowserUrl}
          <iframe
            src={linkBrowserUrl}
            title="リンク先サイト"
            class="standard-link-browser-frame"
          ></iframe>
        {/if}
      </div>
    </div>
  {/if}
</div>
