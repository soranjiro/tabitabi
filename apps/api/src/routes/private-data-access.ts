import type { Context } from 'hono';
import type { Env, Variables } from '../utils';
import { ItineraryService } from '../services/itinerary.service';

export async function guardPrivateItineraryRead(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  itineraryId: string,
): Promise<Response | null> {
  const itinerary = await new ItineraryService(c.env.DB, c.env).get(itineraryId);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  if (!itinerary.source_itinerary_id && c.get('shioriId') !== itineraryId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Private itinerary data requires its token' } }, 403);
  }
  return null;
}
