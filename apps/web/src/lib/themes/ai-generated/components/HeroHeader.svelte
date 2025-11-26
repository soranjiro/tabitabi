<script lang="ts">
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
    if (titleLower.includes("パリ") || titleLower.includes("フランス"))
      return "🗼";
    if (titleLower.includes("イタリア") || titleLower.includes("ローマ"))
      return "🇮🇹";
    if (
      titleLower.includes("アメリカ") ||
      titleLower.includes("usa") ||
      titleLower.includes("ニューヨーク")
    )
      return "🗽";
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

    const formatDate = (d: Date) => {
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${month}/${day}`;
    };

    if (startDate === endDate || !endDate) {
      return formatDate(start);
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
  });
</script>

<header class="hero-header">
  <div class="hero-background">
    <div class="hero-gradient"></div>
    <div class="hero-pattern"></div>
  </div>

  <div class="hero-content">
    <div class="hero-emoji">{tripEmoji()}</div>
    <h1 class="hero-title">{title}</h1>
    {#if dateDisplay()}
      <div class="hero-date">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {dateDisplay()}
      </div>
    {/if}
  </div>

  <div class="hero-decoration">
    <div class="deco-line"></div>
  </div>
</header>

<style>
  .hero-header {
    position: relative;
    padding: 2.5rem 1.5rem 2rem;
    margin: -1rem -1rem 1.5rem;
    overflow: hidden;
  }

  .hero-background {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .hero-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      var(--ai-primary) 0%,
      var(--ai-secondary) 50%,
      var(--ai-accent) 100%
    );
    opacity: 0.9;
  }

  .hero-pattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
        circle at 20% 80%,
        rgba(255, 255, 255, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(255, 255, 255, 0.15) 0%,
        transparent 40%
      ),
      radial-gradient(
        circle at 40% 40%,
        rgba(255, 255, 255, 0.05) 0%,
        transparent 60%
      );
  }

  .hero-content {
    position: relative;
    z-index: 1;
    text-align: center;
    color: white;
  }

  .hero-emoji {
    font-size: 3rem;
    margin-bottom: 0.75rem;
    animation: float 3s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  .hero-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .hero-date {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .hero-decoration {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    z-index: 1;
  }

  .deco-line {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: var(--ai-bg);
    border-radius: 24px 24px 0 0;
  }

  @media (min-width: 768px) {
    .hero-header {
      padding: 3rem 2rem 2.5rem;
      margin: -1.5rem -1.5rem 2rem;
    }

    .hero-emoji {
      font-size: 4rem;
    }

    .hero-title {
      font-size: 2.25rem;
    }
  }
</style>
