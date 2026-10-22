import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import JourneyFeatures from "./JourneyFeatures.svelte";

describe("landing feature illustrations", () => {
  it("shows five additional features in a consistent vertical reading order", () => {
    const { container } = render(JourneyFeatures);
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual([
      "地図で計画",
      "好きなデザインに",
      "持ち物をチェック",
      "お金を管理",
      "時間までひみつ",
    ]);

    const images = [...container.querySelectorAll<HTMLImageElement>(".feature-art")];
    expect(images).toHaveLength(5);
    expect(images.every((image) => image.getAttribute("alt") === "")).toBe(true);
    expect(images.every((image) => image.getAttribute("loading") === "lazy")).toBe(true);
    expect(images.every((image) => image.getAttribute("width") === "840")).toBe(true);
    expect(images.every((image) => image.getAttribute("height") === "420")).toBe(true);
  });
});
