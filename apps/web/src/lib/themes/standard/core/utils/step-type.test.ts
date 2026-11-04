import { describe, expect, it } from "vitest";
import { STEP_TYPE, type StepType } from "@tabitabi/types";
import {
  getStepTypeLabel,
  STEP_TYPE_CONFIGS,
  STEP_TYPES_BY_CATEGORY,
} from "./step-type";
import { getStepTypeSvg } from "./step-type-svg";

describe("shared step category presentation", () => {
  it("uses a concise fallback for unspecified and legacy categories", () => {
    expect(getStepTypeLabel()).toBe("その他");
    expect(getStepTypeSvg()).toBe(getStepTypeSvg(STEP_TYPE.NORMAL_GENERAL));
    expect(getStepTypeLabel("unknown:legacy" as StepType)).toBe("その他");
    expect(getStepTypeSvg("unknown:legacy" as StepType)).toBe(getStepTypeSvg(STEP_TYPE.NORMAL_GENERAL));
  });

  it("uses neutral SVGs instead of platform-dependent emoji", () => {
    const selectable = [...STEP_TYPES_BY_CATEGORY.normal, ...STEP_TYPES_BY_CATEGORY.transport];
    const icons = selectable.map(type => getStepTypeSvg(type));

    // The selected icon's outline must be recognizable without any extra color.
    expect(new Set(icons).size).toBe(selectable.length);
    for (const icon of icons) {
      expect(icon).toContain('<svg ');
      expect(icon).toContain('viewBox="0 0 24 24"');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('fill="none"');
      expect(icon).not.toMatch(/#[0-9a-f]{3,8}|<image|<text|style=/i);
      expect(icon).toMatch(/<\/svg>$/);
    }
  });

  it("keeps short, human-readable labels for each category", () => {
    const selectable = [...STEP_TYPES_BY_CATEGORY.normal, ...STEP_TYPES_BY_CATEGORY.transport];
    expect(STEP_TYPE_CONFIGS[STEP_TYPE.TRANSPORT_GENERAL].label).toBe("その他の移動");
    for (const type of selectable) {
      expect(getStepTypeLabel(type)).not.toContain(":");
      expect(getStepTypeLabel(type)).not.toBe("");
      expect(STEP_TYPE_CONFIGS[type].description).not.toBe("");
    }
  });

  it("keeps legacy meal records visually equivalent to food records", () => {
    expect(getStepTypeSvg(STEP_TYPE.NORMAL_MEAL)).toBe(getStepTypeSvg(STEP_TYPE.NORMAL_FOOD));
    expect(getStepTypeLabel(STEP_TYPE.NORMAL_MEAL)).toBe(getStepTypeLabel(STEP_TYPE.NORMAL_FOOD));
  });
});
