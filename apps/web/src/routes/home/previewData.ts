export interface PreviewStep {
  time: string;
  label: string;
  icon: string;
}

export interface PreviewItinerary {
  title: string;
  theme: string;
  steps: PreviewStep[];
}

export const previewItineraries: PreviewItinerary[] = [
  {
    title: "沖縄旅行 2025",
    theme: "tropical",
    steps: [
      { time: "10:00", label: "那覇空港到着", icon: "✈️" },
      { time: "12:00", label: "国際通りランチ", icon: "🍜" },
      { time: "15:00", label: "美ら海水族館", icon: "🐠" },
      { time: "18:00", label: "サンセットビーチ", icon: "🌅" },
    ],
  },
  {
    title: "京都日帰り",
    theme: "autumn",
    steps: [
      { time: "08:00", label: "京都駅集合", icon: "🚃" },
      { time: "09:30", label: "清水寺", icon: "⛩️" },
      { time: "12:00", label: "祇園でランチ", icon: "🍱" },
      { time: "14:00", label: "金閣寺", icon: "✨" },
    ],
  },
  {
    title: "北海道グルメ旅",
    theme: "winter",
    steps: [
      { time: "11:00", label: "新千歳空港", icon: "❄️" },
      { time: "13:00", label: "味噌ラーメン", icon: "🍜" },
      { time: "15:00", label: "白い恋人パーク", icon: "🍪" },
      { time: "18:00", label: "ジンギスカン", icon: "🥩" },
    ],
  },
];
