import { DatabaseSync, type StatementSync } from 'node:sqlite';

type D1Value = string | number | boolean | null | undefined;

type D1Result<T = unknown> = {
  success: boolean;
  results?: T[];
  meta?: {
    changes?: number;
    last_row_id?: number | bigint;
  };
};

class LocalD1PreparedStatement {
  private values: D1Value[] = [];

  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  run(): D1Result {
    const normalizedSql = this.normalizeSql();

    if (this.values.length === 0 && /;\s*\S/.test(normalizedSql.trim().replace(/;\s*$/, ''))) {
      this.database.exec(normalizedSql);
      return { success: true, meta: { changes: 0 } };
    }

    const statement = this.prepareStatement(normalizedSql);
    const result = statement.run(...this.normalizeValues());
    return {
      success: true,
      meta: {
        changes: result.changes,
        last_row_id: result.lastInsertRowid,
      },
    };
  }

  all<T = Record<string, unknown>>(): D1Result<T> {
    const statement = this.prepareStatement(this.normalizeSql());
    return {
      success: true,
      results: statement.all(...this.normalizeValues()) as T[],
    };
  }

  first<T = Record<string, unknown>>(): T | null {
    const statement = this.prepareStatement(this.normalizeSql());
    return (statement.get(...this.normalizeValues()) as T | undefined) ?? null;
  }

  private normalizeSql(): string {
    return this.sql.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');
  }

  private normalizeValues() {
    return this.values.map((value) => {
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (value === undefined) return null;
      return value;
    });
  }

  private prepareStatement(sql: string): StatementSync {
    return this.database.prepare(sql);
  }
}

class LocalD1Database {
  private readonly database = new DatabaseSync(':memory:');

  constructor() {
    this.database.exec('PRAGMA foreign_keys = ON;');
  }

  prepare(sql: string) {
    return new LocalD1PreparedStatement(this.database, sql);
  }

  async batch(statements: LocalD1PreparedStatement[]) {
    this.database.exec('BEGIN;');
    try {
      const results = statements.map((statement) => statement.run());
      this.database.exec('COMMIT;');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
  }
}

export const env = {
  DB: new LocalD1Database(),
  ALLOWED_ORIGINS: '*',
  JWT_SECRET: 'test-secret-for-ci',
};

export function createExecutionContext() {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil(promise: Promise<unknown>) {
      promises.push(promise);
    },
    passThroughOnException() {},
    props: {},
    __promises: promises,
  };
}

export async function waitOnExecutionContext(ctx: ReturnType<typeof createExecutionContext>) {
  await Promise.all(ctx.__promises);
}
