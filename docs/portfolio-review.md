# GitHub portfolio review

Reviewed on 2026-10-12 for Eldar Smagulov's SerpApi Junior Fullstack Engineer application.

## Scope and evidence

This was a read-only source review. The GitHub REST repository-list request returned `Forbidden`. Existing HTTPS Git authentication allowed read-only access to the four repositories below. Shallow snapshots were placed under `/tmp/searchscope-portfolio-review`; no changes were made to those projects and none of their code was executed.

The review does not establish that a repository is public to an unauthenticated hiring reviewer. Before applying, open the chosen links in a private browser window and confirm accessibility. Commit links below identify the exact source inspected; they are evidence references, not claims about contribution frequency or employment.

| Repository | Reviewed revision | What the source demonstrates |
| --- | --- | --- |
| [cyberlearn-api](https://github.com/rokerblym/cyberlearn-api) | [`41c855a`](https://github.com/rokerblym/cyberlearn-api/tree/41c855a6fb7ae55611066353856c430198bc0dff) | A small FastAPI application with question listing, question lookup, quiz scoring, Pydantic request models and a health endpoint. |
| [shopify-rag-assistant](https://github.com/rokerblym/shopify-rag-assistant) | [`2cc20a4`](https://github.com/rokerblym/shopify-rag-assistant/tree/2cc20a4efeb7460618028ad966d2bde1b914cde6) | A FastAPI `/ask` endpoint using Sentence Transformers and FAISS to retrieve from five local sample policy documents. |
| [sentinel-log-analyzer](https://github.com/rokerblym/sentinel-log-analyzer) | [`927fb5e`](https://github.com/rokerblym/sentinel-log-analyzer/tree/927fb5ebb7b56ceb01a1f9490fad81f43d0e06a5) | A Python CLI that extracts failed-login IPv4 strings, counts occurrences, applies thresholds and writes a JSON alert report. |
| [file-integrity-monitor](https://github.com/rokerblym/file-integrity-monitor) | [`7581fb7`](https://github.com/rokerblym/file-integrity-monitor/tree/7581fb7ff3bdf8ea1222d346711d2d71adc4ca1a) | A Python CLI with chunked SHA-256 hashing, JSON baselines and modified/new/deleted file comparison. |

Exact-name Git reads for `rokerblym/AqZhol` and `rokerblym/SafeRoute` returned `Repository not found`. This may mean a different name, a private repository or unavailable access. It does not establish that the project does not exist. The candidate describes this as the main personal project, using Python, FastAPI, mapping API integrations and route calculations. Those details remain candidate-provided, not independently reviewed. Supply its exact repository URL before making stronger evidence claims. Do not modify AqZhol without separate permission.

SearchScope is being implemented in its separate checkout. Its existing remote repository was initially a README and license; local implementation must be reviewed and explicitly approved for publication before its remote link is described as a completed portfolio example. See the project's final validation report for executed checks.

## Strongest evidence for the application

Of the four reviewed repositories, **cyberlearn-api** is the clearest small API example: endpoint behavior is easy to inspect, the README has setup and request examples, and the source contains a real missing-question `404` branch. **shopify-rag-assistant** shows an additional integration and retrieval workflow, but reproducibility and naming need attention before it is a stronger centerpiece. The two security CLIs support the cybersecurity background and provide useful interview material about correctness and failure modes.

A tested SearchScope release would be the most directly relevant SerpApi example because it uses the target backend language and addresses external API failure handling. This is a recommendation contingent on actual validation and publication, not an assertion that the work is already remotely available.

## Verified gaps and suggested improvements

No automated test files, GitHub Actions workflows, Docker files or license files were present in any of the four reviewed current file trees. This review did not inspect historical commits or remote CI runs. The projects' README examples are documentation, not executed test evidence. Do not add passing badges without an actual corresponding workflow run.

### CyberLearn API

Evidence: [`app/main.py`](https://github.com/rokerblym/cyberlearn-api/blob/41c855a6fb7ae55611066353856c430198bc0dff/app/main.py), [`requirements.txt`](https://github.com/rokerblym/cyberlearn-api/blob/41c855a6fb7ae55611066353856c430198bc0dff/requirements.txt).

- `Answer` accepts any integer for `selected_answer`. `QuizSubmission` has no list-length bounds or duplicate-question rule. Unknown question IDs are silently skipped. Add explicit validation and tests for invalid choices, duplicates, empty submissions and unknown IDs.
- The percentage uses the number of accepted submitted answers, rather than all quiz questions. One correct answer can produce a 100% score and the strongest awareness label. Document this denominator clearly or change the assessment policy in a separate authorized coding task.
- Questions are an in-memory constant. There is no persistence, authentication or user progress tracking. Describe it as an educational quiz prototype, not a production learning platform.
- Dependency ranges exist, but no lockfile or pinned Python version is present. Add a repeatable dependency resolution method and supported Python version.
- Add response schemas, automated endpoint tests and a short error/validation contract to the README. Keep sample password strings clearly identified as quiz examples rather than real credentials.

### Shopify RAG Support Assistant

Evidence: [`app/rag.py`](https://github.com/rokerblym/shopify-rag-assistant/blob/2cc20a4efeb7460618028ad966d2bde1b914cde6/app/rag.py), [`app/main.py`](https://github.com/rokerblym/shopify-rag-assistant/blob/2cc20a4efeb7460618028ad966d2bde1b914cde6/app/main.py), [`app/data.py`](https://github.com/rokerblym/shopify-rag-assistant/blob/2cc20a4efeb7460618028ad966d2bde1b914cde6/app/data.py).

- The code retrieves static sample policies and returns the best matching text. There is no Shopify API connection or generative language model. Describe it precisely as a semantic retrieval prototype with citations.
- The model is instantiated and the index built at import time. First launch can need a model download, network access and substantial dependencies. Document those requirements and separate application readiness from download/initialization failure.
- `requirements.txt` lists entirely unpinned packages. Add a supported Python version and repeatable versions before promising easy reproduction across machines.
- `question` has no length or nonblank validation. Add bounded input checks and tests for blank queries, malformed requests and irrelevant questions.
- The `high`/`medium`/`low` thresholds are fixed L2-distance heuristics. They are not calibrated probabilities or measured answer accuracy. Explain that distinction and add retrieval evaluation before making quality claims.
- Add tests with a replaceable retriever so ordinary tests do not download a model. Add a separately documented opt-in model integration check.

### Sentinel Log Analyzer

Evidence: [`analyzer.py`](https://github.com/rokerblym/sentinel-log-analyzer/blob/927fb5ebb7b56ceb01a1f9490fad81f43d0e06a5/analyzer.py).

- The regex accepts strings with out-of-range IPv4 octets and does not cover IPv6. Validate addresses with Python's standard `ipaddress` library and document supported log formats.
- The threshold accepts zero or negative values. Validate that it is positive, then test threshold boundary cases and severity transitions.
- The entire input is read with `readlines()`. Streaming lines would make the CLI more appropriate for large logs.
- A missing file prints an error and returns without a nonzero exit status; other read failures are not handled. Provide predictable exit codes and distinguish an empty valid log from an unreadable file.
- Reports store IP addresses and a local-time timestamp without a timezone. Document privacy/retention expectations and use an unambiguous timestamp.
- Add parser fixtures and CLI tests for IPv6, malformed lines, unreadable input and JSON output. These are recommendations; no checks were run here.

### File Integrity Monitor

Evidence: [`monitor.py`](https://github.com/rokerblym/file-integrity-monitor/blob/7581fb7ff3bdf8ea1222d346711d2d71adc4ca1a/monitor.py).

- Hashing is streamed in 4 KiB chunks, an understandable approach that avoids loading each entire file into memory.
- Unreadable files are silently omitted. They can appear as deleted in a later comparison. Report scan errors separately from confirmed deletions and test that distinction.
- A nonexistent scan directory produces an empty result rather than a clear error. Validate the root and test invalid paths.
- Baselines use absolute paths, making them specific to one filesystem location. Document this behavior or deliberately move to paths relative to the scan root.
- A baseline is ordinary writable JSON in the current directory, with no authenticity protection. SHA-256 detects content differences against that baseline; it does not establish that an attacker has not changed the baseline. Document the trust model and file permissions rather than claiming tamper resistance.
- Document how symlinks are treated and whether files outside the chosen root may be followed. Add tests for symlinks, missing/invalid baselines, permission failures and changes during a scan.

## Security review boundaries

A conservative local scan of the four current snapshots looked for private-key headers, common GitHub token patterns, AWS access-key patterns and quoted API-secret/token assignments. It found **zero candidate matches** and did not print credential values. No tracked `.env` was present in the reviewed file lists. This limited scan is not proof that all secrets are absent: repository history, dependencies, binary artifacts and deployment configuration were not audited.

The cybersecurity quiz's password choices are literal teaching examples; the source offers no evidence that they are account credentials. No existing repository was changed, no destructive command was used and no application was run during this review.

Eldar confirmed the project-local Git author as `Eldar Smagulov <1980sdm@gmail.com>` for the SearchScope release. Existing commit attribution is preserved. Do not infer application contact details from another checkout's Git configuration or rewrite earlier authors.

## Pin recommendations

In **GitHub**, after checking visibility and current README quality:

1. Pin SearchScope after its implementation, validation report and approved publication are available.
2. Pin AqZhol / SafeRoute after its exact URL and evidence are reviewed. It is the candidate's stated main project, so give it a clear architecture overview and truthful status.
3. Pin `cyberlearn-api` as the most straightforward reviewed API project.
4. Pin `shopify-rag-assistant` once reproducible setup and the retrieval-only scope are clear.
5. Optionally pin one security CLI, choosing the one with the strongest tests and explanation after improvements.

Do not fill all six pin slots merely to maximize the count. A smaller set of understandable, verifiable projects is easier to evaluate.

## Next portfolio actions

- In **VS Code**, review the local profile draft at `application/github-profile-README.md`; it deliberately avoids claims about paid work, production users, AWS experience or Ruby expertise.
- In **Browser**, supply the exact AqZhol repository URL and verify selected links without authentication.
- In **GitHub**, add the profile README only after personal review and approval; this task does not publish it or modify the `rokerblym/rokerblym` repository.
- In **ChatGPT/Codex**, authorize focused improvements to each older repository separately. The current coding scope is SearchScope only.
- Use completed source features on the CV; use an executed test report for test claims, and a confirmed deployment URL for deployment claims. Keep generated interview notes separate from skills demonstrated by the candidate.
