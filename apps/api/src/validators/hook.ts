import type { Context } from 'hono';

/**
 * zValidator の hook: バリデーション失敗時に統一エラーレスポンスを返す
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validationHook(result: { success: boolean; error?: any }, c: Context) {
  if (!result.success) {
    const issues = result.error?.issues ?? [];
    const message = issues.map((i: { path: PropertyKey[]; message: string }) => {
      const path = i.path.map(String).join('.');
      return path ? `${path}: ${i.message}` : i.message;
    }).join(', ');
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message },
    }, 400);
  }
}
