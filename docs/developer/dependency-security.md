# Dependency security

## GHSA-vfj7-8cjw-p6xm (2026-10-04)

- Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- Dependabot alert: https://github.com/soranjiro/tabitabi/security/dependabot/162
- Affected dependency: `braces@3.0.3`, through Tailwind CSS 3's `chokidar`
  and `micromatch` (also through `fast-glob`). These are web build/development
  dependencies; this is not an application API input path.
- No fixed upstream release was available when checked.

`patches/braces@3.0.3.patch`, registered in `pnpm-workspace.yaml`, limits parsed
AST nesting to 100 levels. It rejects excessive brace, parenthesis, and combined
nesting with a `SyntaxError` before recursive compilation, expansion, or
stringification. Escaped, quoted, and character-class braces remain literals.
The limit applies to string inputs; manually constructed ASTs are outside this
mitigation and must not be accepted from untrusted sources.

`make test-web` tests the installed package through all three dependency paths,
including 4,000-level attack patterns and normal Tailwind content globs. pnpm
applies the patch on install, including frozen-lockfile CI installs.

Version-based scanners (`pnpm audit` and Dependabot) will continue to report
`braces@3.0.3` despite this local mitigation. The alert is intentionally left
open, with no audit ignore rule. When an upstream fix is released, update the
dependency, remove this patch registration and file, and rerun the regression
tests, `make test`, `make build`, and `pnpm audit`.
