import type { StepType } from "@tabitabi/types";
import { STEP_TYPE, STEP_TYPE_CATEGORIES } from "@tabitabi/types";

export interface StepTypeConfig {
  label: string;
  icon: string;
  category: "normal" | "transport";
  description: string;
}

export const STEP_TYPE_CONFIGS: Record<StepType, StepTypeConfig> = {
  [STEP_TYPE.NORMAL_GENERAL]: {
    label: "一般的な予定",
    icon: "📋",
    category: "normal",
    description: "その他の予定",
  },
  [STEP_TYPE.NORMAL_FOOD]: {
    label: "食事",
    icon: "🍽️",
    category: "normal",
    description: "レストラン、食事場所",
  },
  [STEP_TYPE.NORMAL_HOTEL]: {
    label: "宿泊",
    icon: "🏨",
    category: "normal",
    description: "ホテル、宿泊施設",
  },
  [STEP_TYPE.NORMAL_SIGHTSEEING]: {
    label: "観光",
    icon: "🎌",
    category: "normal",
    description: "観光地、名所",
  },
  [STEP_TYPE.NORMAL_MEAL]: {
    label: "食事",
    icon: "🍽️",
    category: "normal",
    description: "レストラン、食事場所",
  },
  [STEP_TYPE.NORMAL_SHOPPING]: {
    label: "買い物",
    icon: "🛍️",
    category: "normal",
    description: "お土産やショッピング",
  },
  [STEP_TYPE.TRANSPORT_GENERAL]: {
    label: "一般的な移動",
    icon: "🚗",
    category: "transport",
    description: "その他の移動手段",
  },
  [STEP_TYPE.TRANSPORT_TRAIN]: {
    label: "電車",
    icon: "🚄",
    category: "transport",
    description: "電車、列車での移動",
  },
  [STEP_TYPE.TRANSPORT_CAR]: {
    label: "車",
    icon: "🚙",
    category: "transport",
    description: "車での移動",
  },
  [STEP_TYPE.TRANSPORT_PLANE]: {
    label: "飛行機",
    icon: "✈️",
    category: "transport",
    description: "飛行機での移動",
  },
  [STEP_TYPE.TRANSPORT_BUS]: {
    label: "バス",
    icon: "🚌",
    category: "transport",
    description: "バスでの移動",
  },
  [STEP_TYPE.TRANSPORT_SHIP]: {
    label: "船",
    icon: "🚢",
    category: "transport",
    description: "船、フェリーでの移動",
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

export const STEP_TYPES_BY_CATEGORY = STEP_TYPE_CATEGORIES;
