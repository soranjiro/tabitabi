import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDemoData as getSpring } from "../src/lib/themes/standard-seasons/spring/demo-data";
import { getDemoData as getSummer } from "../src/lib/themes/standard-seasons/summer/demo-data";
import { getDemoData as getAutumn } from "../src/lib/themes/standard-seasons/autumn/demo-data";
import { getDemoData as getWinter } from "../src/lib/themes/standard-seasons/winter/demo-data";
import { getTimestamp } from "../src/lib/themes/types";

const marker = "-- Official seasonal examples shown in the public feed.";
const fixedTimestamp = "2026-08-30T00:00:00.000Z";
const timestampOffset = new Date("2026-08-30T00:00:00+09:00").getTime() - getTimestamp(0, "00:00");
const sqlPath = resolve(process.cwd(), "../api/scripts/local-seed.sql");

const configs = [
  { id: "spring", data: getSpring(), prefectures: ["kyoto"], areas: ["清水寺", "祇園", "嵐山"], tags: ["寺社・歴史", "グルメ"], copies: 28 },
  { id: "summer", data: getSummer(), prefectures: ["okinawa"], areas: ["那覇", "恩納村", "読谷村"], tags: ["絶景", "グルメ"], copies: 34 },
  { id: "autumn", data: getAutumn(), prefectures: ["tochigi"], areas: ["日光", "中禅寺湖", "那須高原"], tags: ["絶景", "温泉", "寺社・歴史"], copies: 24 },
  { id: "winter", data: getWinter(), prefectures: ["nagano", "tokyo"], areas: ["白馬", "松本", "東京"], tags: ["温泉", "絶景", "グルメ"], copies: 19 },
];

const quote = (value: unknown) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const values = (rows: unknown[][]) => rows.map((row) => `  (${row.map(quote).join(", ")})`).join(",\n");

const out: string[] = [
  marker,
  "-- Generated from the four standard-seasons demo-data.ts files.",
  "-- Re-seeding removes the previous official examples before recreating them.",
  "DELETE FROM users WHERE id = 'official-user';",
  "DELETE FROM itineraries WHERE id LIKE 'official-%-source';",
  "DELETE FROM itineraries WHERE id LIKE 'official-%-public';",
  "",
  "INSERT INTO users (",
  "  id, username, email, password_hash, prefecture,",
  "  email_verified_at, created_at, updated_at",
  ") VALUES (",
  `  'official-user', 'tabitabi_official', 'official@tabitabi.jp', '!firebase-managed!', '東京都',`,
  `  '${fixedTimestamp}', '${fixedTimestamp}', '${fixedTimestamp}'`,
  ");",
  "",
];

for (const config of configs) {
  const { itinerary, steps } = config.data;
  const sourceId = `official-${config.id}-source`;
  const publicId = `official-${config.id}-public`;

  out.push(
    `-- ${config.id}: ${itinerary.title}`,
    "INSERT INTO itineraries (",
    "  id, title, theme_id, default_view_mode, memo, password, source_itinerary_id, created_at, updated_at",
    ") VALUES",
    values([
      [sourceId, itinerary.title, itinerary.theme_id, itinerary.default_view_mode, itinerary.memo, null, null, fixedTimestamp, fixedTimestamp],
      [publicId, itinerary.title, itinerary.theme_id, itinerary.default_view_mode, itinerary.memo, null, sourceId, fixedTimestamp, fixedTimestamp],
    ]) + ";",
    "",
    "INSERT INTO steps (",
    "  id, itinerary_id, title, start_at, end_at, location, notes, link, type, is_all_day, created_at, updated_at",
    ") VALUES",
  );

  const stepRows: unknown[][] = [];
  for (const targetId of [sourceId, publicId]) {
    for (const step of steps) {
      const suffix = step.id.replace(/^demo-step-?/, "") || "step";
      stepRows.push([
        `${targetId}-${suffix}`,
        targetId,
        step.title,
        step.start_at + timestampOffset,
        step.end_at + timestampOffset,
        step.location ?? null,
        step.notes ?? "",
        step.link ?? null,
        step.type ?? "normal:general",
        step.is_all_day ? 1 : 0,
        fixedTimestamp,
        fixedTimestamp,
      ]);
    }
  }

  out.push(
    values(stepRows) + ";",
    "",
    "INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at)",
    `VALUES ('official-user', '${sourceId}', 1, '${fixedTimestamp}', '${fixedTimestamp}');`,
    "",
    "INSERT INTO itinerary_publications (",
    "  source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, areas, tags, published_at, updated_at",
    ") VALUES (",
    `  '${sourceId}', '${publicId}', 'official-user',`,
    `  '${JSON.stringify(config.prefectures)}', '${JSON.stringify(config.areas)}', '${JSON.stringify(config.tags)}',`,
    `  '${fixedTimestamp}', '${fixedTimestamp}'`,
    ");",
    "",
    "INSERT INTO itinerary_fork_stats (itinerary_id, fork_count)",
    `VALUES ('${publicId}', ${config.copies});`,
    "",
  );
}

const current = readFileSync(sqlPath, "utf8");
const previousMarker = "-- Official examples shown in the public feed.";
const markerIndex = current.includes(marker) ? current.indexOf(marker) : current.indexOf(previousMarker);
if (markerIndex < 0) throw new Error("Official seed marker was not found");
writeFileSync(sqlPath, `${current.slice(0, markerIndex).trimEnd()}\n\n${out.join("\n").trimEnd()}\n`);
