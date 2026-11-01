import type { ItineraryResponse, Step } from '@tabitabi/types';

export interface PlannerContext {
  itinerary: ItineraryResponse;
  steps: Step[];
  origin: string;
  includeSchedule: boolean;
  request?: string;
}

export function buildPlannerPrompt({
  itinerary, steps, origin, includeSchedule, request = '',
}: PlannerContext): string {
  const ask = request.trim().slice(0, 600);
  const path = '/itineraries/' + encodeURIComponent(itinerary.id);
  const url = new URL(path, origin).toString();
  const lines = [
    'あなたは旅の計画を一緒に考えるアシスタントです。',
    '新しい旅を作るのではなく、以下の「たびたび」の既存しおりを改善・編集することが目的です。',
    '移動時間、予算、旅の希望を踏まえ、変更案を提案してください。既存の予定を勝手に削除・上書きせず、変更前に確認してください。',
    '日付や行き先など不明な条件は推測せず、質問してください。',
    '',
    '【編集対象のしおり】',
    'タイトル: ' + itinerary.title.slice(0, 120),
    'しおりのURL: ' + url,
    'しおりID: ' + itinerary.id,
    '',
    'tabitabiのMCPが接続済みなら、get_itineraryで最新の内容と編集権限を確かめてから、同じしおりIDに対してadd_stepやupdate_stepで変更を反映してください。',
    'MCPが未接続または編集権限がなければ、しおりに転記しやすい形式で変更案を示してください。URLを知っているだけでは編集できません。',
  ];

  const visible = includeSchedule ? steps.filter(step => !step.is_hidden).slice(0, 25) : [];
  if (visible.length) {
    lines.push('', '【現在の予定（変更前に確認してください）】');
    for (const step of visible) {
      const when = step.start_at == null
        ? '日時未定'
        : new Date(step.start_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        });
      lines.push('- ' + when + ' / ' + step.title.slice(0, 100) +
        (step.location ? ' / ' + step.location.slice(0, 80) : ''));
    }
    if (steps.filter(step => !step.is_hidden).length > visible.length) {
      lines.push('※残りの予定は省略しています。MCPで最新版を参照してください。');
    }
  } else if (steps.length === 0) {
    lines.push('', '【現在の予定】', 'まだ予定がありません。このしおりに追加する予定を一緒に決めましょう。');
  } else {
    lines.push('', '【現在の予定】', '予定はプロンプトに含めていません。必要ならMCPで確認してください。');
  }
  lines.push('', ask || 'このしおりをより良くするには、どこから改善すればよいか提案してください。');
  return lines.join('\n').slice(0, 4800);
}

/** Best effort: ChatGPT can ignore draft parameters on some mobile app versions. */
export function buildChatGptUrl(prompt: string): string {
  return 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
}
