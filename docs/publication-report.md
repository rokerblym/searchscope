# Verified GitHub publication

Published with Eldar Smagulov's explicit authorization on **2026-10-12**.

- Repository: <https://github.com/rokerblym/searchscope>
- Visibility: **public**, verified without GitHub credentials.
- Default branch: `main`.
- First complete implementation commit:
  [`2a48ffbe15b1c82364742c14328d1c4ded77f467`](https://github.com/rokerblym/searchscope/commit/2a48ffbe15b1c82364742c14328d1c4ded77f467).
- Release author/committer: `Eldar Smagulov <1980sdm@gmail.com>`.

## What was uploaded and checked

The checkout contained **144 changed files**, rather than the estimated 59.
The review covered the entire release tree, including 67 backend files, 38
frontend files, infrastructure, documentation, application materials, and all
eight PNG captures. Source review and credential-pattern scans found no real
API keys, private keys, access tokens, or unintended credential-bearing data.
Test passwords and response fixtures are synthetic. Candidate name, email,
GitHub and LinkedIn links are intentionally public application information.
Local `.env` files, Rails keys, logs, database volumes, dependency directories,
and build outputs were excluded.

Four meaningful commits separated backend, frontend, infrastructure/CI, and
documentation/application work. The existing initial commit
`fbcbae5989ca10040ee462f3e1c14af833f174da` and MIT license were preserved.
The push to `main` succeeded as a fast-forward; no force push was used.

Verification of the first complete implementation commit:

1. `git ls-remote --heads origin main` returned the published commit SHA.
2. An anonymous repository-page request returned HTTP 200, with GitHub metadata
   identifying `rokerblym/searchscope` and public visibility.
3. An anonymous source-archive request to
   `https://codeload.github.com/rokerblym/searchscope/zip/2a48ffbe15b1c82364742c14328d1c4ded77f467`
   returned HTTP 200 and a valid ZIP archive.
4. All **145 published files** matched the commit's Git blob hashes, including
   source, lockfiles, workflow, OpenAPI, architecture docs, screenshots, and CVs.

A following documentation/contact update records the verified publication and
regenerates the CV with the confirmed email and public repository URL. Verify
the latest `main` SHA separately; this report intentionally records the first
complete implementation commit rather than attempting to embed its own SHA.

## Continuous integration and tests

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs backend RSpec
with MongoDB, Ruby lint/static/dependency checks, frontend tests/lint/format/
TypeScript build checks, and both production image builds. Ordinary tests mock
SerpApi and do not consume paid API credits.

GitHub discovered and triggered the workflow for the exact implementation SHA:
[CI run 38276314729](https://github.com/rokerblym/searchscope/actions/runs/38276314729)
**completed successfully**, verified through the anonymous run page for that
exact commit. Backend, frontend, and both production-image jobs completed
successfully. The run was initially observed in progress and refreshed until
the overall result was confirmed. Public job status is readable; detailed logs
require GitHub sign-in, so exact remote test counts are not invented from them.
The [Actions page](https://github.com/rokerblym/searchscope/actions) is the source
for later run status, including the following documentation-only release update.

The successful run also emitted non-fatal maintenance annotations about older
action runtimes being executed under Node 24 and the scheduled `ubuntu-latest`
runner-image migration. They did not fail any job. Review maintained action
versions and an explicit runner image in a separate maintenance change, with
another actual CI run; the tested workflow was retained for this publication.

Existing executed local evidence remains **79 RSpec examples with zero
failures**, **47 frontend tests passing**, eight browser check groups, successful
lint/build checks, and clean recorded static/dependency checks. See
[validation-report.md](validation-report.md) for exact commands and limitations.

## Access and scope limits

The cloud proxy rejects CONNECT requests to `api.github.com` with HTTP 403.
That restriction affects GitHub REST/CLI API queries, not the verified Git
push or public GitHub/source-archive requests. No additional GitHub connection
was needed for publication, and no authentication token was copied into files.

This release publishes source code, documentation, screenshots and application
drafts. It does not deploy a web service, publish images, perform an AWS
operation, make a paid SerpApi request, modify other portfolio repositories,
or send the application email. Those actions require separate authorization.
