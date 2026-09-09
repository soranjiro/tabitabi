# Migration CI behavior

The migration-safety CI job intentionally complements, rather than replaces, the generated schema check.

- Schema check answers: "Does the complete migration history produce the committed final schema?"
- Migration data-preservation check answers: "Does applying that history to existing data preserve a representative parent/child graph?"
- Migration policy check answers: "Did this PR rewrite migration history or introduce destructive SQL?"

All three checks are required before the build job can pass.
