/**
 * Demo data for each theme
 * These are sample itineraries that can be used to demonstrate the app
 */

import type { Itinerary, Step } from '@tabitabi/types';
import type { AvailableTheme } from '$lib/themes';

interface DemoDataSet {
  itinerary: Itinerary;
  steps: Step[];
}

const now = new Date().toISOString();

// Helper to create a date string for today + offset days
function getDate(offsetDays: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

const minimalDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '週末の予定',
    theme_id: 'minimal',
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '朝食',
      date: getDate(0),
      time: '08:00',
      location: '自宅',
      notes: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '買い物',
      date: getDate(0),
      time: '10:00',
      location: '駅前スーパー',
      notes: '牛乳、卵、パン',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: 'カフェで読書',
      date: getDate(0),
      time: '14:00',
      location: 'スターバックス',
      notes: null,
      created_at: now,
      updated_at: now,
    },
  ],
};

const standardAutumnDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '京都紅葉旅行',
    theme_id: 'standard-autumn',
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '清水寺',
      date: getDate(0),
      time: '09:00',
      location: '京都市東山区',
      notes: '紅葉の名所。朝早めがおすすめ。',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '祇園でランチ',
      date: getDate(0),
      time: '12:00',
      location: '祇園',
      notes: '京料理を堪能',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '嵐山散策',
      date: getDate(0),
      time: '15:00',
      location: '嵐山',
      notes: '竹林の小径を歩く',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '金閣寺',
      date: getDate(1),
      time: '10:00',
      location: '北区',
      notes: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
      itinerary_id: 'demo',
      title: '錦市場',
      date: getDate(1),
      time: '13:00',
      location: '中京区',
      notes: '食べ歩き！',
      created_at: now,
      updated_at: now,
    },
  ],
};

const shoppingDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '週末の買い物リスト',
    theme_id: 'shopping',
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '牛乳',
      date: getDate(0),
      time: '10:00',
      location: 'スーパー',
      notes: '低脂肪',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '卵',
      date: getDate(0),
      time: '10:00',
      location: 'スーパー',
      notes: '10個入り',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: 'シャンプー',
      date: getDate(0),
      time: '11:00',
      location: 'ドラッグストア',
      notes: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '本棚',
      date: getDate(0),
      time: '14:00',
      location: 'IKEA',
      notes: '組み立て式',
      created_at: now,
      updated_at: now,
    },
  ],
};

const pixelQuestDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '冒険の旅',
    theme_id: 'pixel-quest',
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '王国を出発',
      date: getDate(0),
      time: '06:00',
      location: '王都',
      notes: '装備を整えてから出発！',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '森の迷宮',
      date: getDate(0),
      time: '10:00',
      location: '魔法の森',
      notes: 'モンスターに注意',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '宿屋で休憩',
      date: getDate(0),
      time: '18:00',
      location: '村の宿屋',
      notes: 'HP回復',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: 'ラスボス討伐',
      date: getDate(1),
      time: '12:00',
      location: '魔王城',
      notes: '勇者よ、世界を救え！',
      created_at: now,
      updated_at: now,
    },
  ],
};

const aiGeneratedDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '沖縄リゾート',
    theme_id: 'ai-generated',
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '那覇空港到着',
      date: getDate(0),
      time: '10:00',
      location: '那覇空港',
      notes: 'レンタカーを借りる',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '美ら海水族館',
      date: getDate(0),
      time: '13:00',
      location: '本部町',
      notes: 'ジンベエザメを見る！',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: 'ビーチでサンセット',
      date: getDate(0),
      time: '18:00',
      location: '恩納村',
      notes: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '国際通り散策',
      date: getDate(1),
      time: '11:00',
      location: '那覇市',
      notes: 'お土産を買う',
      created_at: now,
      updated_at: now,
    },
  ],
};

export const demoDataSets: Record<AvailableTheme, DemoDataSet> = {
  'minimal': minimalDemo,
  'standard-autumn': standardAutumnDemo,
  'shopping': shoppingDemo,
  'pixel-quest': pixelQuestDemo,
  'ai-generated': aiGeneratedDemo,
};

export function getDemoData(themeId: AvailableTheme): DemoDataSet {
  return demoDataSets[themeId] || minimalDemo;
}
