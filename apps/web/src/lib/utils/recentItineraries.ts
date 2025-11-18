// LocalStorage utility for recent itineraries
export interface RecentItinerary {
  id: string;
  title: string;
  visitedAt: string;
}

const STORAGE_KEY = 'tabitabi_recent_itineraries';
const MAX_RECENT = 5;

export function saveRecentItinerary(id: string, title: string): void {
  if (typeof window === 'undefined') return;

  try {
    const recent = getRecentItineraries();

    // Remove existing entry with same id
    const filtered = recent.filter(item => item.id !== id);

    // Add new entry at the beginning
    const updated: RecentItinerary[] = [
      { id, title, visitedAt: new Date().toISOString() },
      ...filtered
    ].slice(0, MAX_RECENT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent itinerary:', error);
  }
}

export function getRecentItineraries(): RecentItinerary[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items = JSON.parse(stored) as RecentItinerary[];
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Failed to load recent itineraries:', error);
    return [];
  }
}

export function clearRecentItineraries(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear recent itineraries:', error);
  }
}
