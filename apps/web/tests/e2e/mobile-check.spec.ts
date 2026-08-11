import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
  // Keep the project browser (Chromium) while emulating the iPhone viewport,
  // touch input, device scale factor, and user agent.
  defaultBrowserType: undefined,
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

  test("should keep text-entry controls at 16px to prevent iOS focus zoom", async ({
    page,
  }) => {
    await page.goto("/");

    const fontSizes = await page.evaluate(() => {
      const fixture = document.createElement("div");
      fixture.innerHTML = `
        <input data-control="text" type="text" style="font-size: 12px" />
        <input data-control="email" type="email" style="font-size: 12px" />
        <input data-control="date" type="date" style="font-size: 12px" />
        <textarea data-control="textarea" style="font-size: 12px"></textarea>
        <select data-control="select" style="font-size: 12px"><option>Option</option></select>
        <input data-control="checkbox" type="checkbox" style="font-size: 12px" />
      `;
      document.body.appendChild(fixture);

      return Object.fromEntries(
        Array.from(fixture.querySelectorAll<HTMLElement>("[data-control]")).map(
          (control) => [
            control.dataset.control,
            window.getComputedStyle(control).fontSize,
          ],
        ),
      );
    });

    expect(fontSizes).toMatchObject({
      text: "16px",
      email: "16px",
      date: "16px",
      textarea: "16px",
      select: "16px",
      checkbox: "12px",
    });
  });
});
