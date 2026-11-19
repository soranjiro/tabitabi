import { expect, test } from '@playwright/test';
const apiBase = process.env.PREVIEW_API_URL ?? 'http://localhost:8787/api/v1';
test('comparison moves stops, keeps candidates through themes, and edits a public preview locally', async ({ page, request }) => {
  test.setTimeout(120000);
  const created = await request.post(apiBase + '/itineraries', { data: { title: '京都ミニ旅行', theme_id: 'planning-draft' } });
  expect(created.ok()).toBeTruthy();
  const { id, token } = (await created.json()).data;
  const headers = { Authorization: 'Bearer ' + token };
  const ids: Record<string,string> = {};
  const titles = ['東京 出発','東山でランチ','清水寺','嵐山でランチ','竹林の道','京都で合流'];
  const times = ['08:00','11:30','13:00','11:30','13:00','16:00'];
  const nodes = [];
  for (const [index,title] of titles.entries()) {
    const time = '2026-12-10T' + times[index];
    const res = await request.post(apiBase + '/steps', { headers, data: { itinerary_id:id,title,start_at:new Date(time+'+09:00').getTime(),end_at:new Date(time+'+09:00').getTime()+3600000,type:'normal:general',notes:'' } });
    expect(res.ok()).toBeTruthy();
    ids[title] = (await res.json()).data.id;
    nodes.push({ id:ids[title],title,kind:'step',type:'normal:general',start_local:time,end_local:time,location:'',notes:'',link:'',amount:null,currency:'JPY',participants:[],options:[],selected_option_id:null });
  }
  const edge = (a: number,b: number,label = '') => ({ id:crypto.randomUUID(),from:nodes[a].id,to:nodes[b].id,label });
  const edges = [edge(0,1,'プラン A'),edge(1,2),edge(2,5),edge(0,3,'プラン B'),edge(3,4),edge(4,5)];
  const candidate = { id:'hotel-a',title:'京都駅前のホテル',provider:'',amount:9800,currency:'JPY',start_local:'',end_local:'',from:'',to:'京都駅',cancellation:'前日まで無料',url:'',notes:'' };
  Object.assign(nodes[5], { kind:'choices',options:[candidate] });
  const saved = await request.put(apiBase+'/itineraries/'+id+'/plan-graph',{ headers,data:{revision:0,nodes,edges} });
  expect(saved.ok()).toBeTruthy();
  let publicId: string | undefined;
  try {
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('/itineraries/'+id+'?token='+token);
    await expect(page.locator('.graph-node')).toHaveCount(6);
    await expect(page.getByRole('complementary', { name:'プランと候補' })).toBeVisible();
    const pick = (title: string) => page.locator('.graph-node').filter({ has:page.locator('.node-copy strong').getByText(title,{exact:true}) }).locator('.node-main').click();
    await pick('清水寺');
    await page.getByLabel('別プランへ移動').selectOption({label:'嵐山でランチ の後'});
    await page.getByRole('button',{name:'移動する',exact:true}).click();
    await expect.poll(async () => (await (await request.get(apiBase+'/itineraries/'+id+'/plan-graph',{headers})).json()).data.edges.some((e: any) => e.from===ids['嵐山でランチ'] && e.to===ids['清水寺'])).toBe(true);
    await page.getByRole('button',{name:'参加者・参考金額',exact:true}).click();
    const metadata = page.getByRole('dialog',{name:'分岐プランの予定'});
    await metadata.getByLabel('参加者').fill('あおい、ひなた');
    await metadata.getByLabel('参考金額').fill('2800');
    await metadata.getByRole('button',{name:'保存',exact:true}).click();
    await expect(metadata).toBeHidden();
    await expect(page.locator('.graph-node').filter({hasText:'清水寺'})).toContainText('あおい・ひなた');
    await page.getByRole('button',{name:'京都駅前のホテルを選択',exact:true}).click();
    await page.getByRole('button',{name:'選択案をこの予定に反映',exact:true}).first().click();
    await expect(page.locator('.node-copy strong').getByText('京都駅前のホテル',{exact:true})).toBeVisible();
    await expect(page.locator('.graph-node')).toHaveCount(6);

    await page.reload();
    await expect(page.getByRole('button',{name:'京都駅前のホテルを選択',exact:true})).toHaveAttribute('aria-pressed','true');
    // A theme round trip keeps the graph while ordinary Step edits remain authoritative.
    const graphBefore = (await (await request.get(apiBase+'/itineraries/'+id+'/plan-graph',{headers})).json()).data;
    for (const theme_id of ['list','planning-draft']) {
      expect((await request.put(apiBase+'/itineraries/'+id,{headers,data:{theme_id}})).ok()).toBeTruthy();
      await page.reload();
    }
    await expect(page.locator('.graph-node')).toHaveCount(6);
    await expect(page.getByRole('button',{name:'京都駅前のホテルを選択',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.screenshot({path:'test-results/comparison-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('.mobile-compare')).toBeVisible();
    await expect(page.locator('.mobile-compare .route-heading')).toHaveCount(2);
    await expect(page.locator('.mobile-compare .shared-cell .stop-card').first()).toBeVisible();
    expect(await page.locator('main').last().evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await page.screenshot({path:'test-results/comparison-mobile.png',fullPage:true});
    expect((await request.put(apiBase+'/itineraries/'+id,{headers,data:{theme_id:'list'}})).ok()).toBeTruthy();
    const publish = await request.post(apiBase+'/itineraries/'+id+'/publish',{headers});
    expect(publish.ok()).toBeTruthy();
    publicId = (await publish.json()).data.id;
    await page.goto('/s/'+publicId);
    await page.getByRole('button',{name:'予定表で編集',exact:true}).click();
    await expect(page.locator('.graph-node')).toHaveCount(6);
    await page.getByRole('button',{name:'京都駅前のホテルを選択',exact:true}).click();
    await expect(page.getByRole('button',{name:'京都駅前のホテルを選択',exact:true})).toHaveAttribute('aria-pressed','false');
    const publicGraph = (await (await request.get(apiBase+'/itineraries/'+publicId+'/plan-graph')).json()).data;
    expect(publicGraph.nodes.find((n: any)=>n.kind==='choices').selected_option_id).toBe('hotel-a');
    // Copy serializes the local selection and remaps every endpoint to a copied Step.
    const copied = await request.post(apiBase+'/itineraries/'+publicId+'/fork',{data:{itinerary:{title:'比較コピー',memo:'',theme_id:'planning-draft'},steps:(await (await request.get(apiBase+'/steps?itinerary_id='+publicId)).json()).data,planGraph:{...publicGraph,nodes:publicGraph.nodes.map((n:any)=>({...n,selected_option_id:null}))}}});
    expect(copied.ok()).toBeTruthy();
    const copy = (await copied.json()).data;
    const copyHeaders = {Authorization:'Bearer '+copy.token};
    const copyGraph = (await (await request.get(apiBase+'/itineraries/'+copy.id+'/plan-graph',{headers:copyHeaders})).json()).data;
    expect(copyGraph.nodes).toHaveLength(6);
    expect(copyGraph.edges).toHaveLength(graphBefore.edges.length);
    expect(copyGraph.nodes.every((n:any)=>n.selected_option_id===null)).toBe(true);
    await request.delete(apiBase+'/itineraries/'+copy.id,{headers:copyHeaders});
  } finally { await request.delete(apiBase+'/itineraries/'+id,{headers}); }
});

test('sample comparison is editable without backend writes and survives reload', async ({ page }) => {
  const mutations: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/v1/') && ['POST','PUT','PATCH','DELETE'].includes(request.method())) mutations.push(request.url());
  });
  await page.setViewportSize({ width:390,height:844 });
  await page.goto('/demo/planning-comparison');
  await expect(page.locator('.graph-node')).toHaveCount(9);
  // The default mobile view retains parallel paths, times and shared stops.
  await expect(page.locator('.mobile-compare')).toBeInViewport();
  await expect(page.locator('.mobile-compare .route-heading')).toHaveCount(2);
  await expect(page.locator('.mobile-compare .shared-cell .stop-card').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '縦一覧' })).toHaveCount(0);
  await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(9);
  await page.locator('.mobile-compare .stop-card').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.mobile-compare .stop-card').first()).toBeInViewport();
  await page.getByRole('button',{name:'京都駅周辺のホテルを選択',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'京都駅周辺のホテルを選択',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(mutations).toEqual([]);
  expect(await page.locator('main').last().evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
});


test('mobile comparison offers gap insertion and direct existing-step merge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/planning-comparison');
  await expect(page.locator('.graph-node')).toHaveCount(9);
  await expect(page.locator('.mobile-compare')).toBeVisible();
  await expect(page.getByRole('button', { name: '縦一覧' })).toHaveCount(0);
  await expect(page.locator('.mobile-compare .route-heading')).toHaveCount(2);
  await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(9);
  await expect(page.locator('.mobile-compare')).toContainText('プラン A');
  await expect(page.locator('.mobile-compare')).toContainText('プラン B');
  await expect(page.locator('.mobile-compare')).toContainText('東京 出発');
  await expect(page.locator('.mobile-compare')).toContainText('京都のホテルに集合');
  await page.getByRole('button', { name: '京都のホテルに集合の予定を開く' }).click();
  await expect(page.locator('.detail-panel h3')).toHaveText('京都のホテルに集合');
  await page.locator('.detail-panel .panel-heading > button').click();
  expect(await page.locator('main').last().evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  const train = page.locator('.mobile-compare .lane-cell').filter({
    has: page.locator('.stop-title strong').getByText('東京 → 京都（新幹線）', { exact: true }),
  });
  await train.getByRole('button', { name: '東京 → 京都（新幹線）の後に予定を追加・接続' }).click();
  const actions = page.getByRole('dialog', { name: '予定を追加・接続' });
  await expect(actions).toBeVisible();
  await actions.getByRole('button', { name: '既存の予定を挿入' }).click();
  const existing = page.getByRole('dialog', { name: '既存の予定を挿入' });
  await expect(existing.getByRole('searchbox', { name: '予定を検索' })).toBeVisible();
  await existing.getByRole('button', { name: '閉じる' }).click();

  await train.getByRole('button', { name: '東京 → 京都（新幹線）の後に予定を追加・接続' }).click();
  await page.getByRole('dialog', { name: '予定を追加・接続' })
    .getByRole('button', { name: '既存の予定を複製' }).click();
  const copy = page.getByRole('dialog', { name: '既存の予定を複製' });
  await expect(copy).toBeVisible();
  await copy.getByRole('button', { name: /京都の夜を楽しむ/ }).click();
  const copyForm = page.getByRole('dialog', { name: '分岐プランの予定' });
  await expect(copyForm.getByRole('textbox', { name: 'タイトル' })).toHaveValue('京都の夜を楽しむ（コピー）');
  await copyForm.getByRole('button', { name: '閉じる' }).click();

  await train.locator('.stop-card').click();
  const panel = page.getByRole('region', { name: '選択した予定の操作' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '既存予定に合流' }).click();
  await expect(page.locator('.mobile-join-banner')).toBeVisible();
  await page.getByRole('button', { name: '京都のホテルに集合に合流' }).click();
  await expect(page.locator('.mobile-join-banner')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '元に戻す' })).toBeVisible();
  await page.getByRole('button', { name: '元に戻す' }).click();
  await expect(page.getByRole('button', { name: '元に戻す' })).toHaveCount(0);
  await expect(page.locator('.graph-node')).toHaveCount(9);
  await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(9);
});
