import { describe, expect, it } from 'vitest';
import type { ItineraryResponse, Step } from '@tabitabi/types';
import { buildPlannerPrompt, buildChatGptUrl } from './planner';

const itinerary = {
  id: '8bb1cd11-401e-4e7b-941a-37153a949e17',
  title: '京都旅行',
  is_password_protected: true,
  is_shared_snapshot: false,
  secret_settings: { enabled: true, offset_minutes: 60 },
} as ItineraryResponse;
const step = {
  title: '清水寺',
  start_at: 1793500000000,
  location: '京都',
  notes: 'PRIVATE_DETAILS_DO_NOT_SHARE',
  is_hidden: false,
} as Step;
const hidden = { ...step, title: 'シークレットな行き先', is_hidden: true } as Step;

describe('ChatGPT handoff', () => {
  it('passes the itinerary URL but never the edit capability or notes', () => {
    const prompt = buildPlannerPrompt({
      itinerary, steps: [step, hidden], origin: 'https://tabitabi.pages.dev',
      includeSchedule: true,
    });
    expect(prompt).toContain('/itineraries/' + itinerary.id);
    expect(prompt).toContain('清水寺');
    expect(prompt).not.toContain('シークレットな行き先');
    expect(prompt).not.toContain('PRIVATE_DETAILS_DO_NOT_SHARE');
    expect(prompt).not.toContain('token=');
  });

  it('does not include existing plans when disabled', () => {
    const prompt = buildPlannerPrompt({
      itinerary, steps: [step], origin: 'https://tabitabi.pages.dev',
      includeSchedule: false,
    });
    expect(prompt).not.toContain('清水寺');
  });

  it('asks for missing trip conditions when no itinerary exists', () => {
    const prompt = buildPlannerPrompt({ origin: 'https://tabitabi.pages.dev' });
    expect(prompt).toContain('しおりはまだ作成していません');
    expect(prompt).toContain('日付・目的地・人数');
  });

  it('encodes a best-effort unsent ChatGPT draft URL', () => {
    const prompt = '京都でおいしいお店を探す\n旅程も考える';
    const url = new URL(buildChatGptUrl(prompt));
    expect(url.origin).toBe('https://chatgpt.com');
    expect(url.searchParams.get('q')).toBe(prompt);
  });
});
