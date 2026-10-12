# Hosting preparation: executed validation and blockers

Checked on **2026-10-12**. The public source repository exists; **a public
application deployment has not been completed or verified**. No live
application URL is available. No external hosting resource, payment method,
charge, or paid SerpApi request was created by this task.

## Preserved application and added deployment path

The existing Rails API, React/TypeScript client, MongoDB models, authentication,
provider adapters, six pages, tests, screenshots, and Git history were retained.
The new root Dockerfile builds the client and serves its assets from the Rails
process. The separate Rails/nginx production images remain supported.

Added files include the root Dockerfile and `.dockerignore`, `render.yaml`,
the port-aware health helper, frontend-hosting and exact-hostname policies,
their regression tests, and [free-deployment.md](free-deployment.md). API
controllers explicitly enforce the Origin check. Unknown API paths now return
a safe structured JSON 404; missing static files remain ordinary 404s. CI adds
a combined-image build and enables the hosting policy for backend checks.

## Commands and observed local results

All automated provider calls were mocked. Browser searches used the clearly
labelled synthetic demo provider. RSpec cleanup targeted only `searchscope_test`;
production-mode smoke work used the separate `searchscope_hosted_smoke` database.

| Executed check | Observed result |
| --- | --- |
| `bin/test` before the final API-404 regressions | 99 RSpec examples, 0 failures; MongoDB ping passed; 47 Vitest tests in 7 files passed; TypeScript/Vite build passed |
| Final full RSpec after API-404 changes, with `SERVE_FRONTEND=true` | **103 examples, 0 failures**, seed 14833 |
| RuboCop | **63 files, no offenses** |
| Brakeman with `--exit-on-warn --exit-on-error` | **0 warnings, 0 errors** |
| Rails `zeitwerk:check` | Passed; application eager-loaded |
| Frontend ESLint and Prettier | Passed |
| `npm audit` | 0 reported vulnerabilities |
| `bundle-audit check --update` | No reported vulnerabilities; advisory commit `a6847b0651a702488f5844081e848dd1ec9dbf1d` |
| Root production Docker build | Passed; production-only gems and built frontend, unprivileged `searchscope:searchscope` user |
| Production-mode container health and MongoDB ping | Passed with `PORT=10000` |
| Local YAML/manifest assertions | Passed: one Free Docker service, demo provider, generated Rails secret, runtime-only database URI; no paid service/database/disk declaration |
| Local HTTPS Chromium workflow | 8 groups across all 6 pages passed, 10 CSRF/Origin browser writes, 0 uncaught exceptions; Secure/HttpOnly/SameSite=Lax authenticated cookie confirmed |
| Test-account persistence after replacing the application container | Account count and SHA-256 of its ID set unchanged; MongoDB volume preserved |

Final backend command, **macOS Terminal / Codex terminal, repository root**:

```sh
./bin/compose run --rm --no-deps \
  -e RAILS_ENV=test -e SERVE_FRONTEND=true \
  -e MONGODB_URI=mongodb://mongodb:27017/searchscope_test \
  backend bundle exec rspec
```

The combined local image ID is
`sha256:503bea80cc7c683f9fcf77a70d60d88d8cfadbb7ed74e7718e5fc315a9724812`.
Builds used the environment's authoritative CA bundle via BuildKit's optional
`cloud_ca` secret and configured proxy arguments; TLS verification remained
enabled. The resulting application image does not contain these build secrets
or an application API key.

## Browser verification scope

A temporary nginx gateway forwarded every request to the combined production
container on a private Docker network. A generated local CA and localhost leaf
certificate were verified with OpenSSL; Node trusted that CA, and Chromium
trusted only that generated certificate's public-key fingerprint. This is a
local test setup, not an externally trusted public certificate or provider
deployment. Its private key, reports, and eight new captures stayed under
`/tmp`; existing repository screenshots were unchanged.

The browser exercised registration, Google/Bing demo search, history filtering
and detail, snapshot comparison, persisted analytics, monitoring, settings,
mobile layout, confirmed deletion, logout, rejected login, and accepted login.
The harness deletes its own search records; its fictional test accounts remain
in the isolated smoke database. It does not reset existing application data.

Checks also cover same-origin static/API delivery, CSP and other security
headers, API `no-store`, HTML `no-cache`, hashed-asset caching, missing routes,
and rejection of absent CSRF tokens and valid-token foreign-Origin requests.
Puma can reject oversized requests before Rack; its response is a plain 413,
while Rack's bounded-input rejection uses the application JSON error format.

## Failures investigated and corrected

- The first host-policy implementation used a two-argument merge incompatible
  with Rack 3 headers. The backend suite caught it; merging a single policy hash
  fixed the failure.
- A fresh MongoDB index build hit the server's free-space/reservation guard.
  Obsolete task-owned images/build caches were cleaned without deleting volumes
  or source. A fresh test database then created indexes successfully. The
  guard and required unique/TTL indexes were preserved.
- Local HTTPS testing found the framework's Origin setting was not inherited
  by the API controller. Enabling it explicitly and adding foreign/same-origin
  regressions fixed the gap. Browser rejection was then confirmed.
- Unknown API routes initially returned Rails' HTML error page. A final ordered
  API-only fallback now returns the documented JSON shape without authenticating
  users, modifying data, or masking missing static assets.
- The first advisory update failed because Git did not automatically use Ruby's
  configured CA bundle. Passing the mounted bundle as `GIT_SSL_CAINFO` fixed
  the update; certificate verification stayed enabled.

## Remaining external prerequisites

1. An authenticated Render account/API binding and an Atlas Free cluster with
   dedicated database credentials, TLS, and restricted network access.
2. Confirmation in the actual hosting account that its current Docker Free
   plan, builds, bandwidth, billing settings, and overages incur no charges.
   A manifest's `plan: free` alone does not prove the current contract.
3. Provider API/network access: the current proxy rejected direct Render and
   Atlas control-plane/documentation requests with CONNECT 403. A cloud
   configuration draft adds relevant domains and an optional `RENDER_API_KEY`
   requirement, but contains no credential and has not been applied/published.
4. Authenticated provider-side Blueprint validation, actual provisioning, and
   public HTTPS/browser/Atlas persistence checks against the assigned hostname.

The [free setup guide](free-deployment.md) specifies where to perform each
action. Secrets must enter the secure provider/cloud forms, never chat or Git.
No predicted live URL is placed in README or application materials. CV and
cover-email claims describe implemented software and verified source/CI; they
do not claim a public deployment, AWS experience, paid provider verification,
commercial employment, or independent mastery from generated code.

The original [validation report](validation-report.md) retains the initial
79/47 evidence. The [publication report](publication-report.md) records earlier
remote CI outcomes; the new hosting workflow's observed result is recorded below.

## Public source verification for this preparation

Hosting preparation was pushed as a fast-forward to `main` at
[`81b1b84e005b0b11290399d8bff8586593ba77c0`](https://github.com/rokerblym/searchscope/commit/81b1b84e005b0b11290399d8bff8586593ba77c0).
The anonymous repository page and commit archive both returned HTTP 200.
All **158 file blobs** matched the reviewed Git objects; all **eight executable
file modes** were preserved, and remote `main` matched the commit. This verifies
public source publication, not application hosting.

[GitHub Actions run 38290564685](https://github.com/rokerblym/searchscope/actions/runs/38290564685)
for that exact full commit **completed successfully**. The public run page
showed all five jobs successful: backend, frontend, combined hosted-image,
and separate backend/frontend production images. Detailed logs require sign-in;
the 103/47 test counts above come from executed local checks. Successful image
builds do not mean images were published or hosting resources were deployed.
