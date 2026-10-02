<script lang="ts">
  export type IconName =
    | "user"
    | "share"
    | "logout"
    | "home"
    | "search"
    | "plus"
    | "map"
    | "eye"
    | "eye-off"
    | "mail"
    | "lock"
    | "chevron-right"
    | "arrow-right"
    | "heart"
    | "x"
    | "more-horizontal";

  let {
    name,
    size = 20,
    strokeWidth = 1.8,
  }: {
    name: IconName;
    size?: number;
    strokeWidth?: number;
  } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#if name === "user"}
    <circle cx="12" cy="8" r="3.25" />
    <path d="M5.5 20c.6-4 2.8-6.1 6.5-6.1s5.9 2.1 6.5 6.1" />
  {:else if name === "share"}
    <path d="M9.5 14.5l5-5" />
    <path d="M7.2 16.8l-1.1 1.1a3.4 3.4 0 0 1-4.8-4.8l3.1-3.1a3.4 3.4 0 0 1 4.8 0" />
    <path d="m16.8 7.2 1.1-1.1a3.4 3.4 0 0 1 4.8 4.8L19.6 14a3.4 3.4 0 0 1-4.8 0" />
  {:else if name === "logout"}
    <path d="M10 4H6.8A2.8 2.8 0 0 0 4 6.8v10.4A2.8 2.8 0 0 0 6.8 20H10" />
    <path d="M14.5 8.5 18 12l-3.5 3.5" />
    <path d="M18 12H9" />
  {:else if name === "home"}
    <path d="m3.5 10.5 8.5-7 8.5 7" />
    <path d="M5.8 9.5V20h12.4V9.5" />
    <path d="M9.5 20v-6h5v6" />
  {:else if name === "search"}
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.5 15.5 4.2 4.2" />
  {:else if name === "plus"}
    <path d="M12 5v14M5 12h14" />
  {:else if name === "map"}
    <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
    <path d="M9 4v14M15 6v14" />
  {:else if name === "eye"}
    <path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z" />
    <circle cx="12" cy="12" r="2.3" />
  {:else if name === "eye-off"}
    <path d="m4 4 16 16" />
    <path d="M9.4 7.4A8.7 8.7 0 0 1 12 7c6 0 9.2 5 9.2 5a14.4 14.4 0 0 1-2.1 2.7" />
    <path d="M14.6 16.6A8.7 8.7 0 0 1 12 17c-6 0-9.2-5-9.2-5A14.8 14.8 0 0 1 5 9.2" />
    <path d="M10.4 10.4a2.3 2.3 0 0 0 3.2 3.2" />
  {:else if name === "mail"}
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m4.5 7 7.5 5.7L19.5 7" />
  {:else if name === "lock"}
    <rect x="5" y="10" width="14" height="10" rx="2.3" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  {:else if name === "chevron-right"}
    <path d="m9 5 7 7-7 7" />
  {:else if name === "arrow-right"}
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  {:else if name === "heart"}
    <path d="M20.8 5.9c-1.8-1.8-4.8-1.8-6.6 0L12 8.1 9.8 5.9a4.7 4.7 0 0 0-6.6 6.6L12 21l8.8-8.5a4.7 4.7 0 0 0 0-6.6Z" />
  {:else if name === "x"}
    <path d="m6 6 12 12M18 6 6 18" />
  {:else if name === "more-horizontal"}
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  {/if}
</svg>
