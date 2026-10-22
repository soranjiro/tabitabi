# Production migration rollback

When a production migration is pending, the deploy workflow captures a D1 Time Travel bookmark before applying it and writes the bookmark plus restore command to the Actions job summary.

If a migration causes data loss or corruption:

1. stop further production writes/deploys;
2. copy the pre-migration bookmark from the failed deploy job summary;
3. restore D1 to that bookmark with Wrangler;
4. fix the migration before allowing it to run again;
5. verify `migration-safety`, schema checks, and application tests before merging the fix.

Do not add a follow-up migration that runs after a known destructive pending migration: fix the pending migration itself if it has not been applied to production.
