import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
});

test.describe("Mobile Home Page", () => {
  test("should display home page on mobile", async ({ page }) => {
    await page.goto("/");

    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "test-results/mobile-home.png",
      fullPage: true,
    });

    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();

    const heroTitle = page.locator(".hero-title");
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText("たびたび");

    const features = page.locator(".features");
    await expect(features).toBeVisible();

    const createSection = page.locator(".create-section");
    await expect(createSection).toBeVisible();

    const errors = await page.evaluate(() => {
      const errorLogs: string[] = [];
      const originalError = console.error;
      console.error = (...args) => {
        errorLogs.push(args.join(" "));
        originalError.apply(console, args);
      };
      return errorLogs;
    });

    console.log("Console errors:", errors);
  });

  test("should check opacity and visibility", async ({ page }) => {
    await page.goto("/");

    await page.waitForLoadState("networkidle");

    const homePage = page.locator(".home-page");
    const opacity = await homePage.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    console.log("Home page opacity:", opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0);

    const hero = page.locator(".hero");
    const heroOpacity = await hero.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    console.log("Hero opacity:", heroOpacity);

    const sectionHeader = page.locator(".section-header").first();
    const headerOpacity = await sectionHeader.evaluate((el) =>
      window.getComputedStyle(el).opacity
    );
    console.log("Section header opacity:", headerOpacity);
  });
});
