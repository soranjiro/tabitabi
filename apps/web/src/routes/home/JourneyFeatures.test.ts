import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { journeyFeatures } from "./JourneyFeatures.data";

describe("landing feature illustrations", () => {
  it("keeps the additional features in the intended reading order", () => {
    expect(journeyFeatures.map((feature) => feature.title)).toEqual([
      "地図で計画",
      "好きなデザインに",
      "持ち物をチェック",
      "お金を管理",
      "時間までひみつ",
    ]);
  });

  it("points to lightweight, accessible SVG assets", () => {
    for (const feature of journeyFeatures) {
      expect(feature.image.startsWith("/illustrations/journey-")).toBe(true);
      expect(feature.image.endsWith(".svg")).toBe(true);
      const asset = readFileSync(
        join(process.cwd(), "static", feature.image.slice(1)),
        "utf8",
      );
      expect(asset).toContain('viewBox="0 0 840 420"');
      expect(asset).toContain('aria-hidden="true"');
      expect(asset).not.toMatch(/<script|onload=/i);
    }
  });
});
