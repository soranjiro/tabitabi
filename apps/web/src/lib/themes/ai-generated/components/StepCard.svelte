<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    step: Step;
    index: number;
    isCurrentStep?: boolean;
  }

  let { step, index, isCurrentStep = false }: Props = $props();

  const timeIcon = $derived(() => {
    const hour = parseInt(step.time.split(":")[0]);

    if (hour >= 5 && hour < 7) return { icon: "🌅", label: "早朝" };
    if (hour >= 7 && hour < 11) return { icon: "☀️", label: "午前" };
    if (hour >= 11 && hour < 14) return { icon: "🌤️", label: "昼" };
    if (hour >= 14 && hour < 17) return { icon: "🌇", label: "午後" };
    if (hour >= 17 && hour < 20) return { icon: "🌆", label: "夕方" };
    if (hour >= 20 && hour < 23) return { icon: "🌙", label: "夜" };
    return { icon: "🌃", label: "深夜" };
  });

  const categoryIcon = $derived(() => {
    const title = step.title.toLowerCase();
    const notes = (step.notes || "").toLowerCase();
    const combined = title + " " + notes;

    if (
      combined.includes("飛行機") ||
      combined.includes("空港") ||
      combined.includes("フライト")
    )
      return "✈️";
    if (
      combined.includes("電車") ||
      combined.includes("駅") ||
      combined.includes("新幹線")
    )
      return "🚄";
    if (combined.includes("バス")) return "🚌";
    if (combined.includes("タクシー")) return "🚕";
    if (
      combined.includes("車") ||
      combined.includes("ドライブ") ||
      combined.includes("レンタカー")
    )
      return "🚗";
    if (combined.includes("船") || combined.includes("フェリー")) return "⛴️";
    if (combined.includes("歩") || combined.includes("散歩")) return "🚶";

    if (
      combined.includes("ホテル") ||
      combined.includes("旅館") ||
      combined.includes("宿") ||
      combined.includes("チェックイン") ||
      combined.includes("チェックアウト")
    )
      return "🏨";
    if (combined.includes("朝食") || combined.includes("朝ごはん")) return "🍳";
    if (
      combined.includes("昼食") ||
      combined.includes("ランチ") ||
      combined.includes("昼ごはん")
    )
      return "🍽️";
    if (
      combined.includes("夕食") ||
      combined.includes("ディナー") ||
      combined.includes("晩ごはん")
    )
      return "🍴";
    if (
      combined.includes("カフェ") ||
      combined.includes("コーヒー") ||
      combined.includes("喫茶")
    )
      return "☕";
    if (
      combined.includes("居酒屋") ||
      combined.includes("バー") ||
      combined.includes("飲み")
    )
      return "🍺";
    if (combined.includes("ラーメン")) return "🍜";
    if (combined.includes("寿司") || combined.includes("すし")) return "🍣";

    if (combined.includes("神社") || combined.includes("参拝")) return "⛩️";
    if (combined.includes("寺") || combined.includes("お寺")) return "🛕";
    if (combined.includes("城") || combined.includes("城跡")) return "🏯";
    if (
      combined.includes("美術館") ||
      combined.includes("博物館") ||
      combined.includes("ミュージアム")
    )
      return "🏛️";
    if (combined.includes("動物園")) return "🦁";
    if (combined.includes("水族館")) return "🐠";
    if (combined.includes("遊園地") || combined.includes("テーマパーク"))
      return "🎢";
    if (
      combined.includes("温泉") ||
      combined.includes("お風呂") ||
      combined.includes("スパ")
    )
      return "♨️";
    if (combined.includes("買い物") || combined.includes("ショッピング"))
      return "🛍️";
    if (combined.includes("写真") || combined.includes("撮影")) return "📸";
    if (combined.includes("海") || combined.includes("ビーチ")) return "🏖️";
    if (
      combined.includes("山") ||
      combined.includes("登山") ||
      combined.includes("ハイキング")
    )
      return "⛰️";
    if (combined.includes("公園")) return "🌳";
    if (combined.includes("花火")) return "🎆";
    if (combined.includes("祭") || combined.includes("まつり")) return "🎏";

    return "📍";
  });
</script>

<div
  class="step-card"
  class:current={isCurrentStep}
  style="--delay: {index * 0.1}s"
>
  <div class="step-time-icon" title={timeIcon().label}>
    {timeIcon().icon}
  </div>

  <div class="step-content">
    <div class="step-header">
      <span class="step-time">{step.time}</span>
      <span class="step-category-icon">{categoryIcon()}</span>
    </div>

    <h4 class="step-title">{step.title}</h4>

    {#if step.notes}
      <p class="step-note">{step.notes}</p>
    {/if}
  </div>

  {#if isCurrentStep}
    <div class="current-indicator">
      <span class="current-dot"></span>
      NOW
    </div>
  {/if}
</div>

<style>
  .step-card {
    position: relative;
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--ai-surface);
    border-radius: var(--ai-radius-lg);
    box-shadow: var(--ai-shadow-sm);
    animation: slideIn 0.5s ease backwards;
    animation-delay: var(--delay);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--ai-border);
  }

  .step-card:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: var(--ai-shadow-md);
    border-color: var(--ai-primary-light);
  }

  .step-card.current {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.1) 0%,
      rgba(236, 72, 153, 0.1) 100%
    );
    border-color: var(--ai-primary);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .step-time-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: var(--ai-bg);
    border-radius: var(--ai-radius-md);
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .step-time {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--ai-primary);
  }

  .step-category-icon {
    font-size: 1rem;
  }

  .step-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--ai-text-primary);
    line-height: 1.4;
  }

  .step-note {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: var(--ai-text-muted);
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .current-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--ai-accent);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .current-dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    animation: pulse 1s ease infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
