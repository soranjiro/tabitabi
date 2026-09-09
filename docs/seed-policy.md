# Seed policy

Production seed data is not a deploy-time reset operation.

- Local environments may seed as needed.
- Preview databases are newly created and may be seeded on creation.
- Production runs `seed.sql` only when the seed file changed in the pushed range, or when `run_seed` is explicitly selected in a manual deploy.

This keeps official fixtures deterministic without paying the DELETE/CASCADE/INSERT write cost on every application deploy.
