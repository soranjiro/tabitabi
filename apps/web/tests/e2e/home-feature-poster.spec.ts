import { expect, test } from "@playwright/test";

for (const width of [320, 390, 560, 640, 641, 768, 900, 901, 1024, 1440]) {
  test(`feature illustrations and captions remain readable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const poster = page.getByRole("region", { name: "旅のしおりを、もっと自由に。" });
    const features = poster.getByRole("article");
    await expect(features).toHaveCount(6);
    for (const feature of await features.all()) {
      await feature.scrollIntoViewIfNeeded();
      await expect(feature.getByRole("heading")).toBeVisible();
      await expect.poll(() => feature.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const geometry = await feature.evaluate((element) => {
        const art = element.querySelector("img")!.getBoundingClientRect();
        const caption = element.querySelector(".feature-caption")!.getBoundingClientRect();
        const text = element.querySelector("p")!;
        return {
          artBottom: art.bottom,
          captionTop: caption.top,
          left: caption.left,
          right: caption.right,
          textSize: parseFloat(getComputedStyle(text).fontSize),
          textOverflow: text.scrollWidth - text.clientWidth,
        };
      });
      expect(geometry.artBottom).toBeLessThanOrEqual(geometry.captionTop);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.textSize).toBeGreaterThanOrEqual(13);
      expect(geometry.textOverflow).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    await poster.screenshot({ path: testInfo.outputPath("feature-poster.png") });
  });
}

test("all feature descriptions remain available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const poster = page.getByRole("region", { name: "旅のしおりを、もっと自由に。" });
    await expect(poster.getByRole("heading", { level: 3 })).toHaveText([
      "しおりを作る", "多彩なデザイン", "SNSで共有", "お金・持ち物の管理", "シークレットモード", "いつでも、どこでも",
    ]);
  } finally {
    await context.close();
  }
});
