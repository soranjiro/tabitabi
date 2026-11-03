import { describe, expect, it } from "vitest";
import { STEP_TYPE, type StepType } from "@tabitabi/types";
import {
  getStepTypeIcon,
  getStepTypeLabel,
  STEP_TYPE_CONFIGS,
  STEP_TYPES_BY_CATEGORY,
} from "./step-type";

describe("shared step category presentation", () => {
  it("uses a concise fallback for unspecified and legacy categories", () => {
    expect(getStepTypeLabel()).toBe("その他");
    expect(getStepTypeIcon()).toBe("📌");
    expect(getStepTypeLabel("unknown:legacy" as StepType)).toBe("その他");
    expect(getStepTypeIcon("unknown:legacy" as StepType)).toBe("📌");
  });

  it("distinguishes ordinary plans, tourism, and travel methods at a glance", () => {
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_SIGHTSEEING].icon).toBe("🏯");
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.TRANSPORT_TRAIN].icon).toBe("🚃");
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.TRANSPORT_CAR].icon).toBe("🚗");
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.TRANSPORT_GENERAL].icon).toBe("🚶");
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.TRANSPORT_GENERAL].label).toBe("その他の移動");
  });

  it("has an unambiguous emoji and readable label for each selectable category", () => {
    const selectable = [...STEP_TYPES_BY_CATEGORY.normal, ...STEP_TYPES_BY_CATEGORY.transport];
    const icons = selectable.map(type => getStepTypeIcon(type));
    expect(new Set(icons).size).toBe(selectable.length);
    for (const type of selectable) {
      expect(getStepTypeLabel(type)).not.toContain(":");
      expect(getStepTypeLabel(type)).not.toBe("");
      expect(STEP_TYPE_CONFIGS[type].description).not.toBe("");
    }
  });

  it("keeps legacy meal records visually equivalent to food records", () => {
    expect(getStepTypeIcon(STEP_TYPE.NORMAL_MEAL)).toBe(getStepTypeIcon(STEP_TYPE.NORMAL_FOOD));
    expect(getStepTypeLabel(STEP_TYPE.NORMAL_MEAL)).toBe(getStepTypeLabel(STEP_TYPE.NORMAL_FOOD));
  });
});
