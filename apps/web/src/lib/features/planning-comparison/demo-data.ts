import type { DemoData } from '$lib/demo/demoStorage';
import { STEP_TYPE, type PlanGraphNode, type ComparisonOption } from '@tabitabi/types';

export function getDemoData(): DemoData {
  const now = '2026-12-10T00:00:00Z';
  const stops = [
    ['departure', '東京 出発', '08:00', '08:15', STEP_TYPE.TRANSPORT_PLANE],
    ['train', '東京 → 京都（新幹線）', '08:30', '10:45', STEP_TYPE.TRANSPORT_TRAIN],
    ['flight', '東京 → 大阪（飛行機）', '08:30', '10:00', STEP_TYPE.TRANSPORT_PLANE],
    ['lunch-a', '東山でランチ', '12:00', '13:00', STEP_TYPE.NORMAL_FOOD],
    ['lunch-b', '嵐山でランチ', '12:00', '13:00', STEP_TYPE.NORMAL_FOOD],
    ['kiyomizu', '清水寺', '13:30', '15:00', STEP_TYPE.NORMAL_SIGHTSEEING],
    ['arashiyama', '竹林の道', '13:30', '15:00', STEP_TYPE.NORMAL_SIGHTSEEING],
    ['hotel', '京都のホテルに集合', '16:00', '17:00', STEP_TYPE.NORMAL_HOTEL],
    ['night', '京都の夜を楽しむ', '18:00', '20:00', STEP_TYPE.NORMAL_SIGHTSEEING],
  ] as const;
  const nodes: PlanGraphNode[] = stops.map(([id,title,start,end,type]) => ({ id, title, type, kind:'step',
    start_local:'2026-12-10T'+start, end_local:'2026-12-10T'+end, location:'', notes:'', link:'',
    amount:null, currency:'JPY', participants:[], options:[], selected_option_id:null,
  }));
  const option = (id: string, title: string, amount: number): ComparisonOption => ({ id,title,amount,currency:'JPY',provider:'サンプル',start_local:'',end_local:'',from:'',to:'京都',notes:'料金・条件は操作体験用のサンプルです。',url:'',cancellation:'予約前に条件を確認' });
  Object.assign(nodes[7], { kind:'choices', options:[option('station','京都駅周辺のホテル',9800),option('ryokan','嵐山の旅館',15000),option('shijo','四条のホテル',12500)] });
  nodes[1].amount=13320; nodes[2].amount=11800;
  nodes[3].participants=['あおい','ひなた']; nodes[4].participants=['ゆう'];
  const pairs = [['departure','train','プラン A'],['departure','flight','プラン B'],['train','lunch-a'],['flight','lunch-b'],['lunch-a','kiyomizu'],['lunch-b','arashiyama'],['kiyomizu','hotel'],['arashiyama','hotel'],['hotel','night']];
  return {
    itinerary:{ id:'comparison-demo',title:'京都ミニ旅行',theme_id:'planning-draft',memo:'友人3人で京都へ。昼は二手に分かれて、夕方はホテルで集合。宿はまだ相談中。',password:null,created_at:now,updated_at:now },
    steps:nodes.map(node => ({ id:node.id,itinerary_id:'comparison-demo',title:node.title,type:node.type,
      start_at:new Date(node.start_local+'+09:00').getTime(),end_at:new Date(node.end_local+'+09:00').getTime(),notes:'',created_at:now,updated_at:now })),
    planGraph:{ itinerary_id:'comparison-demo',revision:0,updated_at:now,nodes,edges:pairs.map(([from,to,label],i) => ({id:'route-'+i,from,to,label:label??''})) },
  };
}
