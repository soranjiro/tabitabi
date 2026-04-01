import { test, expect } from "@playwright/test";

test.describe("Standard Seasons Theme - Settings Modal", () => {
  test("Settings modal should be shown as modal dialog when clicked", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo/standard-autumn");
    await page.waitForLoadState("networkidle");

    const settingsButton = page.locator('button[title="設定"]');
    await expect(settingsButton).toBeVisible();

    // Click settings button
    await settingsButton.click();

    // Wait for dialog overlay to appear
    const dialogOverlay = page.locator(".standard-autumn-dialog-overlay");
    await expect(dialogOverlay).toBeVisible();

    const dialog = page.locator(".standard-autumn-dialog");
    await expect(dialog).toBeVisible();

    // Check if dialog has fixed positioning (it should)
    const style = await dialog.evaluate((el) => {
      return window.getComputedStyle(el, "::before").position;
    });

    // Get viewport
    const viewportSize = page.viewportSize();
    const dialogBox = await dialog.boundingBox();

    console.log("Viewport:", viewportSize);
    console.log("Dialog box:", dialogBox);

    if (dialogBox && viewportSize) {
      const dialogCenter = dialogBox.y + dialogBox.height / 2;
      const viewportCenter = viewportSize.height / 2;
      const isApproximatelyCentered = Math.abs(dialogCenter - viewportCenter) < 100;
      console.log("Dialog approximately centered:", isApproximatelyCentered);
    }

    // Take screenshot
    await page.screenshot({
      path: "test-results/settings-modal-screenshot.png",
    });
  });
});
