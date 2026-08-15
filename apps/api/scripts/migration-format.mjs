function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim();
}

export function parseMigrationText(sql, file = 'migration.sql') {
  const upMarker = '-- migrate:up';
  const downMarker = '-- migrate:down';
  const upStart = sql.indexOf(upMarker);
  const downStart = sql.indexOf(downMarker);

  if (upStart < 0 && downStart < 0) {
    const up = sql.trim();
    if (!stripComments(up)) throw new Error(`${file} has an empty up migration.`);
    return { up, down: '' };
  }
  if (upStart < 0 || downStart < 0 || downStart <= upStart) {
    throw new Error(`${file} must contain both dbmate up and down sections.`);
  }

  const up = sql.slice(upStart + upMarker.length, downStart).trim();
  const down = sql.slice(downStart + downMarker.length).trim();
  if (!stripComments(up)) throw new Error(`${file} has an empty up migration.`);
  return { up, down: stripComments(down) ? down : '' };
}
