import { expect, test } from '@playwright/test';

const apiBaseUrl = 'http://localhost:8787/api/v1';

test('共有しおりは編集せず、自分用コピーへ進める', async ({ page, request }) => {
  const firebaseEmail = process.env.E2E_FIREBASE_EMAIL;
  const firebasePassword = process.env.E2E_FIREBASE_PASSWORD;
  test.skip(
    !firebaseEmail || !firebasePassword,
    'E2E_FIREBASE_EMAIL/PASSWORD にメール確認・プロフィール設定済みのアカウントが必要です',
  );

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const title = `共有フロー確認 ${suffix}`;

  const createResponse = await request.post(`${apiBaseUrl}/itineraries`, {
    data: { title, theme_id: 'standard-spring' },
  });
  expect(createResponse.status()).toBe(201);
  const original = (await createResponse.json()).data;

  const publishResponse = await request.post(`${apiBaseUrl}/itineraries/${original.id}/publish`);
  expect(publishResponse.status()).toBe(200);
  const snapshot = (await publishResponse.json()).data;

  await page.goto('/profile');
  await page.locator('#email').fill(firebaseEmail!);
  await page.locator('#password').fill(firebasePassword!);
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'アカウント設定' })).toBeVisible();

  await page.goto(`/${snapshot.id}`);
  await expect(page.getByText('閲覧専用です。コピーすると自分用に編集できます。')).toBeVisible();
  await expect(page.getByRole('button', { name: 'コピーして編集' })).toBeVisible();
  await expect(page.getByRole('button', { name: '編集モードに切り替え' })).toHaveCount(0);

  await page.getByRole('button', { name: 'コピーして編集' }).click();
  await page.waitForURL((url) => url.pathname !== `/${snapshot.id}`);
  await expect(page.getByText('閲覧専用です。コピーすると自分用に編集できます。')).toHaveCount(0);
  await expect(page.getByRole('button', { name: `${title}（コピー）` })).toBeVisible();
});

test('デモではタイトル変更がブラウザ内に保存される', async ({ page }) => {
  await page.goto('/demo?theme=standard-spring');
  await expect(page.getByText('変更はローカルに保存されます')).toBeVisible();

  const title = page.getByRole('button', { name: '春休みの京都旅行' });
  await title.click();
  const input = page.locator('.standard-title-input');
  await input.fill('デモで変更した旅程');
  await input.press('Enter');

  await expect(page.getByRole('button', { name: 'デモで変更した旅程' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tabitabi_demo') || '{}').itinerary?.title))
    .toBe('デモで変更した旅程');
});

test('デモのお金管理はAPIを待たずに表示・操作できる', async ({ page }) => {
  await page.goto('/demo?theme=standard-spring');
  await expect(page.getByText('変更はローカルに保存されます')).toBeVisible();

  await page.getByRole('button', { name: 'お金の管理' }).click();
  await expect(page.getByRole('heading', { name: 'お金の管理' })).toBeVisible();
  await expect(page.getByText('デモ用の会計データです。変更内容はこのブラウザに保存されます。')).toBeVisible();
  await expect(page.getByText('読み込み中…')).toHaveCount(0);
  await expect(page.getByText('¥69,000')).toBeVisible();

  await page.getByRole('button', { name: '支出一覧' }).click();
  await expect(page.getByText('1人あたり ¥12,000')).toBeVisible();
  await expect(page.getByText('1人あたり ¥6,000')).toBeVisible();
  await expect(page.getByRole('group', { name: '金額の入力方法' })).toBeVisible();
  await page.getByRole('button', { name: '1人あたり', exact: true }).click();
  await expect(page.getByLabel('1人あたり金額（円）')).toBeVisible();
  await expect(page.getByText('3人分の総額で登録します')).toBeVisible();

  const memberName = `テスト参加者-${Date.now()}`;
  await page.getByPlaceholder('メンバー名').fill(memberName);
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByText(memberName, { exact: true }).first()).toBeVisible();
});
