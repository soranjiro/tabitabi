import { type DemoDataSet, now, getDate } from '../types';

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
}
