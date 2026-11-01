import type { ItineraryResponse, Step } from '@tabitabi/types';

export interface PlannerContext {
  itinerary?: ItineraryResponse | null;
  steps?: Step[];
  origin: string;
  includeSchedule?: boolean;
  request?: string;
  readOnly?: boolean;
}

export function buildPlannerPrompt({
  itinerary, steps = [], origin, includeSchedule = true,
  request = '', readOnly = false,
}: PlannerContext): string {
  const ask = request.trim().slice(0, 600);
  const lines = [
    'あなたは旅行プランナーです。希望や移動時間・予算・営業状況を確認しながら、無理のない旅程を一緒に考えてください。',
    '日付・目的地・人数など未確定の条件は、推測で埋めず質問してください。',
  ];

  if (itinerary) {
    const path = (readOnly || itinerary.is_shared_snapshot ? '/s/' : '/itineraries/') + encodeURIComponent(itinerary.id);
    const url = new URL(path, origin).toString();
    lines.push('', '【たびたびのしおり】', 'タイトル: ' + itinerary.title.slice(0, 120), 'URL: ' + url);
    lines.push('提案した予定は、このしおりで完成させたいです。tabitabiのMCPが接続されている場合のみ、編集権限を確認してツール経由で変更してください。接続されていなければ、追記しやすい形で提案してください。');
    if (readOnly || itinerary.is_shared_snapshot) lines.push('このURLは閲覧専用です。元のしおりを直接変更しないでください。');
    const visible = includeSchedule ? steps.filter(step => !step.is_hidden).slice(0, 25) : [];
    if (visible.length) {
      lines.push('', '【既存の予定（変更する場合は確認してください）】');
      for (const step of visible) {
        const when = step.start_at == null
          ? '日時未定'
          : new Date(step.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        lines.push('- ' + when + ' / ' + step.title.slice(0, 100) + (step.location ? ' / ' + step.location.slice(0, 80) : ''));
      }
      if (steps.filter(step => !step.is_hidden).length > visible.length) lines.push('※その他の予定は省略');
    } else if (steps.length === 0) {
      lines.push('現在、登録されている予定はありません。');
    } else {
      lines.push('既存の予定は共有していません。内容を決めつけず、必要な点を質問してください。');
    }
  } else {
    lines.push('', 'しおりはまだ作成していません。まず旅の行き先、日程、同行者、興味、予算を整理したいです。');
    lines.push('計画が固まったら https://tabitabi.pages.dev/ でしおりを作成して、予定を保存できる形にしてください。');
  }
  lines.push('', ask || 'この旅をより良くするために、最初に確認すべきことを質問してください。');
  return lines.join('\n').slice(0, 4800);
}

/** Prefill is best-effort: ChatGPT's mobile apps may ignore the query parameter. */
export function buildChatGptUrl(prompt: string): string {
  return 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
}
