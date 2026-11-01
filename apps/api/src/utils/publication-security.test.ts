import { describe, expect, it } from 'vitest';
import { buildAffiliateUrl, detectAffiliateProvider } from './publication';

describe('affiliate domain checks', () => {
  it('recognizes legitimate domains and subdomains', () => {
    expect(detectAffiliateProvider('https://jalan.net/hotel')).toBe('jalan');
    expect(detectAffiliateProvider('https://travel.rakuten.co.jp/')).toBe('rakuten_travel');
    expect(detectAffiliateProvider('https://www.booking.com/hotel')).toBe('booking');
    expect(detectAffiliateProvider('https://www.rakuten.co.jp/')).toBe('rakuten_market');
  });

  it('does not attribute lookalike or path-only matches', () => {
    for (const host of [
      'jalan.net.evil.test',
      'eviljalan.net',
      'booking.com.evil.test',
      'travel.rakuten.co.jp.evil.test',
    ]) {
      expect(detectAffiliateProvider('https://' + host)).toBe('default');
    }
    expect(detectAffiliateProvider('https://evil.test/booking.com')).toBe('default');
  });

  it('rejects executable and malformed schemes at publication time', () => {
    expect(buildAffiliateUrl('javascript:alert(1)')).toEqual({});
    expect(buildAffiliateUrl('data:text/html,test')).toEqual({});
    expect(buildAffiliateUrl('https://example.com/').url).toContain('utm_source=tabitabi');
  });
});
