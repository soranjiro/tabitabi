import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const posterDir = join(process.cwd(), "static", "illustrations");

describe("landing poster vector artwork", () => {
  it("uses real SVG paths rather than embedded raster images", () => {
    for (const name of ["tabitabi-feature-poster.svg", "tabitabi-feature-poster-mobile.svg"]) {
      const file = join(posterDir, name);
      const svg = readFileSync(file, "utf8");

      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain("<path");
      expect(svg).not.toMatch(/<image\\b|<foreignObject\\b|data:image|<script\\b/i);
      expect(statSync(file).size).toBeLessThan(2_000_000);
    }
  });

  it("preserves the original desktop proportion and mobile's three vector crops", () => {
    const desktop = readFileSync(join(posterDir, "tabitabi-feature-poster.svg"), "utf8");
    const mobile = readFileSync(join(posterDir, "tabitabi-feature-poster-mobile.svg"), "utf8");

    expect(desktop).toContain('viewBox="0 0 1208 1302"');
    expect(mobile).toContain('viewBox="0 0 500 1620"');
    expect((mobile.match(/<clipPath/g) ?? []).length).toBe(3);
    expect((mobile.match(/<use /g) ?? []).length).toBe(3);
    expect(mobile).toContain('stroke-linecap="round"');
  });

  it("serves only the selected responsive image to the browser", () => {
    const component = readFileSync(join(process.cwd(), "src", "routes", "home", "JourneyPoster.svelte"), "utf8");
    expect(component).toContain('<picture class="poster-picture">');
    expect(component).toContain('media="(max-width: 900px)"');
    expect(component).toContain('srcset="/illustrations/tabitabi-feature-poster-mobile.svg"');
    expect(component).toContain('src="/illustrations/tabitabi-feature-poster.svg"');
  });
});
