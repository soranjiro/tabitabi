import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

const REQUIRED_ITINERARY_COLUMNS = ['memo', 'memo_text'];
const REQUIRED_STEP_COLUMNS = [
  'start_at', 'end_at', 'notes', 'notes_text', 'scheduled_start_at', 'scheduled_end_at',
  'time_unspecified', 'sort_order', 'pin_latitude', 'pin_longitude', 'is_priority',
];

export function auditStepCleanup(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    requireColumns(db, 'itineraries', REQUIRED_ITINERARY_COLUMNS);
    requireColumns(db, 'steps', REQUIRED_STEP_COLUMNS);

    const counts = {
      itineraries: scalar(db, 'SELECT COUNT(*) FROM itineraries'),
      steps: scalar(db, 'SELECT COUNT(*) FROM steps'),
      missingMemoText: scalar(db, 'SELECT COUNT(*) FROM itineraries WHERE memo_text IS NULL'),
      missingNotesText: scalar(db, 'SELECT COUNT(*) FROM steps WHERE notes_text IS NULL'),
      memoTextMismatch: scalar(db, `SELECT COUNT(*) FROM itineraries
        WHERE memo_text IS NOT CASE
          WHEN memo IS NULL THEN ''
          WHEN json_valid(memo) AND json_type(memo, '$.text') = 'text' THEN json_extract(memo, '$.text')
          ELSE memo
        END`),
      notesTextMismatch: scalar(db, `SELECT COUNT(*) FROM steps
        WHERE notes_text IS NOT CASE
          WHEN notes IS NULL THEN ''
          WHEN json_valid(notes) AND json_type(notes, '$.text') = 'text' THEN json_extract(notes, '$.text')
          ELSE notes
        END`),
      invalidSchedulePair: scalar(db, `SELECT COUNT(*) FROM steps WHERE NOT (
        (scheduled_start_at IS NULL AND scheduled_end_at IS NULL)
        OR (scheduled_start_at IS NOT NULL AND scheduled_end_at IS NOT NULL
          AND scheduled_end_at >= scheduled_start_at)
      )`),
      invalidTimeState: scalar(db, `SELECT COUNT(*) FROM steps
        WHERE time_unspecified NOT IN (0, 1)
          OR (time_unspecified = 1 AND (scheduled_start_at IS NULL OR is_all_day = 1))`),
      invalidPinPair: scalar(db, `SELECT COUNT(*) FROM steps WHERE NOT (
        (pin_latitude IS NULL AND pin_longitude IS NULL)
        OR (pin_latitude IS NOT NULL AND pin_longitude IS NOT NULL)
      )`),
      invalidCoordinates: scalar(db, `SELECT COUNT(*) FROM steps
        WHERE (pin_latitude IS NOT NULL AND (pin_latitude < -90 OR pin_latitude > 90))
          OR (pin_longitude IS NOT NULL AND (pin_longitude < -180 OR pin_longitude > 180))`),
      foreignKeyViolations: db.prepare('PRAGMA foreign_key_check').all().length,
    };
    const failures = Object.entries(counts)
      .filter(([name, value]) => !['itineraries', 'steps'].includes(name) && value !== 0)
      .map(([name, value]) => `${name}=${value}`);

    return { safe: failures.length === 0, counts, failures };
  } finally {
    db.close();
  }
}

function requireColumns(db, table, expected) {
  const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  const missing = expected.filter((column) => !columns.has(column));
  if (missing.length) throw new Error(`${table} is missing cleanup prerequisite columns: ${missing.join(', ')}`);
}

function scalar(db, sql) {
  return Number(Object.values(db.prepare(sql).get())[0]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const databasePath = process.argv[2];
  if (!databasePath) {
    console.error('Usage: node apps/db/scripts/audit-step-cleanup.mjs <sqlite-database-path>');
    process.exit(2);
  }
  try {
    const result = auditStepCleanup(databasePath);
    console.log(JSON.stringify(result, null, 2));
    if (!result.safe) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
