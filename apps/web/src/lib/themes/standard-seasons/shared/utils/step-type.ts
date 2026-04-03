import type { StepType } from "@tabitabi/types";

export interface StepTypeConfig {
  label: string;
  icon: string;
  category: "normal" | "transport";
  description: string;
}

export const STEP_TYPE_CONFIGS: Record<StepType, StepTypeConfig> = {
  "normal:general": {
    label: "一般的な予定",
    icon: "📋",
    category: "normal",
    description: "その他の予定",
  },
  "normal:food": {
    label: "食事",
    icon: "🍽️",
    category: "normal",
    description: "レストラン、食事場所",
  },
  "normal:hotel": {
    label: "宿泊",
    icon: "🏨",
    category: "normal",
    description: "ホテル、宿泊施設",
  },
  "normal:sightseeing": {
    label: "観光",
    icon: "🎌",
    category: "normal",
    description: "観光地、名所",
  },
  "transport:general": {
    label: "一般的な移動",
    icon: "🚗",
    category: "transport",
    description: "その他の移動手段",
  },
  "transport:train": {
    label: "電車",
    icon: "🚄",
    category: "transport",
    description: "電車、列車での移動",
  },
  "transport:car": {
    label: "車",
    icon: "🚙",
    category: "transport",
    description: "車での移動",
  },
  "transport:plane": {
    label: "飛行機",
    icon: "✈️",
    category: "transport",
    description: "飛行機での移動",
  },
  "transport:bus": {
    label: "バス",
    icon: "🚌",
    category: "transport",
    description: "バスでの移動",
  },
};

export function getStepTypeIcon(type: StepType | undefined): string {
  if (!type) return "📋";
  return STEP_TYPE_CONFIGS[type]?.icon ?? "📋";
}

export function getStepTypeLabel(type: StepType | undefined): string {
  if (!type) return "予定";
  return STEP_TYPE_CONFIGS[type]?.label ?? "予定";
}

export function isTransportType(type: StepType | undefined): boolean {
  if (!type) return false;
  return STEP_TYPE_CONFIGS[type]?.category === "transport";
}

export const STEP_TYPES_BY_CATEGORY = {
  normal: ["normal:general", "normal:food", "normal:hotel", "normal:sightseeing"] as const,
  transport: ["transport:general", "transport:train", "transport:car", "transport:plane", "transport:bus"] as const,
};
