import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test('renders the locally created example from the database', async ({ page }) => {
  test.skip(!process.env.PLANNING_EXAMPLE_ID, 'Run make create-planning-example first, then set PLANNING_EXAMPLE_ID');
  await page.goto(`/itineraries/${process.env.PLANNING_EXAMPLE_ID}`);
  await expect(page.getByRole('button',{name:'秋の京都、ふたりで考える1泊2日',exact:true})).toBeVisible();
  await expect(page.locator('.idea')).toHaveCount(6);
  await expect(page.locator('.trip-description')).toContainText('予約はまだしていません');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(6);
  await page.screenshot({path:'../../.tmp/planning-example-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'../../.tmp/planning-example-mobile.png',fullPage:true});
});

test('finds a place by name, confirms its address and saves its pin without coordinates', async ({ page }) => {
  const searches: string[] = [];
  await page.route('https://photon.komoot.io/api/**', route => {
    searches.push(route.request().url());
    return route.fulfill({json:{features:[{properties:{name:'京都駅',osm_type:'N',osm_id:123,country:'日本',state:'京都府',city:'京都市'},geometry:{coordinates:[135.7588,34.9858]}}]}});
  });
  await page.goto('/demo/planning-map');
  await page.getByRole('button', {name:'⌕ 場所名から探して追加 施設名・お店・駅など'}).click();
  await expect(page.getByLabel('緯度', {exact:true})).toHaveCount(0);
  await page.getByLabel('場所名・施設名から探す').fill('京都駅');
  expect(searches).toHaveLength(0);
  await page.getByRole('button',{name:'場所を検索',exact:true}).click();
  await page.getByRole('button').filter({hasText:'京都駅日本 · 京都府 · 京都市この場所を選ぶ'}).click();
  await expect(page.getByLabel('タイトル',{exact:true})).toHaveValue('京都駅');
  await expect(page.getByText('✓ 場所を選択済み',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'追加',exact:true}).click();
  await expect(page.locator('.idea').filter({hasText:'京都駅'})).toContainText('京都市');
  await page.reload();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(6);
  expect(searches).toHaveLength(1);
});

test('failed place search allows a name-only candidate and explanation can be edited', async ({ page }) => {
  await page.route('https://photon.komoot.io/api/**', route => route.fulfill({status:503,body:'unavailable'}));
  await page.goto('/demo/planning-map');
  await page.getByText('しおりの説明を編集',{exact:true}).click();
  await page.getByRole('textbox',{name:'しおりの説明',exact:true}).fill('雨なら美術館にする旅。');
  await page.getByRole('button',{name:'説明を保存'}).click();
  await page.reload();
  await expect(page.locator('.trip-description')).toContainText('雨なら美術館にする旅。');
  await page.getByRole('button',{name:'候補を追加',exact:true}).click();
  await page.getByLabel('場所名・施設名から探す').fill('喫茶店');
  await page.getByRole('button',{name:'場所を検索',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('場所を検索できませんでした');
  await page.getByLabel('タイトル',{exact:true}).fill('あとで探す喫茶店');
  await page.getByRole('button',{name:'追加',exact:true}).click();
  await expect(page.locator('.idea').filter({hasText:'あとで探す喫茶店'})).toContainText('場所はあとで');
});

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7ecdf"/><path d="M0 60H256M0 160H256M60 0V256M160 0V256" stroke="#faf9f3" stroke-width="10"/><path d="M0 115H256" stroke="#c4dce0" stroke-width="14"/></svg>'}));
});

test('collect a pin, assign a day, preserve it on reload, and delete', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', r => { if (['POST','PUT','PATCH','DELETE'].includes(r.method()) && /\/v1\//.test(r.url())) writes.push(r.url()); });
  await page.goto('/demo/planning-map');
  await expect(page.getByRole('heading', {name:'「行きたい」から、旅を描こう。'})).toBeVisible();
  await page.getByRole('button', {name:'＋ 地図にピンを刺す'}).click();
  await page.getByRole('button', {name:'地図の中心に追加'}).click();
  await page.getByLabel('タイトル', {exact:true}).fill('気になる喫茶店');
  await page.getByLabel('メモ', {exact:true}).fill('雨の日の休憩候補');
  await page.getByRole('button', {name:'追加', exact:true}).click();
  await page.getByRole('button').filter({hasText:'気になる喫茶店'}).first().click();
  await page.getByRole('button', {name:'メモ・場所・行く日を編集 ↗'}).click();
  await expect(page.getByText('✓ 場所を選択済み', {exact:true})).toBeVisible();
  await page.getByLabel('日を決める', {exact:true}).check();
  await page.locator('.date-fields select').selectOption('2');
  await page.getByRole('button', {name:'保存', exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button').filter({hasText:'気になる喫茶店'}).first()).toContainText('Day 2');
  await page.getByRole('button').filter({hasText:'気になる喫茶店'}).first().click();
  await page.getByRole('button', {name:'メモ・場所・行く日を編集 ↗'}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name:'この予定を削除'}).click();
  await expect(page.locator('.idea').filter({hasText:'気になる喫茶店'})).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('mobile candidates, filtering and theme switch', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/demo/planning-map');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
  await page.getByLabel('保存した候補を検索').fill('南禅寺');
  await expect(page.locator('.idea')).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await page.getByLabel('保存した候補を検索').fill('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'../../.tmp/planning-map-mobile.png',fullPage:true});
  await page.getByRole('button', {name:'旅程を見る',exact:true}).click();
  await page.getByRole('button', {name:'ほかのテーマを試す'}).click();
  await page.locator('.theme-choices button').filter({hasText:'プランニング'}).click();
  await expect(page.locator('.map-planning')).toHaveCount(0);
  await expect(page.locator('.map-frame')).toHaveCount(0);
});

test('map failure keeps candidate editing available', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/demo/planning-map');
  await expect(page.getByText('地図を読み込めません。候補リストから計画を続けられます。')).toBeVisible();
  await page.getByRole('button', {name:'候補を追加',exact:true}).click();
  await page.getByLabel('タイトル', {exact:true}).fill('場所はあとで決める');
  await page.getByRole('button', {name:'追加',exact:true}).click();
  await expect(page.locator('.idea').filter({hasText:'場所はあとで決める'})).toContainText('場所はあとで');
});

test('desktop preview and read only mode', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/demo/planning-map');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
  await page.screenshot({path:'../../.tmp/planning-map-desktop.png',fullPage:true});
  await page.getByRole('button', {name:'メニュー',exact:true}).click();
  await page.getByRole('button').filter({hasText:'閲覧モード'}).click();
  await expect(page.getByRole('button', {name:'候補を追加',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button', {name:'＋ 地図にピンを刺す'})).toHaveCount(0);
});
