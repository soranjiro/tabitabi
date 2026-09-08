import { type DemoDataSet, now, getTimestamp } from '../types';
import { updateStepSchedule } from '$lib/planning/schedule';
import { updatePlace } from '$lib/planning/places';

export function getDemoData(): DemoDataSet {
  const places = [
    { title:'南禅寺', lat:35.0114, lng:135.7945, note:'水路閣をゆっくり歩きたい。朝の光がきれいそう。', location:'岡崎・東山', priority:true },
    { title:'哲学の道', lat:35.0265, lng:135.7932, note:'川沿いを散歩。近くの喫茶店も探しておこう。', location:'銀閣寺・哲学の道' },
    { title:'錦市場', lat:35.005, lng:135.7649, note:'気になるお店を少しずつ。お昼の候補に。', location:'四条・河原町' },
    { title:'京都府立植物園', lat:35.0485, lng:135.7634, note:'晴れたらここでのんびり。雨なら美術館にしよう。', location:'北山', priority:true },
    { title:'鴨川デルタ', lat:35.0307, lng:135.7713, note:'コーヒーを片手に、何もしない時間。', location:'出町柳', day:1 },
  ];
  return {
    itinerary: { id:'demo', title:'次の京都、どこ行こう。', theme_id:'planning-map', memo:JSON.stringify({text:'急がない、詰めこまない。友人2人で考える、秋の京都1泊2日。\n日程は10月の週末で相談中。寺院・散歩・喫茶店を中心に、1日3か所まで。\nDay 1は東山、Day 2は鴨川・北山を軸に検討。雨なら植物園の代わりに美術館へ。\n未決定：旅行日、京都駅近くの宿、喫茶店。宿・交通・拝観の予約はまだしていません。'}), password:null, created_at:now, updated_at:now },
    steps:places.map((p,i) => ({ id:`atelier-${i}`, itinerary_id:'demo', title:p.title, location:p.location, start_at:getTimestamp(0,'12:00'), end_at:getTimestamp(0,'13:00'), created_at:now, updated_at:now,
      notes:updatePlace(updateStepSchedule(JSON.stringify({text:p.note}), { precision:p.day ? 'day' : 'undecided', day:p.day, order:i }), { lat:p.lat, lng:p.lng, priority:p.priority }),
    })),
  };
}
