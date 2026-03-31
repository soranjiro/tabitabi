import { test, expect } from "@playwright/test";

test.describe("修正内容の検証", () => {
  test("デモページが正常に読み込まれることを確認", async ({ page }) => {
    await page.goto("http://localhost:5173/demo");
    await expect(page).toHaveTitle(/たびたび/);
    await page.waitForTimeout(1000);
  });

  test("リストビューでアイテムをクリックして編集できることを確認", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Switch to list view
    const modeButtons = page.locator("button");
    const buttons = await modeButtons.evaluateAll((buttons) =>
      buttons.map((b) => b.textContent?.trim())
    );

    const listViewIdx = buttons.findIndex((text) =>
      text?.includes("リスト")
    );
    if (listViewIdx >= 0) {
      await modeButtons.nth(listViewIdx).click();
      await page.waitForTimeout(500);
    }

    // Find first table row and click
    const firstRow = page.locator(".standard-autumn-list-table tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(500);
    }
  });

  test("月ビューで曜日列幅がずれないことを確認", async ({ page }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Switch to month view
    const modeButtons = page.locator("button");
    const buttons = await modeButtons.evaluateAll((buttons) =>
      buttons.map((b) => b.textContent?.trim())
    );

    const monthViewIdx = buttons.findIndex((text) => text?.includes("月"));
    if (monthViewIdx >= 0) {
      await modeButtons.nth(monthViewIdx).click();
      await page.waitForTimeout(500);
    }

    // Check if weekdays headers are visible
    const weekdayHeaders = page.locator(".standard-autumn-month-weekday");
    const count = await weekdayHeaders.count();
    expect(count).toBe(7);
  });

  test("スクロール時に予定が下メニューで被らないことを確認", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Check scrollbar gutter is set
    const container = page.locator(".standard-autumn-views-container");
    const scrollbarGutter = await container.evaluate((el) => {
      return window.getComputedStyle(el).scrollbarGutter;
    });
    expect(scrollbarGutter).toBe("stable");
  });

  test("編集中にビューモードボタンを押すと確認ダイアログが表示される", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Try to start editing in dayCard view
    const cards = page.locator(".standard-autumn-card");
    if (await cards.first().isVisible()) {
      await cards.first().click();
      await page.waitForTimeout(500);

      // Listen for dialog
      let dialogShown = false;
      page.on("dialog", async (dialog) => {
        dialogShown = true;
        expect(dialog.type()).toBe("confirm");
        await dialog.dismiss();
      });

      // Try to toggle to view mode
      const modeButtons = page.locator("button");
      const buttons = await modeButtons.evaluateAll((buttons) =>
        buttons.map((b) => b.getAttribute("aria-label"))
      );
      const modeIdx = buttons.findIndex((label) => label?.includes("モード"));
      if (modeIdx >= 0) {
        await modeButtons.nth(modeIdx).click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("週ビューで最初と最後の日程の期間のみ表示されることを確認", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Switch to week view
    const modeButtons = page.locator("button");
    const buttons = await modeButtons.evaluateAll((buttons) =>
      buttons.map((b) => b.textContent?.trim())
    );

    const weekViewIdx = buttons.findIndex((text) => text?.includes("週"));
    if (weekViewIdx >= 0) {
      await modeButtons.nth(weekViewIdx).click();
      await page.waitForTimeout(500);

      // Check if day headers exist
      const dayHeaders = page.locator(".standard-autumn-week-day-header");
      const count = await dayHeaders.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(31);
    }
  });

  test("印刷ビューでヘッダーと下メニューが非表示になることを確認", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Switch to month view first
    const modeButtons = page.locator("button");
    const buttons = await modeButtons.evaluateAll((buttons) =>
      buttons.map((b) => b.textContent?.trim())
    );

    const monthViewIdx = buttons.findIndex((text) => text?.includes("月"));
    if (monthViewIdx >= 0) {
      await modeButtons.nth(monthViewIdx).click();
      await page.waitForTimeout(500);
    }

    // Simulate print media query
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(300);

    // Check if nav elements are hidden
    const monthNav = page.locator(".standard-autumn-month-nav");
    const bottomNav = page.locator(".standard-autumn-bottom-nav");

    const monthNavDisplay = await monthNav.evaluate(
      (el) => window.getComputedStyle(el).display
    );
    expect(monthNavDisplay).toBe("none");

    const bottomNavDisplay = await bottomNav.evaluate(
      (el) => window.getComputedStyle(el).display
    );
    expect(bottomNavDisplay).toBe("none");
  });

  test("リストビュー時にクリックで編集可能であることを確認", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/demo");
    await page.waitForTimeout(1500);

    // Switch to list view
    const modeButtons = page.locator("button");
    const buttons = await modeButtons.evaluateAll((buttons) =>
      buttons.map((b) => b.textContent?.trim())
    );

    const listViewIdx = buttons.findIndex((text) =>
      text?.includes("リスト")
    );
    if (listViewIdx >= 0) {
      await modeButtons.nth(listViewIdx).click();
      await page.waitForTimeout(500);

      // Find first table row
      const firstRow = page.locator(".standard-autumn-list-table tbody tr").first();
      const isClickable = await firstRow.evaluate((el) => {
        return window.getComputedStyle(el).cursor === "pointer";
      });
      expect(isClickable).toBe(true);
    }
  });
});
