import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseMigrationText } from '../../api/scripts/migration-format.mjs';

const baseRef = process.argv[2] || process.env.MIGRATION_BASE_REF || 'origin/main';
const migrationsPrefix = 'apps/db/migrations/sql/';

const diff = git(['diff', '--name-status', '--find-renames', `${baseRef}...HEAD`, '--', migrationsPrefix]).trim();
if (!diff) {
  console.log('No migration file changes detected.');
  process.exit(0);
}

let failed = false;
for (const line of diff.split('\n')) {
  const [status, ...paths] = line.split('\t');
  const path = paths.at(-1);
  if (!path?.startsWith(migrationsPrefix)) continue;

  if (status.startsWith('D')) {
    error(`${path}: deleting an existing migration is not allowed.`);
    continue;
  }

  if (status.startsWith('R')) {
    error(`${path}: renaming an existing migration is not allowed.`);
    continue;
  }

  const sql = readFileSync(path, 'utf8');

  if (status.startsWith('M')) {
    let baseBlob;
    try {
      baseBlob = git(['rev-parse', `${baseRef}:${path}`]).trim();
    } catch {
      error(`${path}: could not resolve the base migration blob.`);
      continue;
    }

    const marker = `-- migration-rewrite-base-blob: ${baseBlob}`;
    if (!sql.includes(marker)) {
      error(
        `${path}: existing migrations are immutable. ` +
        `For an exceptional rewrite, add exactly "${marker}" and explain the incident in the PR.`,
      );
      continue;
    }
    warning(`${path}: existing migration rewrite explicitly acknowledged for base blob ${baseBlob}.`);
  }

  const { up } = parseMigrationText(sql, path);
  const destructive = detectDestructiveStatements(up);
  if (destructive.length > 0) {
    if (!sql.includes('-- migration-risk: destructive-approved')) {
      error(
        `${path}: destructive SQL detected (${destructive.join(', ')}). ` +
        'Avoid destructive operations, or add "-- migration-risk: destructive-approved" after explicit review.',
      );
    } else {
      warning(`${path}: destructive SQL explicitly approved (${destructive.join(', ')}).`);
    }
  }
}

if (failed) process.exit(1);
console.log('Migration policy checks passed.');

function detectDestructiveStatements(sql) {
  const checks = [
    ['DROP TABLE', /\bDROP\s+TABLE\b/i],
    ['DELETE FROM', /\bDELETE\s+FROM\b/i],
    ['DROP COLUMN', /\bDROP\s+COLUMN\b/i],
    ['TRUNCATE', /\bTRUNCATE\b/i],
  ];
  return checks.filter(([, pattern]) => pattern.test(sql)).map(([name]) => name);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function error(message) {
  failed = true;
  console.error(`::error::${message}`);
}

function warning(message) {
  console.warn(`::warning::${message}`);
}
