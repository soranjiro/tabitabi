import { expect, test } from '@playwright/test';

test('home explains the service and scrolls to create section', async ({ page }) => {
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
