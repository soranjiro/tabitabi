import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { auditStepCleanup } from './audit-step-cleanup.mjs';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'tabitabi-cleanup-audit-'));
  const databasePath = join(directory, 'fixture.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE itineraries (id TEXT PRIMARY KEY, memo TEXT, memo_text TEXT);
    CREATE TABLE steps (
      id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL,
      notes TEXT, notes_text TEXT, scheduled_start_at INTEGER, scheduled_end_at INTEGER,
      time_unspecified INTEGER NOT NULL DEFAULT 0, sort_order REAL, pin_latitude REAL,
      pin_longitude REAL, is_priority INTEGER NOT NULL DEFAULT 0, is_all_day INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
    );
    INSERT INTO itineraries VALUES ('trip', '{"text":"memo","legacy":{"keep":true}}', 'memo');
    INSERT INTO steps VALUES (
      'step', 'trip', 1, 2,
      '{"text":"notes","tabitabi_schedule":{"precision":"time"}}', 'notes',
      1, 2, 0, 1, 35, 135, 1, 0
    );`);
  db.close();
  return { directory, databasePath };
}

test('accepts a fully backfilled database without changing it', () => {
  const { directory, databasePath } = fixture();
  try {
    const result = auditStepCleanup(databasePath);
    assert.equal(result.safe, true);
    assert.equal(result.counts.itineraries, 1);
    assert.equal(result.counts.steps, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('blocks cleanup when normalized text is missing', () => {
  const { directory, databasePath } = fixture();
  try {
    const db = new DatabaseSync(databasePath);
    db.exec("UPDATE steps SET notes_text = NULL WHERE id = 'step'");
    db.close();
    const result = auditStepCleanup(databasePath);
    assert.equal(result.safe, false);
    assert.deepEqual(result.failures, ['missingNotesText=1', 'notesTextMismatch=1']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('blocks cleanup when foreign keys are broken', () => {
  const { directory, databasePath } = fixture();
  try {
    const db = new DatabaseSync(databasePath);
    db.exec("PRAGMA foreign_keys = OFF; UPDATE steps SET itinerary_id = 'missing' WHERE id = 'step'");
    db.close();
    const result = auditStepCleanup(databasePath);
    assert.equal(result.safe, false);
    assert.deepEqual(result.failures, ['foreignKeyViolations=1']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
