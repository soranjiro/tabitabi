import type { PreviewItinerary } from "./types";

export const standardAutumnPreview: PreviewItinerary = {
  title: "京都紅葉旅行",
  themeId: "standard-autumn",
  themeName: "標準（秋）",
  description: "紅葉の週次予定",
  phrase: "秋の旅行計画",
  layout: "week",
  colors: {
    primary: "#a93529",
    secondary: "#e6b422",
    background: "#fcf9f2",
    text: "#4a3b32",
    accent: "#d4762c",
    border: "#e8e0d0",
  },
  steps: [
    { time: "09:00", label: "日光東照宮参拝", icon: "⛩️", dayOffset: 0, durationHours: 2 },
    { time: "12:00", label: "湯滝観瀑", icon: "🗻", dayOffset: 0, durationHours: 1 },
    { time: "13:30", label: "湯滝から華厳滝へ移動", icon: "🚌", dayOffset: 0, durationHours: 1 },
    { time: "15:00", label: "華厳滝", icon: "🍁", dayOffset: 0, durationHours: 1 },
    { time: "08:30", label: "旅館朝食", icon: "🍽️", dayOffset: 1, durationHours: 1 },
    { time: "12:00", label: "豆腐懐石料理", icon: "🍱", dayOffset: 1, durationHours: 1.5 },
    { time: "15:00", label: "日光自然博物館", icon: "🏛️", dayOffset: 1, durationHours: 1.5 },
    { time: "09:30", label: "温泉街散策", icon: "🛍️", dayOffset: 2, durationHours: 1.5 },
    { time: "12:00", label: "帰路の駅弁", icon: "🍱", dayOffset: 2, durationHours: 1 },
  ],
  features: ["週ビュー", "紅葉", "旅程"],
};
