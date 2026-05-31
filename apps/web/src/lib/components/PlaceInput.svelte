<script lang="ts">
  import type { PlaceStructuredData, PlaceSuggestion } from "@tabitabi/types";
  import { autocompletePlaces, getPlaceDetails } from "$lib/api/places";

  interface Props {
    id?: string;
    value?: string | null;
    selectedPlace?: PlaceStructuredData | null;
    placeholder?: string;
    onValueChange?: (value: string) => void;
    onPlaceSelect?: (place: PlaceStructuredData | null) => void;
  }

  let {
    id = "place-input",
    value = "",
    selectedPlace = null,
    placeholder = "場所を入力",
    onValueChange,
    onPlaceSelect,
  }: Props = $props();

  let inputValue = $state(value ?? "");
  let suggestions = $state<PlaceSuggestion[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let isOpen = $state(false);
  let sessionToken = $state(createSessionToken());
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  $effect(() => {
    inputValue = value ?? "";
  });

  function createSessionToken(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }

  function clearPendingSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    inputValue = target.value;
    onValueChange?.(inputValue);
    onPlaceSelect?.(null);
    selectedPlace = null;
    errorMessage = null;
    clearPendingSearch();

    const query = inputValue.trim();
    if (query.length < 2) {
      suggestions = [];
      isOpen = false;
      return;
    }

    debounceTimer = setTimeout(() => {
      void search(query);
    }, 250);
  }

  async function search(query: string) {
    const currentRequestId = ++requestId;
    isLoading = true;
    try {
      const response = await autocompletePlaces(query, sessionToken);
      if (currentRequestId !== requestId) return;
      suggestions = response.suggestions;
      isOpen = suggestions.length > 0;
    } catch (e) {
      if (currentRequestId !== requestId) return;
      errorMessage = "候補を取得できませんでした。手入力で保存できます。";
      suggestions = [];
      isOpen = false;
      console.error(e);
    } finally {
      if (currentRequestId === requestId) isLoading = false;
    }
  }

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    inputValue = suggestion.text;
    onValueChange?.(suggestion.text);
    suggestions = [];
    isOpen = false;
    isLoading = true;
    errorMessage = null;

    try {
      const response = await getPlaceDetails(suggestion.placeId, sessionToken);
      onPlaceSelect?.(response.place);
      inputValue = response.place.displayName || suggestion.text;
      onValueChange?.(inputValue);
      sessionToken = createSessionToken();
    } catch (e) {
      errorMessage = "場所の詳細を取得できませんでした。候補名だけ保存します。";
      onPlaceSelect?.(null);
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  function handleBlur() {
    window.setTimeout(() => {
      isOpen = false;
    }, 150);
  }
</script>

<div class="place-input">
  <input
    {id}
    type="text"
    value={inputValue}
    oninput={handleInput}
    onfocus={() => (isOpen = suggestions.length > 0)}
    onblur={handleBlur}
    {placeholder}
    class="standard-input"
    autocomplete="off"
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={`${id}-suggestions`}
  />

  {#if isLoading}
    <div class="place-input-status">候補を検索中...</div>
  {:else if selectedPlace}
    <div class="place-input-status place-input-selected">
      Google Places から選択済み
    </div>
  {:else if errorMessage}
    <div class="place-input-status place-input-error">{errorMessage}</div>
  {/if}

  {#if isOpen}
    <div id={`${id}-suggestions`} class="place-input-suggestions" role="listbox">
      {#each suggestions as suggestion (suggestion.placeId)}
        <button
          type="button"
          class="place-input-suggestion"
          role="option"
          aria-selected="false"
          onclick={() => selectSuggestion(suggestion)}
        >
          <span class="place-input-suggestion-main">
            {suggestion.mainText || suggestion.text}
          </span>
          {#if suggestion.secondaryText}
            <span class="place-input-suggestion-secondary">
              {suggestion.secondaryText}
            </span>
          {/if}
        </button>
      {/each}
      <div class="place-input-attribution">Powered by Google</div>
    </div>
  {/if}
</div>
