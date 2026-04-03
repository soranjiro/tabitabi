<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepTime } from "@tabitabi/types";
  import { getMemoText } from "$lib/memo";

  interface Props {
    step: Step;
    index: number;
    isCurrentStep?: boolean;
  }

  let { step, index, isCurrentStep = false }: Props = $props();

  const timeIcon = $derived(() => {
    const time = getStepTime(step);
    const hour = parseInt(time.split(":")[0]);

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
      <span class="step-time">{getStepTime(step)}</span>
      <span class="step-category-icon">{categoryIcon()}</span>
    </div>

    <h2 class="step-title">{step.title}</h2>

    {#if getMemoText(step.notes)}
      <p class="step-note">{getMemoText(step.notes)}</p>
    {/if}
  </div>

  {#if isCurrentStep}
    <div class="current-indicator">
      <span class="current-dot"></span>
      NOW
    </div>
  {/if}
</div>
