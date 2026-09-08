import { expect, test } from '@playwright/test';

test('home explains the service and scrolls to create section', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page).toHaveTitle(/たびたび/);

  await expect(page.getByRole('heading', { name: /旅の予定を/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'みんなのしおりを見る' })).toBeVisible();
  await expect(page.getByText('登録不要')).toBeVisible();

  const cta = page.getByRole('button', { name: /しおりを作る/ });
  await expect(cta).toBeVisible();

  await cta.click();

  await expect(page.locator('#create')).toBeInViewport();
});

test('desktop preview keeps its cover and compact size at narrow landscape widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const previewArea = page.locator('.preview-area');
  const previewPhoto = page.locator('.preview-photo');

  await expect(previewArea).toHaveCSS('width', '300px');
  await expect(previewPhoto).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });

  await expect(previewArea).toHaveCSS('width', '300px');
  await expect(previewPhoto).toBeVisible();
});

test('mobile hero keeps the background unobstructed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.hero-picture')).toBeVisible();
  await expect(page.locator('.paper-reveal')).toBeHidden();
});
