import { describe, expect, it } from "vitest";
import {
  DEFAULT_ITINERARY_COVER_IMAGE,
  formatItineraryDateRange,
  getItineraryDateRange,
  getItineraryOgVersion,
  resolveItineraryCoverImage,
} from "./cover";

describe("itinerary cover helpers", () => {
  it("uses the selected background before theme and default fallbacks", () => {
    expect(resolveItineraryCoverImage("/itinerary-backgrounds/camp.avif", "daycard"))
      .toBe("/itinerary-backgrounds/camp.avif");
    expect(resolveItineraryCoverImage(null, "daycard"))
      .toBe("/hero/background-spring.avif");
    expect(resolveItineraryCoverImage(null, "unknown-theme"))
      .toBe(DEFAULT_ITINERARY_COVER_IMAGE);
  });

  it("derives the trip range from decided steps only", () => {
    const range = getItineraryDateRange([
      { start_at: null, end_at: null },
      {
        start_at: Date.parse("2026-10-11T09:00:00+09:00"),
        end_at: Date.parse("2026-10-11T11:00:00+09:00"),
      },
      {
        start_at: Date.parse("2026-10-10T18:00:00+09:00"),
        end_at: Date.parse("2026-10-12T08:00:00+09:00"),
      },
    ]);

    expect(formatItineraryDateRange(range)).toBe("2026.10.10 — 2026.10.12");
  });

  it("omits dates when every step is undecided and collapses same-day ranges", () => {
    expect(formatItineraryDateRange(getItineraryDateRange([{ start_at: null, end_at: null }]))).toBe("");

    const sameDay = getItineraryDateRange([
      {
        start_at: Date.parse("2026-10-10T09:00:00+09:00"),
        end_at: Date.parse("2026-10-10T18:00:00+09:00"),
      },
    ]);
    expect(formatItineraryDateRange(sameDay)).toBe("2026.10.10");
  });

  it("changes the cache version when visible OG content changes", () => {
    const itinerary = {
      title: "金沢旅行",
      theme_id: "daycard",
      background_image: null,
      updated_at: "2026-09-30T00:00:00.000Z",
    };
    const steps = [
      {
        start_at: 1_800_000_000_000,
        end_at: 1_800_003_600_000,
        updated_at: "2026-09-30T00:00:00.000Z",
      },
    ];

    const base = getItineraryOgVersion(itinerary, steps);
    expect(getItineraryOgVersion({ ...itinerary, title: "富山旅行" }, steps)).not.toBe(base);
    expect(getItineraryOgVersion(itinerary, [{ ...steps[0], start_at: steps[0].start_at + 86_400_000 }])).not.toBe(base);
    expect(getItineraryOgVersion({ ...itinerary, background_image: "/itinerary-backgrounds/camp.avif" }, steps)).not.toBe(base);
  });
});
