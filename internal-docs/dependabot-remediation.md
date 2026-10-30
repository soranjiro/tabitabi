# Dependabot remediation

## Open alerts covered by this change

| Alerts | Package | Resolution |
| --- | --- | --- |
| #187 | re2js | Override to `^2.8.7`; lockfile resolves 2.9.1. |
| #186 | deepmerge | No upstream fixed release. Apply `patches/deepmerge@4.3.1.patch` through pnpm patchedDependencies. |
| #180, #182–185 | undici | Override 7.x to `^7.30.1`; lockfile resolves 7.30.1. |
| #175 | zod | Override 4.x to `^4.6.7`, including the Workers test pool's pinned dependency. Upgrade Lighthouse to 13.6.0 so its Puppeteer/Chromium BiDi dependency uses Zod 4 rather than forcing an incompatible major onto Zod 3 consumers. Only Zod 4.6.7 remains in the lockfile. |
| #171–172 | @vitest/mocker | Update Vitest and coverage-v8 together to 4.1.12; constrain mocker to `>=4.1.12 <5`. |
| #164 | sharp | Override to `^0.35.5`; lockfile resolves 0.35.5. |
| #163 | source-map-js | Override to `^1.2.2`; lockfile resolves 1.2.2. |

## deepmerge mitigation

GHSA-gcqx-w48m-w2h4 affects deepmerge's object merging. The patch rejects
`__proto__`, `constructor`, and `prototype` keys in both the target-copy and
source-merge paths, including null-prototype inputs. It patches the source,
CommonJS bundle, and UMD bundle. Normal object/symbol/array merging remains intact.

`apps/web/scripts/security.node-test.mjs` resolves the actual deepmerge dependency
of `@sveltejs/vite-plugin-svelte` and tests both runtime bundles. Tests cover both
inputs, nested merging, null-prototype inputs, and `clone: false`, along with
normal configuration merging. These tests run under `make test`.

A local pnpm patch does not change the published package version, so version-based
scanners still identify deepmerge 4.3.1. Replace the patch with an upstream fixed
release when one becomes available; do not suppress all deepmerge advisories.

## Production rollout result

PR #366 was merged to main as `2624a36f3c401d764434c022fb0be9ba6a843905`.
The automatic production deployment succeeded for both API Workers and Web Pages:
https://github.com/soranjiro/tabitabi/actions/runs/40987149784

The eleven fixed-version alerts closed automatically as `fixed`. After deployment,
#186 was dismissed with the supported API reason `tolerable_risk`, explicitly
referencing the deployed local patch and regression tests. The risk is mitigated,
not simply accepted without treatment. Dependabot's API does not support a
`custom mitigation` reason. This is not a false-positive dismissal.

`pnpm audit` still reports the patched package because it does not inspect patch
contents; GitHub's open-alert count is zero after the dismissal is processed.

## Validation

- `pnpm install --frozen-lockfile`: passes.
- `make test`: passes (API: 171 Vitest + 9 Node tests; web: 118 Vitest + 10 Node tests).
- `make build`: passes.
- `git diff --check`: passes.
- `make check-web`: still reports application/tooling diagnostics; these are not
  part of this dependency remediation. No baseline comparison has been performed.

This change is based on `bd31026f`, including the already-merged SvelteKit 3 /
Vite 8 migration (#361). Those versions and TypeScript 6 are preserved.
`pnpm audit` now reports only the locally patched deepmerge advisory; the two
SvelteKit advisories seen during the earlier local investigation no longer
appear. No audit-wide suppression is introduced.
