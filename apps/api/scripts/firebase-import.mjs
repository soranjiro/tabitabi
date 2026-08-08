const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export function extractD1Rows(value) {
  if (Array.isArray(value)) {
    if (value.length === 1 && Array.isArray(value[0]?.results)) return value[0].results;
    if (value.every((item) => item && typeof item === 'object' && 'id' in item)) return value;
  }
  if (Array.isArray(value?.results)) return value.results;
  throw new Error('D1のJSON形式を認識できませんでした');
}

export function buildFirebaseImport(rows) {
  if (rows.length === 0) throw new Error('移行対象ユーザーが0件です');
  const ids = new Set();
  const emails = new Set();

  const users = rows.map((row, index) => {
    const id = requiredString(row.id, `users[${index}].id`);
    const email = requiredString(row.email, `users[${index}].email`).trim().toLowerCase();
    const username = requiredString(row.username, `users[${index}].username`);
    const passwordHash = requiredString(row.password_hash, `users[${index}].password_hash`);
    if (!BCRYPT_PATTERN.test(passwordHash)) throw new Error(`users[${index}]のbcryptハッシュ形式が不正です`);
    if (ids.has(id)) throw new Error(`Firebase UIDが重複しています: ${id}`);
    if (emails.has(email)) throw new Error(`メールアドレスが重複しています: ${email}`);
    ids.add(id);
    emails.add(email);

    const createdAt = Date.parse(row.created_at);
    return {
      localId: id,
      email,
      emailVerified: false,
      passwordHash: Buffer.from(passwordHash, 'utf8').toString('base64'),
      displayName: username,
      ...(Number.isFinite(createdAt) ? { createdAt: String(createdAt) } : {}),
    };
  });

  return { users };
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${field}がありません`);
  return value;
}
