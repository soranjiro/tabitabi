import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('deployed mobile preview shows a visible circular help icon and opens docs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'メニューを開閉' }).click();

  const helpLink = page.locator('.site-header nav a[href="/docs/index"]');
  await expect(helpLink).toBeVisible();
  await page.screenshot({ path: 'test-results/help-icon-mobile.png', fullPage: false });

  const metrics = await helpLink.evaluate((element) => {
    const style = getComputedStyle(element);
    const pseudo = getComputedStyle(element, '::before');
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      borderRadius: style.borderRadius,
      foreground: pseudo.color,
      pseudoContent: pseudo.content,
      background: style.backgroundColor,
    };
  });
  console.log(`help-icon-metrics=${JSON.stringify(metrics)}`);

  expect(metrics.width).toBeGreaterThanOrEqual(39);
  expect(metrics.height).toBeGreaterThanOrEqual(39);
  expect(Math.abs(metrics.width - metrics.height)).toBeLessThan(1);
  expect(metrics.borderRadius).not.toBe('0px');
  expect(metrics.foreground).not.toBe('rgb(255, 255, 255)');
  expect(metrics.foreground).not.toBe('rgba(0, 0, 0, 0)');
  expect(metrics.pseudoContent).toContain('?');
  expect(metrics.background).not.toBe('rgba(0, 0, 0, 0)');

  await helpLink.click();
  await expect(page).toHaveURL(/\/docs\/index/);
});
