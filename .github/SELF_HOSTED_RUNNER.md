# Intel iMac self-hosted runner — security and setup

This repository is **public** and currently belongs to a **personal GitHub account**.

## Intended workflow placement

| Trigger | Runner |
| --- | --- |
| CI `push` to `main` (post-merge) | self-hosted `macOS` / `X64` |
| Production deployment on `main` | self-hosted `macOS` / `X64` |
| CI `pull_request` (including forks and same-repository PRs) | GitHub-hosted Ubuntu |
| CI `push` to `copilot/**` | GitHub-hosted Ubuntu |
| Preview, preview smoke, Lighthouse, PR cleanup | GitHub-hosted Ubuntu |

The selection uses built-in labels `self-hosted`, `macOS`, and `X64`.
Verify that all three are attached to the Intel iMac in **Settings → Actions → Runners**.
The runner needs to be **Online** and should run under a dedicated non-admin macOS account.
A runner on the machine will not receive jobs until these workflow changes are merged.

## ⚠ Critical: YAML guards are not a hard security boundary for a public repository

**Do not treat this PR as providing complete protection against fork PRs.**
GitHub `pull_request` workflows can use the PR's modified workflow YAML. A malicious
fork PR may replace `runs-on` or add another workflow targeting a self-hosted runner.
Approval policies and `if:` guards in the same public repository are not sufficient
to guarantee that untrusted jobs never execute on a repository-scoped runner.

**For the requested strict isolation, relocate the runner outside the public repo
before merging this PR or allowing external PR Actions runs:**

1. Create a **private** repository dedicated to trusted CI / deployment orchestration,
   or move the project under a GitHub organization with an organization runner group
   restricted to selected workflows on `refs/heads/main`.
2. Remove the runner registration from this public repository and re-register it
   exclusively with that private repository / tightly restricted runner group.
3. Run the trusted main-branch build/deployment only from the protected private
   workflow (checking out the public repository at a verified main-branch SHA).
   Keep fork PR testing on GitHub-hosted ephemeral runners.
4. Require reviews for changes to `.github/workflows/**`, protect `main`, and use
   the strictest available public-fork Action approval policy. These are *additional*
   controls, **not substitutes** for runner isolation.
5. Keep deployment credentials scoped to trusted jobs, rotate credentials after any
   suspected compromise, and do not share the macOS runner account with daily use.

The currently proposed YAML is an **interim routing change** and is **not safe to
merge when hard fork isolation is a requirement** without implementing the
repository/group isolation above.

## macOS runtime compatibility

- `deploy.yml` uses Node.js instead of GNU `sed -i` to write the Wrangler config.
- A Git checkout token is removed from local Git configuration before running code.
- Keep the runner and Xcode command-line tools up to date; ensure `bash`, `git`,
  `node` (installed by actions/setup-node), and the runner service work under a
  dedicated account.
- Be aware that self-hosted runners **do not provide ephemeral isolation**.
  Clear the work directory between trusted jobs or use a disposable VM for builds.
- Validate runner labels, dependency installation, CI checks, production deployment,
  and any D1 migrations separately before relying on the change.
