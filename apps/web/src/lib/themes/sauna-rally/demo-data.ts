import { type DemoDataSet, now, getDate } from '../types';

export function getDemoData(): DemoDataSet {
  return {
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
}
