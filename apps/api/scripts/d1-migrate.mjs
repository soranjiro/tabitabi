import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { parseMigrationText } from './migration-format.mjs';

const command = process.argv[2];
const remote = process.argv.includes('--remote');
const environment = optionValue('--env');
const apiRoot = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(apiRoot, '..', 'db', 'migrations', 'sql');
const seedFile = resolve(apiRoot, '..', 'db', 'migrations', 'seed.sql');
const wranglerLogPath = join(apiRoot, '.wrangler', 'wrangler.log');
const database = environment ? 'DB' : 'tabitabi';
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

if (!['status', 'up', 'down', 'seed'].includes(command)) {
  throw new Error('Usage: node scripts/d1-migrate.mjs <status|up|down|seed> [--remote] [--env <name>]');
}

if (command === 'status') showStatus();
else if (command === 'seed') executeSql(readFileSync(seedFile, 'utf8'));
else {
  ensureHistory();
  importWranglerHistory();
  if (command === 'up') migrateUp();
  else migrateDown();
}

function showStatus() {
  const applied = appliedMigrations();
  for (const file of migrationFiles) {
    process.stdout.write(`${applied.has(idOf(file)) ? '[X]' : '[ ]'} ${file}\n`);
  }
}

function migrateUp() {
  const applied = appliedMigrations();
  for (const file of migrationFiles) {
    const id = idOf(file);
    if (applied.has(id)) continue;
    const { up } = parseMigration(file);
    executeSql(`${up}\nINSERT OR IGNORE INTO schema_migrations (version) VALUES ('${sqlString(id)}');\n`);
    process.stdout.write(`Applied: ${file}\n`);
  }
}

function migrateDown() {
  const applied = appliedMigrations();
  const file = [...migrationFiles].reverse().find((name) => applied.has(idOf(name)));
  if (!file) {
    process.stdout.write('No migrations to roll back.\n');
    return;
  }

  const { down } = parseMigration(file);
  if (!down) {
    throw new Error(`${file} is a legacy forward-only migration and cannot be rolled back.`);
  }
  executeSql(`${down}\nDELETE FROM schema_migrations WHERE version = '${sqlString(idOf(file))}';\n`);
  process.stdout.write(`Rolled back: ${file}\n`);
}

function ensureHistory() {
  executeCommand('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY);');
}

function importWranglerHistory() {
  if (!tableExists('d1_migrations')) return;
  executeCommand(`
    INSERT OR IGNORE INTO schema_migrations (version)
    SELECT CASE
      WHEN length(substr(name, 1, instr(name, '_') - 1)) >= 12
        THEN substr(name, 1, instr(name, '_') - 1)
      ELSE replace(name, '.sql', '')
    END
    FROM d1_migrations;
  `);
}

function appliedMigrations() {
  const applied = new Set();
  if (tableExists('schema_migrations')) {
    for (const row of query('SELECT version FROM schema_migrations ORDER BY version;')) {
      applied.add(String(row.version));
    }
  }
  if (tableExists('d1_migrations')) {
    for (const row of query('SELECT name FROM d1_migrations ORDER BY id;')) {
      applied.add(idOf(String(row.name)));
    }
  }
  return applied;
}

function tableExists(name) {
  const rows = query(
    `SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name = '${sqlString(name)}';`,
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

function query(sql) {
  const output = wrangler([
    'd1', 'execute', database, ...targetArgs(), '--yes', '--json', '--command', sql,
  ], true);
  const parsed = JSON.parse(output);
  return parsed.flatMap((result) => result.results ?? []);
}

function executeCommand(sql) {
  wrangler(['d1', 'execute', database, ...targetArgs(), '--yes', '--command', sql]);
}

function executeSql(sql) {
  const directory = mkdtempSync(join(tmpdir(), 'tabitabi-d1-migration-'));
  const file = join(directory, 'migration.sql');
  try {
    writeFileSync(file, sql);
    wrangler(['d1', 'execute', database, ...targetArgs(), '--yes', '--file', file]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function targetArgs() {
  return [remote ? '--remote' : '--local', ...(environment ? ['--env', environment] : [])];
}

function wrangler(args, capture = false) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: { ...process.env, WRANGLER_LOG_PATH: wranglerLogPath },
  }) ?? '';
}

function idOf(file) {
  const name = basename(file, '.sql');
  const prefix = name.split('_', 1)[0];
  return prefix.length >= 12 ? prefix : name;
}

function parseMigration(file) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  return parseMigrationText(sql, file);
}

function optionValue(option) {
  const index = process.argv.indexOf(option);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`);
  return value;
}

function sqlString(value) {
  return value.replaceAll("'", "''");
}
