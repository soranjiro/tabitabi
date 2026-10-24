import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const illustrations = join(process.cwd(), "static", "illustrations", "features");

describe("landing feature SVG assets", () => {
  for (const name of readdirSync(illustrations).filter((name) => name.endsWith(".svg"))) {
    it(`${name} is valid, standalone vector artwork`, () => {
      const svg = readFileSync(join(illustrations, name), "utf8");
      const document = new DOMParser().parseFromString(svg, "image/svg+xml");
      expect(document.querySelector("parsererror")).toBeNull();
      expect(document.documentElement.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(document.querySelector("title")?.textContent?.trim()).toBeTruthy();
      expect(document.querySelector("image, script, foreignObject, use, [href]")).toBeNull();
      expect(svg).not.toMatch(/data:image|https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
      expect(Buffer.byteLength(svg)).toBeLessThan(10_000);
    });
  }
});
