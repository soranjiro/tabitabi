import { expect, test } from "@playwright/test";

test("deployed home keeps the intended mobile composition", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator(".hero-stage");
  const heroScene = page.locator(".hero-scene");
  const preview = page.locator(".shiori-preview");
  const journey = page.locator(".journey-section");

  await expect(hero).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(page.locator(".preview-photo")).toHaveCount(0);

  const viewport = page.viewportSize();
  const heroBox = await hero.boundingBox();
  const previewBox = await preview.boundingBox();
  const journeyBox = await journey.boundingBox();

  expect(viewport).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(journeyBox).not.toBeNull();

  expect(Math.abs(heroBox!.height - viewport!.height)).toBeLessThanOrEqual(1);
  expect(previewBox!.width).toBeGreaterThanOrEqual(285);
  expect(previewBox!.width).toBeLessThanOrEqual(320);
  expect(previewBox!.x).toBeGreaterThanOrEqual(24);
  expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(viewport!.width - 24);
  expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(viewport!.height - 10);
  expect(journeyBox!.y).toBeGreaterThanOrEqual(viewport!.height - 1);

  await page.screenshot({
    path: "test-results/home-mobile-hero.png",
    fullPage: false,
  });

  const initialPreviewTitle = await preview.locator("h2").textContent();
  const swipeBox = await heroScene.boundingBox();
  expect(swipeBox).not.toBeNull();

  await page.mouse.move(swipeBox!.x + swipeBox!.width * 0.78, swipeBox!.y + swipeBox!.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(swipeBox!.x + swipeBox!.width * 0.24, swipeBox!.y + swipeBox!.height * 0.72, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => preview.locator("h2").textContent()).not.toBe(initialPreviewTitle);

  await journey.scrollIntoViewIfNeeded();
  await expect(page.locator(".journey-art")).toBeVisible();
  await expect(page.locator(".story-line")).toHaveCount(1);
  await expect(page.getByText("旅の予定をまとめる。")).toBeVisible();
  await expect(page.getByText("URLで共有する。")).toBeVisible();
  await expect(page.getByText("みんなで確認。")).toBeVisible();

  await page.screenshot({
    path: "test-results/home-mobile-journey.png",
    fullPage: false,
  });

  const createSection = page.locator(".create-section");
  await createSection.scrollIntoViewIfNeeded();
  await expect(page.getByRole("tab", { name: "新しく作る" })).toBeVisible();
  await expect(page.getByText("表示スタイル", { exact: true })).toBeVisible();
  await expect(page.getByText("予定表", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("前の表示スタイル")).toBeVisible();
  await expect(page.getByLabel("次の表示スタイル")).toBeVisible();
  await expect(page.getByRole("switch", { name: "パスワードで保護する" })).toBeAttached();

  const formBox = await page.locator(".form-card").boundingBox();
  expect(formBox).not.toBeNull();
  expect(formBox!.x).toBeGreaterThanOrEqual(14);
  expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(viewport!.width - 14);

  await page.screenshot({
    path: "test-results/home-mobile-create.png",
    fullPage: false,
  });
});
