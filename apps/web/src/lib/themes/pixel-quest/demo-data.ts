import { type DemoDataSet, now, getTimestamp, getEndTimestamp, getDate } from '../types';

export function getDemoData(): DemoDataSet {
  return {
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
        start_at: getTimestamp(0, '06:00'),
        end_at: getEndTimestamp(getTimestamp(0, '06:00'), 120),
        location: '東京駅',
        notes: '{"text":"装備を整えてから出発！"}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-step-2',
        itinerary_id: 'demo',
        title: '森の迷宮',
        start_at: getTimestamp(0, '10:00'),
        end_at: getEndTimestamp(getTimestamp(0, '10:00'), 240),
        location: '五合目付近',
        notes: JSON.stringify({
          text: 'モンスターに注意',
          planB: [
            {
              title: '秘密の山小屋',
              start_at: getTimestamp(0, '13:00'),
              end_at: getEndTimestamp(getTimestamp(0, '13:00'), 60),
              location: '旧登山道',
              notes: '雨ならここで休憩',
            },
            {
              title: '温泉で待機',
              start_at: getTimestamp(1, '09:30'),
              end_at: getEndTimestamp(getTimestamp(1, '09:30'), 120),
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
        start_at: getTimestamp(0, '18:00'),
        end_at: getEndTimestamp(getTimestamp(0, '18:00'), 720),
        location: '六合目',
        notes: '{"text":"明日のために体力回復"}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-step-4',
        itinerary_id: 'demo',
        title: '日本の頂点へ',
        start_at: getTimestamp(1, '12:00'),
        end_at: getEndTimestamp(getTimestamp(1, '12:00'), 60),
        location: '富士山頂',
        notes: '{"text":"頂上で達成感を味わう"}',
        created_at: now,
        updated_at: now,
      },
    ],
  };
}
