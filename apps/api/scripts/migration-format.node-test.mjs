import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseMigrationText } from './migration-format.mjs';

test('parses up and down sections', () => {
  assert.deepEqual(
    parseMigrationText('-- migrate:up\nCREATE TABLE example (id TEXT);\n-- migrate:down\nDROP TABLE example;', 'example.sql'),
    { up: 'CREATE TABLE example (id TEXT);', down: 'DROP TABLE example;' },
  );
});

test('rejects an empty up section', () => {
  assert.throws(
    () => parseMigrationText('-- migrate:up\n\n-- migrate:down\nCREATE TABLE misplaced (id TEXT);', 'broken.sql'),
    /broken\.sql has an empty up migration/,
  );
});

test('treats a comment-only down section as forward-only', () => {
  assert.deepEqual(
    parseMigrationText('-- migrate:up\nSELECT 1;\n-- migrate:down\n-- Not reversible', 'forward.sql'),
    { up: 'SELECT 1;', down: '' },
  );
});

test('shared-fund repair migration preserves existing expenses and adds the missing schema', () => {
  const migrationsDir = resolve(import.meta.dirname, '../../db/migrations/sql');
  const skippedFile = '20260815091503_add_shared_money_fund.sql';
  const repairFile = '20260815100000_repair_shared_money_fund.sql';
  const skipped = parseMigrationText(readFileSync(resolve(migrationsDir, skippedFile), 'utf8'), skippedFile);
  const repair = parseMigrationText(readFileSync(resolve(migrationsDir, repairFile), 'utf8'), repairFile);
  const db = new DatabaseSync(':memory:');

  try {
    db.exec(`
      CREATE TABLE itinerary_money_items (id TEXT PRIMARY KEY);
      INSERT INTO itinerary_money_items (id) VALUES ('existing-expense');
    `);
    db.exec(skipped.up);
    db.exec(repair.up);

    const columns = db.prepare('PRAGMA table_info(itinerary_money_items)').all();
    assert.equal(columns.some((column) => column.name === 'paid_from_fund'), true);
    assert.equal(
      db.prepare("SELECT paid_from_fund FROM itinerary_money_items WHERE id = 'existing-expense'").get().paid_from_fund,
      0,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name = 'itinerary_money_fund_transactions'").get().count,
      1,
    );
  } finally {
    db.close();
  }
});
