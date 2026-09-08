import type { Place } from './places';

export interface PlaceResult extends Place { id: string; name: string; address: string }
export function parsePlaceResults(data: unknown): PlaceResult[] {
  const features = (data as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) throw new Error('検索結果を読み取れませんでした。');
  return features.flatMap((feature: any) => {
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    const p = feature.properties ?? {};
    if (typeof p.name !== 'string' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85.051129 || Math.abs(lng) > 180) return [];
    return [{ id:`${p.osm_type ?? ''}${p.osm_id ?? `${lat},${lng}`}`, lat, lng, name:p.name,
      address:[...new Set([p.country, p.state, p.city, p.district, p.street, p.housenumber].filter(v => typeof v === 'string' && v))].join(' · '),
    }];
  });
}

const cache = new Map<string, { at: number; results: PlaceResult[] }>();
export async function searchPlaces(query: string, endpoint: string, signal: AbortSignal): Promise<PlaceResult[]> {
  const url = new URL(endpoint);
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', '6');
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 300_000) return cached.results;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(response.status === 429 ? '検索が混み合っています。少し待ってからお試しください。' : '場所を検索できませんでした。通信を確認して再試行してください。');
  const results = parsePlaceResults(await response.json());
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  cache.set(key, {at:Date.now(), results});
  return results;
}
