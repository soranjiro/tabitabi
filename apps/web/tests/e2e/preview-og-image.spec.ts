import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const apiBaseUrl = process.env.PREVIEW_API_URL;

test("deployed preview generates a cached itinerary OGP cover", async ({ request }) => {
  test.skip(!apiBaseUrl, "PREVIEW_API_URL is required for deployed-preview smoke testing");
  test.setTimeout(60_000);

  const title = "OGP Preview 確認旅行";
  const password = `preview-${Date.now()}`;

  const createResponse = await request.post(`${apiBaseUrl}/itineraries`, {
    data: {
      title,
      password,
      theme_id: "planning-draft",
      palette_id: "sakura",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const createBody = await createResponse.json();
  const itineraryId = createBody.data.id as string;
  const editToken = createBody.data.token as string;

  try {
    const startAt = new Date("2026-10-10T09:00:00+09:00").getTime();
    const endAt = new Date("2026-10-12T18:00:00+09:00").getTime();

    const firstStep = await request.post(`${apiBaseUrl}/steps`, {
      headers: { Authorization: `Bearer ${editToken}` },
      data: {
        itinerary_id: itineraryId,
        title: "出発",
        start_at: startAt,
        end_at: startAt + 60 * 60 * 1000,
      },
    });
    expect(firstStep.ok()).toBeTruthy();

    const lastStep = await request.post(`${apiBaseUrl}/steps`, {
      headers: { Authorization: `Bearer ${editToken}` },
      data: {
        itinerary_id: itineraryId,
        title: "帰宅",
        start_at: endAt - 60 * 60 * 1000,
        end_at: endAt,
      },
    });
    expect(lastStep.ok()).toBeTruthy();

    const pageResponse = await request.get(`/itineraries/${itineraryId}`);
    expect(pageResponse.ok()).toBeTruthy();
    const html = await pageResponse.text();
    expect(html).toContain(`/og/itineraries/${itineraryId}?v=`);
    expect(html).toContain('property="og:image:type" content="image/jpeg"');

    const ogResponse = await request.get(
      `/og/itineraries/${itineraryId}?v=previewsmoke`,
    );
    expect(ogResponse.ok()).toBeTruthy();
    expect(ogResponse.headers()["content-type"]).toContain("image/jpeg");
    expect(ogResponse.headers()["cache-control"]).toContain("immutable");

    const bytes = await ogResponse.body();
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    expect(Array.from(bytes.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);

    await mkdir("test-results", { recursive: true });
    await writeFile("test-results/itinerary-og-preview.jpg", bytes);

    const cachedResponse = await request.get(
      `/og/itineraries/${itineraryId}?v=previewsmoke`,
    );
    expect(cachedResponse.ok()).toBeTruthy();
    expect(cachedResponse.headers()["cache-control"]).toContain("immutable");
  } finally {
    await request.delete(`${apiBaseUrl}/itineraries/${itineraryId}`, {
      headers: { Authorization: `Bearer ${editToken}` },
    });
  }
});
