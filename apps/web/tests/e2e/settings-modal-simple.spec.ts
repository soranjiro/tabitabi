import { test, expect } from "@playwright/test";

test("Settings modal position test", async ({ page }) => {
  await page.goto("http://localhost:5173/demo/standard-autumn");
  
  // Wait for the page to be interactive
  await page.waitForTimeout(2000);

  // Click settings button
  const settingsButton = page.locator('button[title="設定"]');
  await settingsButton.click();

  // Wait for dialog
  await page.waitForTimeout(500);

  const dialog = page.locator(".standard-autumn-dialog");
  const isVisible = await dialog.isVisible();
  
  console.log("Dialog visible:", isVisible);

  // Get positions
  const dialogBox = await dialog.boundingBox();
  console.log("Dialog box:", dialogBox);

  // Take screenshot
  await page.screenshot({
    path: "test-results/settings-modal-simple.png",
  });
});
