import { type DemoDataSet, now, getTimestamp, getEndTimestamp } from '../types';

export function getDemoData(): DemoDataSet {
  return {
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
        start_at: getTimestamp(0, '10:00'),
        end_at: getEndTimestamp(getTimestamp(0, '10:00'), 30),
        location: 'スーパー',
        notes: '{"text":"低脂肪"}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-step-2',
        itinerary_id: 'demo',
        title: '卵',
        start_at: getTimestamp(0, '10:00'),
        end_at: getEndTimestamp(getTimestamp(0, '10:00'), 30),
        location: 'スーパー',
        notes: '{"text":"10個入り"}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-step-3',
        itinerary_id: 'demo',
        title: 'シャンプー',
        start_at: getTimestamp(0, '11:00'),
        end_at: getEndTimestamp(getTimestamp(0, '11:00'), 30),
        location: 'ドラッグストア',
        notes: '{"text":""}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-step-4',
        itinerary_id: 'demo',
        title: '本棚',
        start_at: getTimestamp(0, '14:00'),
        end_at: getEndTimestamp(getTimestamp(0, '14:00'), 120),
        location: 'IKEA',
        notes: '{"text":"組み立て式"}',
        created_at: now,
        updated_at: now,
      },
    ],
  };
}
