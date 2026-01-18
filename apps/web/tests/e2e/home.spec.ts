import { expect, test } from '@playwright/test';

test('home loads and scrolls to create section', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/たびたび/);

  const cta = page.getByRole('button', { name: '無料でしおりを作成' });
  await expect(cta).toBeVisible();

  await expect(page.locator('#features')).toBeVisible();

  await cta.click();

  await expect(page.locator('#create')).toBeInViewport();
});
