import { describe, expect, it } from 'vitest';
import type { Step } from '@tabitabi/types';
import { getBookingCard } from './booking-card';

function provider(url: string): string | undefined {
  return getBookingCard({ link: url } as Step)?.provider;
}

describe('booking card provider checks', () => {
  it('recognizes exact hosts and valid subdomains', () => {
    expect(provider('https://jalan.net/abc')).toBe('jalan');
    expect(provider('https://www.jalan.net/abc')).toBe('jalan');
    expect(provider('https://travel.rakuten.co.jp/hotel')).toBe('rakuten_travel');
    expect(provider('https://sub.booking.com/abc')).toBe('booking');
    expect(provider('https://shopping.yahoo.co.jp/item')).toBe('yahoo_shopping');
    expect(provider('https://rakuten.co.jp/item')).toBe('rakuten_market');
  });

  it('rejects lookalike domains and URLs with domain names in paths', () => {
    expect(provider('https://jalan.net.attacker.example')).toBe('default');
    expect(provider('https://eviljalan.net')).toBe('default');
    expect(provider('https://example.com/jalan.net')).toBe('default');
    expect(provider('https://travel.rakuten.co.jp.evil.test')).toBe('default');
    expect(provider('https://booking.com.evil.test')).toBe('default');
    expect(provider('https://notshopping.yahoo.co.jp')).toBe('default');
  });

  it('disallows non-http(s) links', () => {
    expect(getBookingCard({ link: 'javascript:alert(1)' } as Step)).toBeNull();
    expect(getBookingCard({ link: 'data:text/html,test' } as Step)).toBeNull();
  });
});
