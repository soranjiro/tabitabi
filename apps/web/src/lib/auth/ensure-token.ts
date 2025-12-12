import type { ItineraryResponse } from "@tabitabi/types";
import { auth } from "./index";
import { authApi } from "../api/auth";
import { getIsDemoMode } from "../demo";

type ItineraryMeta = Pick<ItineraryResponse, "id" | "title" | "is_password_protected">;

export async function ensureTokenForItinerary(itinerary: ItineraryMeta): Promise<string | null> {
  if (getIsDemoMode()) {
    return auth.getToken(itinerary.id);
  }

  const existing = auth.getToken(itinerary.id);
  if (existing) {
    return existing;
  }

  if (itinerary.is_password_protected) {
    return null;
  }

  try {
    const token = await authApi.authenticateWithPassword(itinerary.id, "");
    auth.setToken(itinerary.id, itinerary.title, token);
    return token;
  } catch (error) {
    console.error("Failed to acquire token for itinerary", error);
    return null;
  }
}
