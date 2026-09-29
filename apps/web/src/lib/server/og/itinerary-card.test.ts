import { describe, expect, it } from "vitest";
import { layoutOgTitle } from "./itinerary-card";

describe("itinerary OG title layout", () => {
  it("keeps short titles on one line", () => {
    expect(layoutOgTitle("金沢2泊3日の旅").lines).toEqual(["金沢2泊3日の旅"]);
  });

  it("limits long titles to two lines and marks truncation", () => {
    const layout = layoutOgTitle("これはとても長い旅行タイトルで共有カードの領域を超えても必ず二行以内に収めるためのテストタイトルです");
    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[1]?.endsWith("…")).toBe(true);
  });

  it("uses a safe fallback for an empty title", () => {
    expect(layoutOgTitle("   ").lines).toEqual(["旅のしおり"]);
  });
});
