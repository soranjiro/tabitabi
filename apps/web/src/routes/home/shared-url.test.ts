import { describe, expect, it } from "vitest";
import { resolveSharedItineraryPath } from "./shared-url";

const origin = "https://tabitabi.pages.dev";

describe("resolveSharedItineraryPath", () => {
  it("accepts a normal itinerary URL", () => {
    expect(
      resolveSharedItineraryPath(
        "https://tabitabi.pages.dev/itineraries/abc-123",
        origin,
      ),
    ).toBe("/itineraries/abc-123");
  });

  it("accepts a public shared URL", () => {
    expect(
      resolveSharedItineraryPath(
        "https://tabitabi.pages.dev/s/official-map-public",
        origin,
      ),
    ).toBe("/s/official-map-public");
  });

  it("preserves query parameters and hash", () => {
    expect(
      resolveSharedItineraryPath(
        "/itineraries/abc_123?token=secret#day-2",
        origin,
      ),
    ).toBe("/itineraries/abc_123?token=secret#day-2");
  });

  it("rejects external origins", () => {
    expect(
      resolveSharedItineraryPath(
        "https://example.com/itineraries/abc-123",
        origin,
      ),
    ).toBeNull();
  });

  it("rejects unrelated paths", () => {
    expect(resolveSharedItineraryPath("/explore", origin)).toBeNull();
    expect(resolveSharedItineraryPath("/abc-123", origin)).toBeNull();
  });
});
