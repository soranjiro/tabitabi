# Database scripts

- `generate-schema.mjs`: regenerates `apps/db/schema.sql` from all up migrations.
- `check-migrations.mjs`: enforces migration immutability and flags destructive SQL in changed migrations.
- `test-migrations.mjs`: applies migrations sequentially with foreign keys enabled and verifies existing parent/child data survives.

Run locally with:

```bash
pnpm db:schema:check
pnpm db:migrations:check
pnpm db:migrations:test
```

`db:migrations:check` compares against `origin/main` by default. Pass another base ref as the first argument when needed.
