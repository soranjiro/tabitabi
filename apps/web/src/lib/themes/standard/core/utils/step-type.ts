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
    label: "その他",
    icon: "📌",
    category: "normal",
    description: "ほかの種類に当てはまらない予定",
  },
  [STEP_TYPE.NORMAL_FOOD]: {
    label: "食事",
    icon: "🍴",
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
    icon: "🏯",
    category: "normal",
    description: "観光地、名所",
  },
  [STEP_TYPE.NORMAL_MEAL]: {
    label: "食事",
    icon: "🍴",
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
    label: "その他の移動",
    icon: "🚶",
    category: "transport",
    description: "徒歩や移動手段が決まっていないとき",
  },
  [STEP_TYPE.TRANSPORT_TRAIN]: {
    label: "電車",
    icon: "🚃",
    category: "transport",
    description: "電車、列車での移動",
  },
  [STEP_TYPE.TRANSPORT_CAR]: {
    label: "車",
    icon: "🚗",
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

export function getStepTypeIcon(type?: StepType): string {
  if (!type) return STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_GENERAL].icon;
  return STEP_TYPE_CONFIGS[type]?.icon ?? STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_GENERAL].icon;
}

export function getStepTypeLabel(type?: StepType): string {
  if (!type) return STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_GENERAL].label;
  return STEP_TYPE_CONFIGS[type]?.label ?? STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_GENERAL].label;
}

export function isTransportType(type?: StepType): boolean {
  if (!type) return false;
  return STEP_TYPE_CONFIGS[type]?.category === "transport";
}

export const STEP_TYPES_BY_CATEGORY = STEP_TYPE_CATEGORIES;
