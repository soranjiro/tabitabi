# Migration safety

Production migrations are treated as data migrations, not only schema generation.

## Pull requests

CI runs two migration-specific checks:

1. `pnpm db:migrations:check`
   - Existing migration files are immutable by default.
   - Deleting or renaming an existing migration fails CI.
   - Rewriting an existing migration requires a `migration-rewrite-base-blob` marker matching the exact blob on `main`.
   - `DROP TABLE`, `DELETE FROM`, `DROP COLUMN`, and `TRUNCATE` in an up migration fail CI unless `-- migration-risk: destructive-approved` is present.
2. `pnpm db:migrations:test`
   - Applies every migration sequentially with foreign keys enabled.
   - Keeps an existing itinerary/step sentinel in the database.
   - Fails if a migration removes the child row (for example through `ON DELETE CASCADE`).
   - Runs `PRAGMA foreign_key_check` after every migration.

The generated schema check (`pnpm db:schema:check`) remains required as a separate final-schema check.

## Production deploys

The deploy workflow:

1. checks whether migrations are pending;
2. captures a D1 Time Travel bookmark only when a migration will run;
3. applies pending migrations;
4. runs D1 verification (`foreign_key_check`, `quick_check`, required tables, and pending-migration check);
5. seeds official data only when `apps/db/migrations/seed.sql` changed, or when `run_seed` is explicitly enabled in a manual workflow dispatch;
6. deploys the API and web app.

The rollback bookmark and restore command are written to the GitHub Actions job summary.

## Seed policy

- Local: seed as needed.
- Preview: seed newly created preview databases.
- Production: do not seed on every deploy. Seed only when seed data changes or through an explicit manual dispatch.
