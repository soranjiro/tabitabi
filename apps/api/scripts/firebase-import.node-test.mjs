import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirebaseImport, extractD1Rows } from './firebase-import.mjs';

const hash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12345';

test('D1 output is converted without changing uid and with unverified email', () => {
  const rows = extractD1Rows([{ results: [{ id: 'd1-id', email: 'USER@example.com', username: 'traveler', password_hash: hash, created_at: '2026-01-02T03:04:05.000Z' }] }]);
  const result = buildFirebaseImport(rows);
  assert.equal(result.users[0].localId, 'd1-id');
  assert.equal(result.users[0].email, 'user@example.com');
  assert.equal(result.users[0].emailVerified, false);
  assert.equal(Buffer.from(result.users[0].passwordHash, 'base64').toString('utf8'), hash);
});

test('duplicate emails and invalid bcrypt values are rejected', () => {
  assert.throws(() => buildFirebaseImport([
    { id: 'one', email: 'same@example.com', username: 'one', password_hash: hash },
    { id: 'two', email: 'SAME@example.com', username: 'two', password_hash: hash },
  ]), /重複/);
  assert.throws(() => buildFirebaseImport([
    { id: 'one', email: 'one@example.com', username: 'one', password_hash: 'plaintext' },
  ]), /bcrypt/);
});
