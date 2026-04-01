import type { PreviewItinerary } from "./types";

export const saunaRallyPreview: PreviewItinerary = {
  title: "関東サウナスタンプラリー",
  themeId: "sauna-rally",
  themeName: "サウナスタンプラリー",
  description: "サウナ旅を記録",
  phrase: "サウナ巡り",
  layout: "list",
  colors: {
    primary: "#FF6B35",
    secondary: "#004E89",
    background: "#FFF8F0",
    text: "#33272A",
    accent: "#F7B801",
    border: "#FFE5CC",
  },
  steps: [
    { time: "", label: "六本木温泉", icon: "♨️", location: "港区" },
    { time: "", label: "大泉サウナ", icon: "♨️", location: "練馬区" },
    { time: "", label: "スパ王国", icon: "♨️", location: "江東区" },
  ],
  features: ["スタンプラリー", "施設情報", "評価記録"],
};
