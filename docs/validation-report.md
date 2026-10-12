# Local engineering validation

The initial implementation results below are retained as historical evidence.
For the later single-service hosting preparation, **103 RSpec examples and
47 frontend tests passed**, along with local HTTPS production-browser checks.
See [hosting-validation.md](hosting-validation.md) for commands, fixes, and
the prerequisites still blocking public deployment.

Validated in the selected Linux cloud workspace on **2026-10-12**. These results
describe actual command execution against the implemented working tree. They
do not establish a remote CI pass, a public deployment, independent candidate
proficiency, or successful live SerpApi searches.

## Environment and scope

Only `/workspace/searchscope` was changed. The initial checkout contained a
README and MIT license, at commit
`fbcbae5989ca10040ee462f3e1c14af833f174da`. Existing portfolio repositories
were inspected read-only in separate temporary checkouts; AqZhol was not changed.
During the implementation phase, no source was pushed and no application email
was sent. The later authorized GitHub publication is recorded in
[publication-report.md](publication-report.md); it does not imply deployment.

| Tool | Observed version / availability |
| --- | --- |
| Host Node.js / npm | 24.19.0 / 11.9.0 |
| Docker / Compose | 28.4.0 / 2.40.3 |
| Host Ruby / Rails | Not installed; backend commands run in Docker |
| Container Ruby / Bundler | 3.4.11 / 2.6.9 |
| Rails / Mongoid | 8.1.4 / 9.1.1 |
| Running MongoDB | 8.0.32, from the `mongo:8.0` image |
| React / TypeScript | 19.3.0 / 6.0.3 |
| Vite / Vitest | 8.3.4 / 5.0.4 |

Rails and Mongoid were booted together, with real MongoDB persistence and
index creation. TypeScript 6 satisfies the linting toolchain's supported peer
range. Versions are recorded in lockfiles and Dockerfiles; the MongoDB minor
image tag can resolve to later compatible patch releases.

## Completed checks

The final `bin/test` execution exited **0**. Its suites and the separately
executed checks produced the following results:

| Check | Observed result |
| --- | --- |
| Backend RSpec with MongoDB | **79 examples, 0 failures** |
| Test database readiness | `MongoDB ping OK (test)` |
| Frontend Vitest | **47 tests passed**, 7 test files |
| TypeScript and Vite production build | Passed; output written inside the disposable container's `/tmp` |
| RuboCop | **56 files inspected, no offenses** |
| ESLint | Passed with `--max-warnings 0` |
| Prettier | All matched frontend files passed |
| Rails Zeitwerk eager loading | `All is good!` |
| Brakeman 8.1.0 | **79 checks, 0 warnings, 0 errors** |
| Ruby dependency advisory check | No known vulnerabilities in the locked dependencies at the advisory snapshot below |
| npm audit | **0 vulnerabilities** across all reported severities |
| Browser smoke | **8 check groups passed**, 10 CSRF/Origin writes, 0 uncaught browser exceptions |
| Setup and startup repetition | `bin/setup` and `bin/start` succeeded again; database volume retained |
| Production Dockerfiles | Backend and frontend images built locally; no image published |
| Git whitespace check | `git diff --check` passed |
| Proposed release secret scan | No matched private-key, GitHub-token, AWS-key, or long secret-assignment patterns in text entries of the 145-file release list; no unexpected `.env` file |
| Database log privacy probe | Real test-database write/read/delete with Rails DEBUG enabled; no driver debug lines, probe email, query, or password appeared in captured output |

The secret check covered the current tracked/proposed release files, excluding
binary CVs and screenshots from text pattern matching. This is a conservative
current-tree check, not a full Git-history credential audit or proof that every
possible secret format would be detected. Ignored caches, logs, build outputs,
and local credentials are not part of that release list.

The browser test used real registration, encrypted cookie sessions, MongoDB
records, search endpoints, comparisons, filtered history/details, analytics,
confirmed deletion, invalid/valid login, and logout. It ran at desktop and
390-pixel mobile widths, checked the keyboard skip link, and captured eight
[actual screenshots](screenshots/README.md). It asserted demo mode before
submitting searches and removed its own search records. Unique smoke accounts
remain in the development database; existing user data was not reset.

Backend tests cover request validation, CSRF, authentication, logout/session
invalidation, owner isolation, pagination, expiration, persistence, structured
provider errors, response normalization, deadlines/body limits, throttling path
aliases, and atomic daily budget reservations. A concurrency check verifies
that ten reservations against a limit of three allow exactly three. WebMock
blocks real external provider calls in the backend test suite.

## Reproduce the checks

Run from the repository root in **macOS Terminal** or the **Codex terminal**.
The cloud used `DOCKER_CONFIG=/workspace/.cache/searchscope-docker` because its
default Docker client directory was not writable.

```sh
export DOCKER_CONFIG=/workspace/.cache/searchscope-docker # Cloud only
./bin/setup
SEARCH_PROVIDER=demo ./bin/start
./bin/test
./bin/compose run --rm --no-deps backend bundle exec rubocop
./bin/compose run --rm --no-deps backend bundle exec brakeman --no-pager --exit-on-warn --exit-on-error
./bin/compose run --rm --no-deps backend bundle exec rails zeitwerk:check
./bin/compose run --rm --no-deps frontend npm run lint
./bin/compose run --rm --no-deps frontend npm run format:check
git diff --check
```

The final frontend source also passed host-installed `npm test`, `npm run lint`,
`npm run format:check`, and `npm run build -- --outDir
/tmp/searchscope-frontend-final-build`. Container builds now write test outputs
to `/tmp/searchscope-build`, avoiding ownership changes in the mounted checkout.

The Ruby advisory database was obtained from the public
`rubysec/ruby-advisory-db` repository at commit
`a6847b0651a702488f5844081e848dd1ec9dbf1d`
(commit timestamp `2026-10-10T09:26:59-04:00`). The executed check mounted that
snapshot read-only and ran:

```sh
./bin/compose run --rm --no-deps \
  -v /tmp/searchscope-ruby-advisory-db:/tmp/advisories:ro \
  backend bundle exec bundle-audit check --database /tmp/advisories
```

For a fresh check, `bundle-audit check --update` fetches the current advisory
database; it requires network access. The npm audit was actually executed
against `frontend/package-lock.json`. Neither audit proves that no unknown
vulnerabilities exist. Container operating-system packages were not scanned.

To reproduce the browser smoke, start the demo stack and run in `frontend/`:

```sh
node scripts/browser-smoke.mjs
```

The existing cloud Chromium/Playwright installation was used. See the
[screenshot instructions](screenshots/README.md) for browser path overrides
and cleanup behavior.

## Runtime and production smoke evidence

Local health and session requests returned HTTP 200, both directly and through
the frontend proxy. A non-billed, credential-free HTTPS **HEAD request to the
SerpApi homepage** returned 200 from the backend container. This verifies
network/TLS connectivity to that host, not the search API, key, or quota.

The backend production image `searchscope-backend-production:local`
(`bbdf0306b6ad0af52dab4721bec00e86d033ed8d163f987cb1e0d26bc37fb3fc`)
was started locally with an ephemeral runtime Rails secret, an explicit
localhost allowlist, demo mode, and a separate
`searchscope_production_smoke` database. The running image used JSON 2.21.2,
created indexes, and passed a database ping. Health and session bootstrap
returned HTTP 200 using a simulated trusted TLS proxy header; the session
cookie had **Secure, HttpOnly, and SameSite=Lax** attributes. Runtime UID 10001
and the independent WARN database logger were also verified. The task-owned
temporary container was then stopped and removed without deleting the database
volume. This did not provide a real TLS terminator,
authenticated production database, external deployment, or AWS execution.

The final frontend image `searchscope-frontend-production:local`
(`5aef3d36e10bd7e5bbf22f288d6cd849bb48a550453369a64e2835e7fd588133`)
built from the final source and runs as UID/GID `101:101`. The following
configuration check exited 0 on the development service network:

```sh
docker run --rm --network searchscope_default --entrypoint nginx \
  searchscope-frontend-production:local -t
```

Production images run as unprivileged users and omit backend test/development
gems. Nginx configuration validation is a local packaging check; production
proxy trust and external HTTPS still need deployment-specific validation.

## Failures investigated and corrected

- The cloud HTTPS proxy required its existing CA bundle inside containers and
  a resolvable proxy host during builds. The Compose wrapper supplies optional
  trust mounts and host resolution. TLS verification was kept enabled.
- The Ruby compact index returned HTTP 403. Initial dependency bootstrapping
  used public RubyGems metadata and artifacts with official SHA-256 checks;
  frozen lockfile builds subsequently succeeded. A platform-specific checksum
  mismatch was resolved by requesting metadata for the correct Ruby platform,
  rather than accepting a different checksum.
- The initial JSON dependency triggered advisory **CVE-2026-54696**. It was
  upgraded to 2.21.2 with a maintained minimum constraint, then the audit and
  relevant tests were rerun successfully.
- Browser CSRF checks exposed a changed Host in the Vite proxy. Preserving the
  browser Host restored same-origin form requests. A BSON exception namespace
  and an incompatible structured logger were also corrected and retested.
- A final readiness check exposed MongoDB driver debug command logging in
  development. Mongoid and the driver now have a separate JSON logger at WARN,
  independent of Rails verbosity. A real test-database roundtrip with Rails
  DEBUG enabled produced no command details or private probe values; all 79
  RSpec examples, RuboCop, and Brakeman passed again after the change.
- Security review found throttle bypasses through format/trailing-slash route
  aliases. Path normalization and request tests now cover those variants.
  Proxy-aware login IPs and per-user search buckets avoid sharing a browser
  account's search limit with other accounts behind one proxy.
- In-flight searches have an unknown duration. Nullable typing and safe
  history/detail rendering now cover that state. Comparison cards were aligned
  with the backend's shared-result contract and verified in the browser.
- Docker-generated frontend build outputs had incompatible host ownership.
  `bin/test` now builds in the disposable container's `/tmp`. Final builds
  succeeded without changing ownership of source files. `bin/setup` also
  refreshes the retained frontend dependency volume with `npm ci`, so a rebuilt
  image cannot leave an existing checkout using an older lockfile's packages.
- Image builds exhausted the cloud root disk. Only task-generated, reproducible
  build/package caches were removed. Source files, running development services,
  and MongoDB volumes were retained; setup/start/test were repeated successfully.
- The initial final-image smoke harness aborted on a connection reset during
  readiness polling. Its polling now handles transient startup connection
  failures; the subsequent run passed all production runtime assertions.

These corrections are supported by executed checks. Initial failed attempts
were not counted as successful validation.

## Unverified or intentionally deferred

- **Live SerpApi search:** no usable key or explicit approval for a billed
  request was supplied. Demo behavior and mocked adapter tests are verified;
  real search success is not.
- **Remote CI:** publication triggered a real GitHub Actions run. Observed
  remote outcomes are recorded separately in [publication-report.md](publication-report.md);
  local test counts above are not inferred from workflow configuration.
- **Deployment/application:** source publication is verified, but no image
  registry publication, production deployment, AWS operation, or application
  email was performed.
- **Commit attribution:** Eldar confirmed `Eldar Smagulov <1980sdm@gmail.com>`;
  release commits use that project-local identity and preserve earlier history.
- **Application contacts:** the confirmed email is included in the regenerated
  PDF/DOCX. Optional phone and expected graduation year remain unknown and omitted.
- **CV verification:** the generated PDF has one page with extractable text
  and was visually inspected; DOCX opens and contains the intended content.
  Pagination in Microsoft Word was not checked.
- **Scale and operations:** no load test, distributed limiter, backup restore,
  external monitoring, full accessibility audit, OS image vulnerability scan,
  or independent penetration test was performed.
- **Environment restoration:** the current instance's setup/start checks
  passed. Saved environment configuration is a reviewable draft; publication
  and restoration in a fresh task have not been independently verified.

Use the [release checklist](release-checklist.md) to complete the pending steps
without turning these local results into unsupported career claims.

## Saved cloud environment setup

The `cloud-environment-onboarding:setup` workflow saved a confirmed configuration
draft with a complete `install_script`, `start_skill`, and a suggested
`SEARCH_PROVIDER=demo` runtime variable. The installation uses the tested
`bin/setup`; startup instructions use the existing isolated checkout,
`bin/start`, local health/session requests, and a MongoDB ping. The previously
saved optional `SERPAPI_API_KEY` requirement remains backend-only, with
`serpapi.com` as its allowed destination. Existing repository/network settings
were preserved.

Saving the draft did not apply it or publish an environment snapshot. In the
**cloud environment settings**, review and save the draft, then publish the
environment when desired. The implemented source is now publicly available in
the GitHub repository. Publishing source and publishing an environment snapshot
are separate actions; fresh-task environment restoration has not been validated.
