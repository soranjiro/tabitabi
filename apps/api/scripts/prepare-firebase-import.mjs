import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildFirebaseImport, extractD1Rows } from './firebase-import.mjs';

const [, , inputArg, outputArg = '.auth-migration/firebase-users.json'] = process.argv;
if (!inputArg) {
  console.error('Usage: pnpm auth:migration:prepare <d1-export.json> [firebase-users.json]');
  process.exitCode = 1;
} else {
  try {
    const inputPath = resolve(inputArg);
    const outputPath = resolve(outputArg);
    const parsed = JSON.parse(await readFile(inputPath, 'utf8'));
    const result = buildFirebaseImport(extractD1Rows(parsed));
    await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
    await chmod(outputPath, 0o600);
    console.log(`${result.users.length}件のFirebaseインポートファイルを作成しました: ${outputPath}`);
    console.log('パスワードハッシュは表示していません。インポート後、このファイルを削除してください。');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
