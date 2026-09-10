import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('deployed preview enforces itinerary security boundaries', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview security testing');
  test.setTimeout(60_000);

  const suffix = Date.now();
  const created: Array<{ id: string; token: string }> = [];

  async function createProtected(title: string, themeId = 'planning-draft') {
    const response = await request.post(`${apiBaseUrl}/itineraries`, {
      data: {
        title,
        password: `security-${suffix}`,
        theme_id: themeId,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const item = { id: body.data.id as string, token: body.data.token as string };
    created.push(item);
    return item;
  }

  const target = await createProtected(`security-target-${suffix}`, 'ai-generated');
  const other = await createProtected(`security-other-${suffix}`);

  try {
    console.log('preview-security-step=verify-source-list-is-not-enumerable');
    const listResponse = await request.get(`${apiBaseUrl}/itineraries`);
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    expect((listBody.data as Array<{ id: string }>).some((item) => item.id === target.id)).toBeFalsy();
    expect((listBody.data as Array<{ id: string }>).some((item) => item.id === other.id)).toBeFalsy();

    console.log('preview-security-step=enable-secret-mode');
    const secretSettingsResponse = await request.put(`${apiBaseUrl}/itineraries/${target.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
      data: { secret_settings: { enabled: true, offset_minutes: 60 } },
    });
    expect(secretSettingsResponse.ok()).toBeTruthy();

    console.log('preview-security-step=create-future-secret');
    const now = Date.now();
    const secretTitle = `secret-${suffix}`;
    const secretLocation = `hidden-location-${suffix}`;
    const createStepResponse = await request.post(`${apiBaseUrl}/steps`, {
      headers: { Authorization: `Bearer ${target.token}` },
      data: {
        itinerary_id: target.id,
        title: secretTitle,
        location: secretLocation,
        start_at: now + 2 * 60 * 60 * 1000,
        end_at: now + 3 * 60 * 60 * 1000,
      },
    });
    expect(createStepResponse.ok()).toBeTruthy();

    console.log('preview-security-step=verify-cross-itinerary-token-stays-masked');
    const wrongTokenResponse = await request.get(`${apiBaseUrl}/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(wrongTokenResponse.ok()).toBeTruthy();
    const wrongTokenBody = await wrongTokenResponse.json();
    expect(wrongTokenBody.data[0].title).toBe('?????');
    expect(wrongTokenBody.data[0].location).toBeNull();

    console.log('preview-security-step=verify-target-token-unmasks');
    const targetTokenResponse = await request.get(`${apiBaseUrl}/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
    });
    expect(targetTokenResponse.ok()).toBeTruthy();
    const targetTokenBody = await targetTokenResponse.json();
    expect(targetTokenBody.data[0].title).toBe(secretTitle);
    expect(targetTokenBody.data[0].location).toBe(secretLocation);

    console.log('preview-security-step=store-malicious-markdown');
    const xssPayload = '[safe label](javascript:alert(document.domain))\n\n<img src=x onerror="alert(document.domain)">';
    const memoResponse = await request.put(`${apiBaseUrl}/itineraries/${target.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
      data: { memo: JSON.stringify({ text: xssPayload }) },
    });
    expect(memoResponse.ok()).toBeTruthy();

    console.log('preview-security-step=verify-rendered-markdown-is-sanitized');
    let dialogs = 0;
    page.on('dialog', async (dialog) => {
      dialogs += 1;
      await dialog.dismiss();
    });
    await page.goto(`/itineraries/${target.id}?token=${encodeURIComponent(target.token)}`);
    await expect(page.getByText('safe label')).toBeVisible();
    expect(await page.locator('a[href^="javascript:"]').count()).toBe(0);
    expect(await page.locator('[onerror], [onclick], [onload]').count()).toBe(0);
    expect(dialogs).toBe(0);

    console.log('preview-security-step=complete');
  } finally {
    for (const item of created.reverse()) {
      try {
        await request.delete(`${apiBaseUrl}/itineraries/${item.id}`, {
          headers: { Authorization: `Bearer ${item.token}` },
        });
      } catch (error) {
        console.warn(`preview-security-cleanup-failed=${item.id}:${String(error)}`);
      }
    }
  }
});
