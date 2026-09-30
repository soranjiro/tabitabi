import { describe, expect, it } from "vitest";
import {
  DEFAULT_ITINERARY_COVER_IMAGE,
  formatItineraryDateRange,
  getItineraryDateRange,
  getItineraryOgVersion,
  resolveItineraryCoverImage,
  splitOgTitle,
} from "./itinerary-cover";

describe("itinerary cover helpers", () => {
  it("uses the configured preset background", () => {
    expect(
      resolveItineraryCoverImage({
        theme_id: "week",
        background_image: "/itinerary-backgrounds/hot-spring.avif",
      }),
    ).toBe("/itinerary-backgrounds/hot-spring.avif");
  });

  it("falls back to the existing theme cover mapping", () => {
    expect(
      resolveItineraryCoverImage({
        theme_id: "map-only",
        background_image: null,
      }),
    ).toBe("/itinerary-backgrounds/coastal-drive.avif");

    expect(
      resolveItineraryCoverImage({
        theme_id: "planning-draft",
        background_image: null,
      }),
    ).toBe(DEFAULT_ITINERARY_COVER_IMAGE);
  });

  it("ignores unknown background paths", () => {
    expect(
      resolveItineraryCoverImage({
        theme_id: "week",
        background_image: "https://example.com/untrusted.jpg",
      }),
    ).toBe("/hero/background-autumn.avif");
  });

  it("derives and formats the trip dates in Tokyo time", () => {
    const steps = [
      {
        start_at: new Date("2026-10-10T09:00:00+09:00").getTime(),
        end_at: new Date("2026-10-10T10:00:00+09:00").getTime(),
      },
      {
        start_at: null,
        end_at: null,
      },
      {
        start_at: new Date("2026-10-12T18:00:00+09:00").getTime(),
        end_at: new Date("2026-10-12T19:00:00+09:00").getTime(),
      },
    ];

    expect(getItineraryDateRange(steps)).toEqual({
      startAt: new Date("2026-10-10T09:00:00+09:00").getTime(),
      endAt: new Date("2026-10-12T19:00:00+09:00").getTime(),
    });
    expect(formatItineraryDateRange(steps)).toBe(
      "2026.10.10 — 2026.10.12",
    );
  });

  it("omits the date when every step is undecided", () => {
    expect(
      formatItineraryDateRange([
        { start_at: null, end_at: null },
        { start_at: null, end_at: null },
      ]),
    ).toBeNull();
  });

  it("changes the OGP version when itinerary or step content is updated", () => {
    const base = getItineraryOgVersion(
      { updated_at: "2026-10-01T00:00:00.000Z" },
      [{ updated_at: "2026-10-01T00:00:01.000Z" }],
    );
    const changed = getItineraryOgVersion(
      { updated_at: "2026-10-01T00:00:00.000Z" },
      [{ updated_at: "2026-10-01T00:00:02.000Z" }],
    );

    expect(changed).not.toBe(base);
  });

  it("keeps long titles to two lines and truncates the rest", () => {
    const lines = splitOgTitle(
      "とても長い旅行タイトルなので共有画像の中で安全に二行へ収めたい旅行",
      10,
      2,
    );

    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });
});
