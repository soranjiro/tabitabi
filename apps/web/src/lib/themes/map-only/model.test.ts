import { describe, expect, it } from "vitest";
import type { Step } from "@tabitabi/types";
import {
  buildExternalMapUrl,
  extractCoordinatesFromStep,
  parseCoordinateText,
  readMapCandidates,
  writeMapCandidates,
  type MapCandidate,
} from "./model";

describe("map candidate model", () => {
  const candidate: MapCandidate = {
    id: "candidate-1",
    title: "浅草寺",
    lat: 35.714765,
    lng: 139.796655,
    category: "sightseeing",
    notes: "朝に行きたい",
    createdAt: "2026-09-04T00:00:00.000Z",
  };

  it("round-trips candidates without dropping existing memo fields", () => {
    const nextMemo = writeMapCandidates(JSON.stringify({ text: "旅メモ", showRoute: false }), [candidate]);
    const parsed = JSON.parse(nextMemo);

    expect(parsed.text).toBe("旅メモ");
    expect(parsed.showRoute).toBe(false);
    expect(readMapCandidates(nextMemo)).toEqual([candidate]);
  });

  it("ignores malformed candidate values", () => {
    const memo = JSON.stringify({
      text: "",
      mapCandidates: [candidate, { id: "bad", title: "", lat: 400, lng: 0 }],
    });

    expect(readMapCandidates(memo)).toEqual([candidate]);
  });

  it("parses coordinates from stored location text or an external map link", () => {
    expect(parseCoordinateText("35.1, 139.2")).toEqual({ lat: 35.1, lng: 139.2 });

    const step = {
      id: "step-1",
      itinerary_id: "trip-1",
      title: "浅草寺",
      start_at: 0,
      end_at: 1,
      location: "浅草寺",
      notes: "",
      link: buildExternalMapUrl(35.714765, 139.796655),
      created_at: "",
      updated_at: "",
    } satisfies Step;

    expect(extractCoordinatesFromStep(step)).toEqual({
      lat: 35.714765,
      lng: 139.796655,
    });
  });
});
