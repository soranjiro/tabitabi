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
import { availableThemes, defaultThemeId, type AvailableTheme } from '$lib/themes/catalog';

interface DemoDataSet {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_walica_settings?: ItineraryWalicaSettingsRecord | null;
}

const now = new Date().toISOString();

// Helper to create a date string for today + offset days, considering timezone
function getDate(offsetDays: number = 0, timeZone: string = 'Asia/Tokyo'): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  // Format the date considering the timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-');
}

const standardAutumnDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '京都紅葉旅行',
    theme_id: 'standard-autumn',
    memo: '{"text":"紅葉シーズンは混雑するので早めの行動を"}',
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
      notes: '{"text":"紅葉の名所。朝早めがおすすめ。"}',
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
      notes: '{"text":"京料理を堪能"}',
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
      notes: '{"text":"竹林の小径を歩く"}',
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
      notes: '{"text":""}',
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
      notes: '{"text":"食べ歩き！"}',
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
    memo: '{"text":"予算: 10,000円"}',
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
      notes: '{"text":"低脂肪"}',
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
      notes: '{"text":"10個入り"}',
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
      notes: '{"text":""}',
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
      notes: '{"text":"組み立て式"}',
      created_at: now,
      updated_at: now,
    },
  ],
};

const pixelQuestDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '日本征服',
    theme_id: 'pixel-quest',
    memo: '{"text":"トップに立て"}',
    password: null,
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '出発の儀',
      date: getDate(0),
      time: '06:00',
      location: '東京駅',
      notes: '{"text":"装備を整えてから出発！"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: '森の迷宮',
      date: getDate(0),
      time: '10:00',
      location: '五合目付近',
      notes: JSON.stringify({
        text: 'モンスターに注意',
        planB: [
          {
            title: '秘密の山小屋',
            date: getDate(0),
            time: '13:00',
            location: '旧登山道',
            notes: '雨ならここで休憩',
          },
          {
            title: '温泉で待機',
            date: getDate(1),
            time: '09:30',
            location: '河口湖の温泉',
            notes: '悪天候時は下山して温泉へ',
          },
        ],
      }),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '宿屋で休憩',
      date: getDate(0),
      time: '18:00',
      location: '六合目',
      notes: '{"text":"明日のために体力回復"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '日本の頂点へ',
      date: getDate(1),
      time: '12:00',
      location: '富士山頂',
      notes: '{"text":"頂上で達成感を味わう"}',
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
    memo: '{"text":"サプライズ旅行の計画"}',
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
      notes: '{"text":"レンタカーを借りる"}',
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
      notes: '{"text":"ジンベエザメを見る！"}',
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
      notes: '{"text":""}',
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
      notes: '{"text":"Secret: 特別なプロポーズディナー"}',
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
      notes: '{"text":"お土産を買う"}',
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
    memo: '{"text":"地図で見るスポット巡り"}',
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
      notes: '{"text":"雷門の写真を撮ろう"}',
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
      notes: '{"text":"展望台からの眺めが最高"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '秋葉原',
      date: getDate(0),
      time: '15:00',
      location: '東京都千代田区秋葉原',
      notes: '{"text":"電気街の買い物"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '渋谷スクランブル交差点',
      date: getDate(0),
      time: '17:30',
      location: '東京都渋谷区渋谷',
      notes: '{"text":"有名な交差点を体験"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
      itinerary_id: 'demo',
      title: '六本木ヒルズ',
      date: getDate(1),
      time: '10:00',
      location: '東京都港区六本木',
      notes: '{"text":"モダンな建築を見学"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-6',
      itinerary_id: 'demo',
      title: 'お台場',
      date: getDate(1),
      time: '14:00',
      location: '東京都港区お台場',
      notes: '{"text":"レインボーブリッジの眺め"}',
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
    memo: '{"text":"グローブで航路をたどる旅"}',
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
      notes: '{"text":"朝焼けのなかで出発"}',
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
      notes: '{"text":"鼎泰豊でランチ"}',
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
      notes: '{"text":"小籠包とマンゴーかき氷"}',
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
      notes: '{"text":"次の都市までのルートを可視化"}',
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
      notes: '{"text":"マリーナベイの光を一望"}',
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
      notes: '{"text":"夜景を眺めながら散歩"}',
      created_at: now,
      updated_at: now,
    },
  ],
};

const saunaRallyDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '東京サウナ巡り',
    theme_id: 'sauna-rally',
    memo: '{"text":"今年中に10施設制覇！"}',
    password: null,
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: 'サウナ&ホテル かるまる池袋',
      date: getDate(0),
      time: '14:00',
      location: '東京都豊島区',
      notes: JSON.stringify({
        visited: true,
        visit_date: getDate(0),
        sauna_url: 'https://example.com/karumaruikebukuro',
      }),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: 'スカイスパYOKOHAMA',
      date: getDate(1),
      time: '16:00',
      location: '神奈川県横浜市',
      notes: JSON.stringify({
        visited: false,
        sauna_url: 'https://example.com/skyspa',
      }),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '改良湯',
      date: getDate(2),
      time: '18:00',
      location: '東京都台東区',
      notes: JSON.stringify({
        visited: false,
      }),
      created_at: now,
      updated_at: now,
    },
  ],
};

const simpleCalendarDemo: DemoDataSet = {
  itinerary: {
    id: 'demo',
    title: '東京3日間',
    theme_id: 'simple-calendar',
    memo: '{"text":"シンプルな旅程プラン。必要な情報だけを管理"}',
    password: null,
    created_at: now,
    updated_at: now,
  },
  steps: [
    {
      id: 'demo-step-1',
      itinerary_id: 'demo',
      title: '羽田空港到着',
      date: getDate(0),
      time: '10:30',
      location: '羽田空港',
      notes: '{"text":"ANA便で到着予定"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-2',
      itinerary_id: 'demo',
      title: 'ランチ',
      date: getDate(0),
      time: '12:00',
      location: 'シナガワグース',
      notes: '{"text":""}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-3',
      itinerary_id: 'demo',
      title: '浅草寺観光',
      date: getDate(0),
      time: '15:00',
      location: '浅草',
      notes: '{"text":"人力車体験を予約"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-4',
      itinerary_id: 'demo',
      title: '晩御飯',
      date: getDate(0),
      time: '18:00',
      location: 'ホテル周辺',
      notes: '{"text":""}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-5',
      itinerary_id: 'demo',
      title: '渋谷スクランブル交差点',
      date: getDate(1),
      time: '10:00',
      location: '渋谷',
      notes: '{"text":"朝がおすすめ"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-6',
      itinerary_id: 'demo',
      title: '国立西洋美術館',
      date: getDate(1),
      time: '14:00',
      location: '上野',
      notes: '{"text":""}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-7',
      itinerary_id: 'demo',
      title: '根津神社',
      date: getDate(2),
      time: '09:00',
      location: '根津',
      notes: '{"text":"朝関わらず参拝"}',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-step-8',
      itinerary_id: 'demo',
      title: '羽田空港出発',
      date: getDate(2),
      time: '18:00',
      location: '羽田空港',
      notes: '{"text":""}',
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
  'sauna-rally': saunaRallyDemo,
  'simple-calendar': simpleCalendarDemo,
} satisfies Record<AvailableTheme, DemoDataSet>;

export function getDemoData(themeId: string): DemoDataSet {
  if (isAvailableTheme(themeId)) {
    return demoDataSets[themeId];
  }

  return demoDataSets[defaultThemeId];
}
