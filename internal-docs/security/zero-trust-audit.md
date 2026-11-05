# Zero-trust security audit — 2026-11-05

Scope: `soranjiro/tabitabi` (main), API/Workers, Cloudflare Pages, GitHub Actions.
Principles: explicitly verify, least privilege, assume breach. The public website and
shared view-only snapshots must remain accessible without Cloudflare Access login.

## Findings / decisions

| Priority | Finding | Current action |
| --- | --- | --- |
| P0 | An itinerary without a password is editable by anyone who knows its ID. Authorization is conditional on `itinerary.password` in itineraries, steps, packing, money, members and backgrounds. `POST /auth/password` can issue a signed edit token without a password for these itineraries. | **Not silently changed**: existing URL-based collaboration relies on this model. Treat the ID as an edit-capable secret until explicit capability/role migration; do not publish editable IDs. |
| P0 | Preview workflow executes PR-controlled dependency and build code on the same runner that later receives `CLOUDFLARE_API_TOKEN`, and uses the production token in previews. A same-repository PR could persist a background process and steal the credential. Fork previews are restricted, but that is not a complete trust boundary. | Require a dedicated least-privilege preview token, split build/test and deploy onto independent runners/jobs, configure protected `preview` environment with manual approval, and pin trusted deploy tooling before enabling additional PR contributors. Avoid changing to a missing secret without provisioning it. |
| P1 | Anonymous user discovery and itinerary feed/list endpoints have no dedicated GET budget. The existing write guard protects write endpoints only. | Add D1-backed per-edge-IP caps, 120/min for user search/feed and 60/min for snapshot listing. Retain access without login. |
| P1 | API responses that may contain tokens, account information or itinerary content have no blanket `no-store` directive. | Set `Cache-Control: private, no-store` plus content-type sniffing/referrer protections on all `/api/v1/*` responses. |
| P1 | The Cloudflare account containing the `tabitabi` Pages project reports Cloudflare Access as not enabled. A managed free ruleset is listed, but its enforcement status was not verified. | **Do not enable Access for the whole public site.** Consider Access for a separately hosted operations/admin surface only; verify WAF and bot controls where the hostname is covered. |
| P2 | Protected itinerary JWTs last 30 days, and user editor grants are persistent. | Design revocation and short-lived scoped capabilities before shortening TTL; abrupt expiry would disrupt existing editors. |

## Follow-up rollout (requires owner configuration)

1. **Permissions:** create separate Cloudflare API tokens for production and previews. Grant only necessary Workers/Pages/D1 resources and operations. Rotate the current shared deployment token **after** CI switches to segregated credentials. Restrict GitHub repository environments and protect the main branch.
2. **Preview trust boundary:** split untrusted checkout/build from secret-bearing deployment into separate jobs, transfer immutable build artifacts, install deployment tooling only from trusted workflow definitions, and require approval before privileged preview deployment. Verify preview Workers cannot access production D1, secrets or account-wide resources.
3. **Itinerary access migration:** introduce separate view/edit capability links, scoped authorization checked on **every** mutation, a logged-in user-to-itinerary grant, and capability revocation. Support a compatibility/upgrade path for existing passwordless itineraries rather than silently denying edits.
4. **Admin-only Zero Trust:** if an operations dashboard is introduced, protect its **dedicated hostname** with Cloudflare Access policy (explicit users/groups, MFA, short session); keep Pages site, public read API, ordinary Firebase login, and shared itinerary URLs public.
5. **Verification:** integration tests for authenticated and unauthenticated read/write paths, snapshot immutability, secret-step masking, rate limit 429, no-store headers; CI tests and preview smoke before merging. Check that changes don't interfere with passkey origin verification.
6. **Monitoring:** monitor 401/403/429 rates and abnormal enumeration by endpoint without logging bearer tokens, passkey challenges, itinerary URLs or secrets.

Note: CORS is a browser isolation mechanism, **not** API authorization; WAF/Access
cannot replace resource-level checks at the Worker. Never trust `X-Forwarded-For`
from the client for rate limits.
