/**
 * Demo data for each theme
 * These are sample itineraries that can be used to demonstrate the app
 */

import type {
  Itinerary,
  Step,
  ItinerarySecretRecord,
  ItineraryWalicaSettingsRecord
} from '@tabitabi/types';
import { availableThemes, defaultThemeId, type AvailableTheme } from '$lib/themes';

interface DemoDataSet {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_walica_settings?: ItineraryWalicaSettingsRecord | null;
}

const now = new Date().toISOString();

// Helper to create a date string for today + offset days
function getDate(offsetDays: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

const standardAutumnDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '京都紅葉旅行',
    theme_id: 'standard-autumn',
    memo: '紅葉シーズンは混雑するので早めの行動を',
    password: null,
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
  itinerary_secrets: {
    itinerary_id: 'demo',
    enabled: true,
    offset_minutes: 30,
    created_at: now,
    updated_at: now,
  },
  itinerary_walica_settings: {
    itinerary_id: 'demo',
    walica_id: 'https://walica.jp/group/01KBTSYADVKY8HPQ1CHRHTNG19',
    created_at: now,
    updated_at: now,
  },
};

const shoppingDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '週末の買い物リスト',
    theme_id: 'shopping',
    memo: '予算: 10,000円',
    password: null,
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
    memo: 'クエスト: 世界を救え',
    password: null,
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
    memo: 'サプライズ旅行の計画',
    password: null,
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
      title: '🎁 サプライズディナー',
      date: getDate(0),
      time: '19:30',
      location: 'オーシャンビューレストラン',
      notes: 'Secret: 特別なプロポーズディナー',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
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
  itinerary_secrets: {
    itinerary_id: 'demo',
    enabled: true,
    offset_minutes: 60,
    created_at: now,
    updated_at: now,
  },
  itinerary_walica_settings: {
    itinerary_id: 'demo',
    walica_id: 'https://walica.jp/group/01KBTSYADVKY8HPQ1CHRHTNG19',
    created_at: now,
    updated_at: now,
  },
};

const mapOnlyDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '東京ガイドツアー',
    theme_id: 'map-only',
    memo: '地図で見るスポット巡り',
    password: null,
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '浅草寺',
      date: getDate(0),
      time: '09:00',
      location: '東京都台東区浅草',
      notes: '雷門の写真を撮ろう',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: 'スカイツリー',
      date: getDate(0),
      time: '11:00',
      location: '東京都墨田区押上',
      notes: '展望台からの眺めが最高',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: 'ランチ',
      date: getDate(0),
      time: '12:30',
      location: null,
      notes: 'スカイツリーのレストランで食事',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '秋葉原',
      date: getDate(0),
      time: '15:00',
      location: '東京都千代田区秋葉原',
      notes: '電気街の買い物',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
      itinerary_id: 'demo',
      title: '渋谷スクランブル交差点',
      date: getDate(0),
      time: '17:30',
      location: '東京都渋谷区渋谷',
      notes: '有名な交差点を体験',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-6',
      itinerary_id: 'demo',
      title: 'ディナー',
      date: getDate(0),
      time: '19:00',
      location: null,
      notes: 'おしゃれなレストランで夜食',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-7',
      itinerary_id: 'demo',
      title: '六本木ヒルズ',
      date: getDate(1),
      time: '10:00',
      location: '東京都港区六本木',
      notes: 'モダンな建築を見学',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-8',
      itinerary_id: 'demo',
      title: 'お台場',
      date: getDate(1),
      time: '14:00',
      location: '東京都港区お台場',
      notes: 'レインボーブリッジの眺め',
      created_at: now,
      updated_at: now,
    },
  ],
};

const mapboxJourneyDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '世界の夜景フライト',
    theme_id: 'mapbox-journey',
    memo: 'グローブで航路をたどる旅',
    password: null,
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '羽田を離陸',
      date: getDate(0),
      time: '07:30',
      location: '東京 (HND)',
      notes: '朝焼けのなかで出発',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '台北の街歩き',
      date: getDate(0),
      time: '11:30',
      location: '台北101',
      notes: '鼎泰豊でランチ',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '夜市でライトアップ',
      date: getDate(0),
      time: '19:30',
      location: '士林夜市',
      notes: '小籠包とマンゴーかき氷',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: 'グローブで航路確認',
      date: getDate(1),
      time: '08:00',
      location: '太平洋上空',
      notes: '次の都市までのルートを可視化',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
      itinerary_id: 'demo',
      title: 'サンセットフライト',
      date: getDate(1),
      time: '18:00',
      location: 'シンガポール上空',
      notes: 'マリーナベイの光を一望',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-6',
      itinerary_id: 'demo',
      title: 'リバークルーズ',
      date: getDate(1),
      time: '20:30',
      location: 'クラークキー',
      notes: '夜景を眺めながら散歩',
      created_at: now,
      updated_at: now,
    },
  ],
};

const isAvailableTheme = (themeId: string): themeId is AvailableTheme =>
  (availableThemes as readonly string[]).includes(themeId);

export const demoDataSets: Record<AvailableTheme, DemoDataSet> = {
  'map-only': mapOnlyDemo,
  'mapbox-journey': mapboxJourneyDemo,
  'standard-autumn': standardAutumnDemo,
  'shopping': shoppingDemo,
  'pixel-quest': pixelQuestDemo,
  'ai-generated': aiGeneratedDemo,
};

export function getDemoData(themeId: string): DemoDataSet {
  if (themeId === 'minimal') {
    return demoDataSets[defaultThemeId];
  }

  if (isAvailableTheme(themeId)) {
    return demoDataSets[themeId];
  }

  return demoDataSets[defaultThemeId];
}
