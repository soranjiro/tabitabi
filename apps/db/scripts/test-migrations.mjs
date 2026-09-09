import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseMigrationText } from '../../api/scripts/migration-format.mjs';

const dbRoot = resolve(import.meta.dirname, '..');
const migrationsDir = join(dbRoot, 'migrations', 'sql');
const directory = mkdtempSync(join(tmpdir(), 'tabitabi-migration-safety-'));
const databasePath = join(directory, 'migration.sqlite');

const ITINERARY_ID = '__migration_guard_itinerary__';
const STEP_ID = '__migration_guard_step__';
const NOW = '2026-01-01T00:00:00.000Z';

try {
  const migrations = readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of migrations) {
    const hadSentinel = sentinelExists();
    if (!hadSentinel) ensureSentinel();
    const shouldPreserveSentinel = sentinelExists();

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const { up } = parseMigrationText(sql, file);

    try {
      execute(`PRAGMA foreign_keys = ON;\n${up}\n`);
    } catch (error) {
      throw new Error(`${file} failed to apply with foreign keys enabled.`, { cause: error });
    }

    if (shouldPreserveSentinel) {
      assertSentinel(file);
    }
    assertForeignKeys(file);
    ensureSentinel();
  }

  console.log(`Migration data-preservation checks passed (${migrations.length} migrations).`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}

function ensureSentinel() {
  if (!tableExists('itineraries') || !tableExists('steps')) return;

  if (!rowExists('itineraries', 'id', ITINERARY_ID)) {
    insertWithKnownColumns('itineraries', {
      id: ITINERARY_ID,
      title: 'Migration guard itinerary',
      theme_id: 'standard-autumn',
      created_at: NOW,
      updated_at: NOW,
    });
  }

  if (!rowExists('steps', 'id', STEP_ID)) {
    insertWithKnownColumns('steps', {
      id: STEP_ID,
      itinerary_id: ITINERARY_ID,
      title: 'Migration guard step',
      date: '2026-01-01',
      time: '09:00',
      start_at: 1767225600000,
      end_at: 1767229200000,
      location: 'Migration guard',
      notes: 'Migration data-preservation sentinel',
      created_at: NOW,
      updated_at: NOW,
      type: 'normal:general',
      is_all_day: 0,
      link: null,
    });
  }
}

function insertWithKnownColumns(table, knownValues) {
  const columns = queryJson(`PRAGMA table_info(${quoteIdentifier(table)});`);
  const selected = [];

  for (const column of columns) {
    if (Object.hasOwn(knownValues, column.name)) {
      selected.push([column.name, knownValues[column.name]]);
      continue;
    }

    if (Number(column.notnull) === 1 && column.dflt_value == null && Number(column.pk) === 0) {
      throw new Error(
        `${table}.${column.name} is required but the migration safety fixture has no value for it. ` +
        'Add a fixture value before merging the schema change.',
      );
    }
  }

  const names = selected.map(([name]) => quoteIdentifier(name)).join(', ');
  const values = selected.map(([, value]) => sqlLiteral(value)).join(', ');
  execute(`PRAGMA foreign_keys = ON;\nINSERT INTO ${quoteIdentifier(table)} (${names}) VALUES (${values});`);
}

function assertSentinel(file) {
  if (!rowExists('itineraries', 'id', ITINERARY_ID)) {
    throw new Error(`${file} removed the migration guard itinerary.`);
  }
  if (!rowExists('steps', 'id', STEP_ID)) {
    throw new Error(
      `${file} removed a child step while migrating an existing itinerary. ` +
      'This usually indicates a destructive parent-table operation triggering ON DELETE CASCADE.',
    );
  }
}

function assertForeignKeys(file) {
  const violations = queryJson('PRAGMA foreign_key_check;');
  if (violations.length > 0) {
    throw new Error(`${file} left foreign-key violations: ${JSON.stringify(violations)}`);
  }
}

function sentinelExists() {
  return tableExists('itineraries') && tableExists('steps') &&
    rowExists('itineraries', 'id', ITINERARY_ID) && rowExists('steps', 'id', STEP_ID);
}

function tableExists(name) {
  const rows = queryJson(
    `SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ${sqlLiteral(name)} LIMIT 1;`,
  );
  return rows.length > 0;
}

function rowExists(table, column, value) {
  if (!tableExists(table)) return false;
  const rows = queryJson(
    `SELECT 1 AS present FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} = ${sqlLiteral(value)} LIMIT 1;`,
  );
  return rows.length > 0;
}

function execute(sql) {
  execFileSync('sqlite3', [databasePath], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'ignore', 'inherit'],
  });
}

function queryJson(sql) {
  const output = execFileSync('sqlite3', ['-json', databasePath, sql], { encoding: 'utf8' }).trim();
  return output ? JSON.parse(output) : [];
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}
