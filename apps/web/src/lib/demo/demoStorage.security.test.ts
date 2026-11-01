import { beforeEach, describe, expect, it } from 'vitest';
import type { Itinerary, ItinerarySecretRecord } from '@tabitabi/types';
import { demoStorage } from './demoStorage';

const itinerary = {
  id: 'demo',
  title: 'Sample',
  secret_settings: { enabled: true, offset_minutes: 60 },
} as Itinerary;
const secrets = {
  itinerary_id: 'demo',
  enabled: true,
  offset_minutes: 60,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as ItinerarySecretRecord;

describe('demo storage privacy', () => {
  beforeEach(() => {
    demoStorage.clear();
  });

  it('retains demo secret-mode settings in memory but never serializes them', () => {
    demoStorage.initializeDemo({ itinerary, steps: [], itinerary_secrets: secrets });
    expect(demoStorage.getItinerarySecrets()).toEqual(secrets);
    expect(demoStorage.getItinerary()?.secret_settings?.enabled).toBe(true);
    const stored = sessionStorage.getItem('tabitabi_demo') ?? '';
    expect(stored).not.toContain('itinerary_secrets');
    expect(stored).not.toContain('secret_settings');
    expect(localStorage.getItem('tabitabi_demo')).toBeNull();
  });

  it('migrates legacy demo storage and strips secret-mode data', () => {
    localStorage.setItem('tabitabi_demo', JSON.stringify({
      itinerary, steps: [], itinerary_secrets: secrets,
    }));
    expect(demoStorage.getItinerarySecrets()).toEqual(secrets);
    expect(localStorage.getItem('tabitabi_demo')).toBeNull();
    expect(sessionStorage.getItem('tabitabi_demo')).not.toContain('itinerary_secrets');
  });
});
