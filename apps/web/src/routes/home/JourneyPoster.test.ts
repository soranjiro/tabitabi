import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const illustrations = join(process.cwd(), "static", "illustrations");
const readSvg = (name: string) => readFileSync(join(illustrations, name), "utf8");

describe("landing poster handwritten line art", () => {
  const desktopName = "tabitabi-feature-poster.svg";
  const mobileName = "tabitabi-feature-poster-mobile.svg";

  it("ships small, standalone, vector-only illustrations", () => {
    for (const name of [desktopName, mobileName]) {
      const svg = readSvg(name);
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain('shape-rendering="geometricPrecision"');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
      expect(svg).toMatch(/d="[^"]*[CQ][^"]*"/);
      expect(svg).not.toMatch(/<image\b|<polygon\b|fill-rule=|data:image|<script\b/i);
      expect(statSync(join(illustrations, name)).size).toBeLessThan(30_000);
    }
    expect(existsSync(join(illustrations, "tabitabi-feature-poster.webp"))).toBe(false);
  });

  it("preserves the full desktop composition and mobile's three featured scenes", () => {
    const desktop = readSvg(desktopName);
    const mobile = readSvg(mobileName);
    expect(desktop).toContain('viewBox="0 0 1208 1302"');
    expect(mobile).toContain('viewBox="0 0 500 1660"');
    for (const title of ["多彩なデザイン", "SNSで共有", "お金・持ち物の管理"]) {
      expect(desktop).toContain(title);
      expect(mobile).toContain(title);
    }
    for (const title of ["しおりを作る", "シークレットモード", "いつでも、どこでも"]) {
      expect(desktop).toContain(title);
      expect(mobile).not.toContain(title);
    }
    expect((desktop.match(/<path /g) ?? []).length).toBeGreaterThan(40);
    expect((mobile.match(/<path /g) ?? []).length).toBeGreaterThan(20);
  });

  it("switches sources responsively without loading both posters", () => {
    const component = readFileSync(join(process.cwd(), "src", "routes", "home", "JourneyPoster.svelte"), "utf8");
    expect(component).toContain('<picture class="poster-picture">');
    expect(component).toContain('media="(max-width: 900px)"');
    expect(component).toContain('srcset="/illustrations/tabitabi-feature-poster-mobile.svg"');
    expect(component).toContain('src="/illustrations/tabitabi-feature-poster.svg"');
    expect(component).toContain('height="1660"');
  });
});
