# Migration review checklist

Use this checklist when a pull request changes `apps/db/migrations/sql/`.

- Confirm the migration is forward-safe with existing production data.
- Avoid dropping or recreating parent tables referenced by foreign keys.
- Confirm `pnpm db:migrations:test` preserves the itinerary/step sentinel.
- Confirm `pnpm db:migrations:check` reports no unapproved destructive SQL.
- Confirm `pnpm db:schema:check` is clean.
- For destructive changes, document the reason and rollback plan in the PR.
- For production execution, verify the D1 Time Travel bookmark appears in the deploy job summary before migration execution.
