// Creates a real example in the local development database; never publishes it.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = 'http://localhost:8787/api/v1';
const output = new URL('../.tmp/planning-example.json', import.meta.url);
async function api(path, data) {
  const response = await fetch(base + path, data ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)} : {});
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error?.message || 'Local API failed');
  return body.data;
}
let existing;
try { existing = JSON.parse(await readFile(output,'utf8')); } catch {}
if (existing?.id) {
  const steps = await api(`/steps?itinerary_id=${existing.id}`);
  console.log(JSON.stringify({url:existing.url,steps:steps.length}));
} else {
  const wishes = [
    ['南禅寺', 1, true, '水路閣を歩きたい。Day 1の軸に仮置き。出発日が決まったら拝観時間を公式サイトで確認。'],
    ['哲学の道', 1, false, '南禅寺と同じ日に散歩できるか検討。疲れたら短くして、途中で喫茶店へ。'],
    ['鴨川デルタ', 2, true, 'Day 2は川辺でのんびり。コーヒーを買うお店はこれから探す。'],
    ['京都府立植物園', null, false, '晴れた日の候補。鴨川の散歩と組み合わせるか相談。雨なら美術館に変更。'],
    ['錦市場', null, false, '食べ歩きではなく、店のルールに沿ってお昼を楽しみたい。寄れる時間があるか検討。'],
    ['京都市京セラ美術館', null, false, '雨の日の代案。開催中の展覧会・休館日・チケットを、旅行日が決まってから確認。'],
  ];
  const places = [];
  for (const [name,day,priority,note] of wishes) {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q',name); url.searchParams.set('limit','6');
    const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`Place search failed: ${name}`);
    const data = await response.json();
    const feature = data.features.find(f => f.properties.countrycode === 'JP' && [f.properties.city,f.properties.state].some(v => v?.includes('京都')));
    if (!feature) throw new Error(`Kyoto search result missing: ${name}`);
    const [lng,lat] = feature.geometry.coordinates;
    places.push({name,day,priority,note,lat,lng,address:[feature.properties.state,feature.properties.city,feature.properties.district,feature.properties.street].filter(Boolean).join(' ')});
    await new Promise(resolve => setTimeout(resolve,1200));
  }
  const description = '友人2人で考える、秋の京都1泊2日。急がない、詰めこまない旅。\n旅行日は10月の週末で相談中。寺院・散歩・喫茶店を中心に、1日3か所まで。\nDay 1：東山の南禅寺〜哲学の道。Day 2：鴨川を軸に、晴れたら植物園を検討。\n雨の日の代案は京セラ美術館。錦市場はお昼の候補として保留。\nこれから決めること：旅行日、宿、喫茶店、交通・施設の予約。予約はまだしていません。';
  const itinerary = await api('/itineraries',{title:'秋の京都、ふたりで考える1泊2日',theme_id:'planning-map',memo:JSON.stringify({text:description})});
  await mkdir(new URL('../.tmp/',import.meta.url),{recursive:true});
  const url = `http://localhost:5173/itineraries/${itinerary.id}`;
  await writeFile(output,JSON.stringify({id:itinerary.id,url,expectedSteps:places.length},null,2));
  for (const [index,p] of places.entries()) {
    const start = new Date('2026-10-10T12:00:00+09:00').getTime() + ((p.day || 1)-1)*86400000;
    await api('/steps',{itinerary_id:itinerary.id,title:p.name,location:p.address,start_at:start,end_at:start+3600000,
      link:`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`,
      notes:JSON.stringify({text:p.note,tabitabi_schedule:{precision:p.day ? 'day' : 'undecided',day:p.day || undefined,order:index},tabitabi_place:{lat:p.lat,lng:p.lng,priority:p.priority}})});
  }
  const saved = await api(`/steps?itinerary_id=${itinerary.id}`);
  if (saved.length !== places.length) throw new Error('Example is incomplete');
  console.log(JSON.stringify({url,steps:saved.length,source:'Live Photon results',storage:'Local development database'}));
}
