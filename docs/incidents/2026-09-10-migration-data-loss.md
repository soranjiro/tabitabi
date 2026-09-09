# 2026-09-10 migration data-loss guardrail

PR #297 recreated the `itineraries` table to change a column default. Because child tables such as `steps` reference `itineraries(id)` with `ON DELETE CASCADE`, dropping the parent table could delete child data when foreign keys are enabled.

The affected production database was restored with D1 Time Travel before the migration was recorded as applied. The migration is therefore rewritten in the follow-up fix to update theme IDs in place without recreating `itineraries`.

This incident led to the migration safety checks documented in `docs/migration-safety.md`.
