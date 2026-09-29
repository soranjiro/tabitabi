import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["iPhone 13"],
  defaultBrowserType: undefined,
});

test.describe("Responsive home page", () => {
  test("keeps the mobile hero readable and non-sticky", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("旅の予定を");
    await expect(page.locator(".hero-stage")).toBeVisible();
    await expect(page.locator(".shiori-preview")).toBeVisible();
    await expect(page.locator(".preview-photo")).toBeVisible();
    await expect(page.locator(".journey-section")).toBeVisible();
    await expect(page.locator(".create-section")).toBeVisible();

    const heroPosition = await page.locator(".hero-scene").evaluate(
      (element) => window.getComputedStyle(element).position,
    );
    expect(heroPosition).toBe("relative");

    const menuBox = await page.locator(".menu-button").boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.width).toBeGreaterThanOrEqual(44);
    expect(menuBox!.height).toBeGreaterThanOrEqual(44);
  });

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
  ]) {
    test(`does not overflow horizontally at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      if (viewport.width <= 1024) {
        const heroPosition = await page.locator(".hero-scene").evaluate(
          (element) => window.getComputedStyle(element).position,
        );
        expect(heroPosition).toBe("relative");
      }
    });
  }

  test("shows explicit creation and shared URL choices", async ({ page }) => {
    await page.goto("/");

    await page.locator(".create-section").scrollIntoViewIfNeeded();
    await expect(page.getByRole("tab", { name: "新しく作る" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "URLから開く" })).toBeVisible();

    await page.getByRole("tab", { name: "URLから開く" }).click();
    await expect(page.getByLabel("しおりのURL")).toBeVisible();
    await expect(page.getByRole("button", { name: /しおりを開く/ })).toBeVisible();
  });

  test("keeps text-entry controls at 16px to prevent iOS focus zoom", async ({
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
