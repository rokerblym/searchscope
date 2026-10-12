# Release and application checklist

The application is locally implemented, tested, and published in the public
[SearchScope repository](https://github.com/rokerblym/searchscope) with the
owner's explicit approval. See [publication-report.md](publication-report.md)
for verified source and CI evidence. Deployment and application submission
remain separate actions.

## Review the implementation

1. In **VS Code**, read `README.md`, `IMPLEMENTATION_PLAN.md`, the OpenAPI
   contract, security notes, and `docs/validation-report.md`.
2. In **macOS Terminal** or the **Codex terminal**, run `./bin/setup`, start
   the stack with `SEARCH_PROVIDER=demo ./bin/start`, and run `./bin/test`.
   Use only the dedicated test database for automated cleanup.
3. In **Browser**, register a local account, run two demo searches, compare
   them, inspect history and analytics, delete a snapshot, and sign out.
4. Review `.gitignore`, the untracked file list, and secret-scan findings.
   Keep `.env`, credentials, development logs, database volumes, dependency
   caches, and build outputs outside the Git history.

## Establish truthful commit attribution

Eldar confirmed the project-local Git author as
`Eldar Smagulov <1980sdm@gmail.com>` and explicitly authorized repository
publication. The release uses that identity without changing global Git
configuration or rewriting earlier authors. Do not backdate commits or
fabricate activity.

The release groups the implemented work into meaningful commits:

- `feat: add authenticated Rails search API and MongoDB persistence`
- `feat: implement React search and analytics dashboard`
- `build: add Docker development tools and GitHub Actions`
- `docs: document architecture, validation and application portfolio`

Review each staged group before committing. Keep tests beside the behavior
they verify. Preserve the existing MIT license and the initial repository
history. Do not reset, overwrite another repository, or force-push.

## Verify the optional real provider

1. In **cloud environment settings** or the ignored local `.env`, supply
   `SERPAPI_API_KEY` securely. Never provide the key in chat, source, a build
   argument, or frontend configuration.
2. Obtain explicit approval for a specific potentially billed search before
   an agent submits it. A key alone is not approval to spend credits.
3. Set `SEARCH_PROVIDER=serpapi`, restart the backend, and submit only the
   approved request. Record sanitized status, measured duration, normalized
   result behavior, and any failure. Restore demo mode for ordinary smoke tests.
4. Update the validation report only from the observed outcome. Mocked provider
   tests and a homepage connectivity check do not prove live search success.

## Publish and deploy only after owner approval

Eldar explicitly authorized this release. The reviewed commits were pushed as
a fast-forward of the existing `main` branch, and anonymous public requests
verified the source archive against the local Git objects. Existing history
was preserved. Further releases should retain the same secret review and
verification discipline. Inspect actual GitHub Actions outcomes rather than
inferring a pass from the workflow file.

Review `docs/deployment.md` before any deployment. Production requires TLS,
runtime secrets, authenticated MongoDB, a trusted proxy policy, shared request
limits where applicable, backups, and monitoring. Deployment is a separate
approval-gated action; the local production image smoke check is not a public
deployment or AWS experience.

## Finish the job application

1. The confirmed email is `1980sdm@gmail.com`. Eldar may add an optional
   telephone number and expected graduation year if known; those values are
   omitted rather than guessed.
2. In **VS Code**, review `application/cv-content.md`, the project claims, and
   the explanation of assisted implementation in `application/claim-evidence.md`.
   Practice explaining the project using the interview document.
3. In **macOS Terminal** or the **Codex terminal**, regenerate the CV after
   factual edits. In **Browser** or a PDF viewer, inspect the one-page PDF;
   inspect DOCX pagination in Word or another compatible editor.
4. The verified source URL is included in `application/cover-email.md`. In
   **GitHub**, review proposed profile/pin edits separately; existing portfolio
   repositories have not been modified.
5. Send the final email to `careers@serpapi.com` only after Eldar approves the
   exact text and attachments. No email has been sent by this task.
