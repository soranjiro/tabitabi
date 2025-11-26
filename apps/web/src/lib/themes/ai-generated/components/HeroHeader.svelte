<script lang="ts">
  import { goto } from "$app/navigation";

  interface Props {
    title: string;
    startDate?: string;
    endDate?: string;
  }

  let { title, startDate, endDate }: Props = $props();

  const tripEmoji = $derived(() => {
    const titleLower = title.toLowerCase();

    if (
      titleLower.includes("沖縄") ||
      titleLower.includes("ビーチ") ||
      titleLower.includes("海")
    )
      return "🏝️";
    if (
      titleLower.includes("北海道") ||
      titleLower.includes("スキー") ||
      titleLower.includes("雪")
    )
      return "⛷️";
    if (
      titleLower.includes("京都") ||
      titleLower.includes("奈良") ||
      titleLower.includes("寺")
    )
      return "⛩️";
    if (titleLower.includes("東京") || titleLower.includes("tokyo"))
      return "🗼";
    if (titleLower.includes("大阪")) return "🏯";
    if (
      titleLower.includes("富士") ||
      titleLower.includes("登山") ||
      titleLower.includes("山")
    )
      return "🗻";
    if (titleLower.includes("温泉")) return "♨️";
    if (
      titleLower.includes("ディズニー") ||
      titleLower.includes("usj") ||
      titleLower.includes("遊園地")
    )
      return "🎢";
    if (titleLower.includes("韓国") || titleLower.includes("ソウル"))
      return "🇰🇷";
    if (titleLower.includes("台湾") || titleLower.includes("台北")) return "🇹🇼";
    if (titleLower.includes("ハワイ") || titleLower.includes("hawaii"))
      return "🌺";
    if (titleLower.includes("キャンプ") || titleLower.includes("アウトドア"))
      return "⛺";
    if (titleLower.includes("グルメ") || titleLower.includes("食べ歩き"))
      return "🍴";
    return "✈️";
  });

  const dateDisplay = $derived(() => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    if (startDate === endDate || !endDate) return formatDate(start);
    return `${formatDate(start)} - ${formatDate(end)}`;
  });
</script>

<header class="hero">
  <button class="hero-back" onclick={() => goto("/")} aria-label="ホームへ戻る">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  </button>

  <div class="hero-content">
    <span class="hero-emoji">{tripEmoji()}</span>
    <h1 class="hero-title">{title}</h1>
    {#if dateDisplay()}
      <span class="hero-date">{dateDisplay()}</span>
    {/if}
  </div>
</header>

<style>
  .hero {
    position: relative;
    padding: 1.5rem 1rem 1.25rem;
    margin-bottom: 1.5rem;
  }

  .hero-back {
    position: absolute;
    top: 1rem;
    left: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: 50%;
    color: var(--ai-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .hero-back:hover {
    background: var(--ai-text-primary);
    color: var(--ai-surface);
    border-color: var(--ai-text-primary);
    transform: scale(1.05);
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-top: 0.5rem;
  }

  .hero-emoji {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .hero-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--ai-text-primary);
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .hero-date {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.375rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--ai-text-secondary);
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: 2rem;
  }

  @media (min-width: 768px) {
    .hero {
      padding: 2rem 1.5rem 1.5rem;
    }

    .hero-back {
      left: 1rem;
    }

    .hero-emoji {
      font-size: 3rem;
    }

    .hero-title {
      font-size: 1.75rem;
    }
  }
</style>
