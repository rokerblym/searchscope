# Junior Fullstack Engineer interview preparation

This guide is a study plan and a set of practice tasks. It does not establish proficiency in Ruby, Rails, MongoDB, AWS, or any other topic. The candidate's strongest stated background is Python and API development. Explain the implementation in your own words, change it safely, and run a relevant test before claiming that you understand it.

Work in the SearchScope repository in **VS Code** and run the documented project commands in **macOS Terminal**. Containerized commands run inside the development services, not directly on macOS. The repository README is the authority for the current Compose service names and startup commands. Do not call the paid provider while practicing; use clearly labeled demo data or mocked transport. No credentials belong in exercise solutions or chat.

## How to prepare

For each topic, answer the question aloud before reading the model answer. Use the answer as a reference, not a script. Complete the exercise, add at least one meaningful edge case, and explain what the test proves. In an interview, say “I have used this in a personal project” when that is the actual context. Say “I have not used it yet; here is how I would investigate” for unfamiliar production or AWS questions.

Keep a simple practice log with date, exercise, command executed, observed result, and the concept you still need to explain. A generated project is useful study material, but it is not a substitute for demonstrated understanding.

## Ruby

**What differs between a Ruby hash and an array?** An array is an ordered list, accessed by position. A hash maps keys to values. JSON objects normally parse to hashes with string keys, so `payload["organic_results"]` and `payload[:organic_results]` are different lookups. Explicitly normalize boundaries rather than guessing a key type.

**What are `nil`, `false`, `0`, and `""` in conditions?** Only `nil` and `false` are falsey in Ruby. Both `0` and the empty string are truthy. A present string can still be blank, so use a deliberate nonblank check for configuration and query input.

**What are blocks and keyword arguments?** A block is a piece of code passed to a method, such as `results.map { |result| result["title"] }`. Keyword arguments give meaning to values at a call site, for example `call(query: "rails", engine: "google")`. Neither feature removes the need for validation.

**When should an exception be rescued?** Rescue specific exceptions at the layer that can meaningfully translate or recover from them. An HTTP adapter can map a read timeout to a provider-timeout error. Catching every exception and returning an empty result hides bugs and falsely reports success.

**Exercise:** Write `normalize_query(query)` that accepts a string, strips outer whitespace, collapses repeated whitespace, and rejects an empty value or more than 200 characters. Test `" rails  api "`, whitespace only, `nil`, and the exact length boundary. Decide whether normalization for display should preserve case while a separate matching value uses lowercase. Use RSpec examples rather than assuming the happy path is enough.

## Rails

**What happens when an HTTP request reaches Rails?** Rack passes the request to Rails, the router selects a controller action, filters such as authentication run, the action invokes application logic and persistence, and Rails serializes a response. A browser may then render that response. Trace one actual route rather than reciting framework terminology.

**Why is SearchScope an API application?** Its backend returns JSON and its React frontend renders the UI. API mode reduces default middleware, so browser cookie sessions and CSRF protection must be deliberately configured when using cookie authentication. Choosing API mode does not automatically solve authentication.

**What belongs in a controller?** Translate HTTP input, check authorization, call the operation, and translate the result to an HTTP response. Reusable provider parsing and comparison logic belong outside the controller. Avoid creating abstractions that are more difficult to understand than the duplicated logic they replace.

**Does Rails require Active Record?** No. Active Record is Rails' usual relational mapper. SearchScope uses Mongoid with MongoDB instead. Explain Mongoid validations and indexes without claiming that they are SQL migrations.

**Exercise:** Trace `GET /api/v1/health` through `backend/config/routes.rb` and the health controller. Write down its exact response and distinguish liveness from readiness. Then identify where `POST /api/v1/searches` validates input and authorizes the current user. Explain a failure before changing any code.

## REST APIs and HTTP

**Which HTTP methods would you choose?** `GET` retrieves without intentionally changing state, `POST` creates or executes an operation, and `DELETE` removes a resource. A search may consume external provider credits and create history, so a `POST` is appropriate even though the provider internally receives a `GET`.

**How do you choose status codes?** Use a documented, consistent contract. Typical meanings are: `200` successful retrieval, `201` created resource, `204` successful response without a body, `400` malformed request, `401` application login required, `403` forbidden request, `404` absent or inaccessible resource, `422` valid JSON with invalid input, `429` rate limit, `502` unusable upstream response, `503` dependency unavailable, and `504` upstream timeout. Do not expose provider credentials or its raw diagnostic body to the user.

**Why not return `401` for an invalid SerpApi key?** The user's application login may be valid. A broken server-side provider credential is an upstream/configuration problem, not proof that the user should log in again. SearchScope uses a separate sanitized provider-authentication error. Explain the current status mapping from source and tests.

**What is idempotency?** Repeating an operation has the same intended effect as doing it once. A paid search that writes history can have repeated effects. A future idempotency key must have a defined scope, expiry, request-body binding, and stored outcome; merely adding a header does not provide idempotency.

**Exercise:** Describe the response for a blank query, unknown engine, expired login, unavailable MongoDB, and provider timeout. Include an error code and a safe human-readable message. Check the actual request specs instead of inventing the response contract.

## JavaScript and TypeScript

**What does `async`/`await` do?** An async function returns a promise. `await` pauses that function until the promise settles; it does not make all work synchronous or stop every other task. Handle rejected promises and distinguish a network failure from a non-success HTTP response. `fetch` ordinarily resolves even for HTTP `500`.

**Does TypeScript validate a server response?** No. Its types are checked during compilation and erased at runtime. Casting `await response.json()` to an interface does not prove the shape is correct. Check the fields you actually use, and fail safely when the response is malformed.

**What is a discriminated union useful for?** It represents states with a shared label: `{ status: "loading" }`, `{ status: "success", data }`, and `{ status: "error", message }`. Narrowing on `status` makes it harder to read absent data accidentally. It cannot prevent race conditions by itself.

**Exercise:** Define a `SearchResult` type with title, URL, optional snippet, and optional position. Write a validator from `unknown` to that type. Reject `javascript:` and `data:` URLs for clickable results. Test missing optional values and invalid mandatory fields. Explain the difference between input validation and safe output rendering.

## React and accessible interfaces

**What is a controlled input?** React state is the source of truth for the input's value, and an event handler updates it. Pair the input with a real `<label>`, submit a `<form>`, and keep keyboard behavior predictable. A clickable `<div>` is not a substitute for a button.

**What states should a search form have?** Initial or empty, loading, successful results, and error. Prevent duplicate submissions while loading, announce a useful result/error message to assistive technology, and retain the query so the user can correct it. A spinner alone is not an explanation.

**How do you prevent stale results from replacing newer ones?** A request sequence identifier or cancellation can distinguish the latest request from an older response. `AbortController` can stop a browser fetch, but cancellation does not prove that the backend or paid upstream operation never executed.

**Exercise:** Write a frontend test that submits a query, checks the loading state before resolving the mocked request, then checks title, URL, and snippet. Add an error case and a missing-snippet case. Query controls by accessible role and name rather than by implementation-only CSS classes.

**Comparison exercise:** Use two fixture lists with one shared URL, different positions for that URL, and one unique result on each side. Verify the overlap and unique sections. Explain why one matching domain is not equivalent to one matching URL and why a small result sample does not establish statistical significance.

## MongoDB and data modeling

**What is a document?** A document stores named values and can contain nested objects and arrays. MongoDB's flexible storage does not remove the need for an application schema, validation, and deliberate limits. SearchScope stores only selected metadata and normalized result fields rather than retaining the entire provider response.

**What does an index do?** It helps the database find or order documents without scanning every document, at a storage and write-cost tradeoff. An index should follow real queries. For per-user history ordered by recent timestamp, a compound index starting with the user identifier and then sort keys is a reasonable candidate; explain the exact query before defending an index.

**Why do validation and unique indexes both matter?** Application uniqueness validation can race when two requests arrive together. A database unique index is the final constraint; the application still needs to turn the duplicate-write error into a safe response.

**What is TTL retention?** A TTL index deletes documents after their expiry time during background processing. It is not an exact immediate deletion scheduler. Application reads should exclude expired documents so delayed background cleanup does not show retained data beyond the stated policy. Check the project's documented retention default before quoting it.

**Why scope access by user?** Knowing a valid document ID is not authorization. Find a search through the current user's allowed records rather than fetching it globally and trusting a frontend check. A `404` for another user's ID can avoid disclosing its existence.

**Exercise:** Register two test users, create a search for the first, and show that the second cannot list, fetch, or delete it. Repeat with an invalid object ID. Explain what database state must be cleaned up between tests and why tests must use a separate database.

## Linux and Git

**How would you inspect a Linux service?** Start with its process or container status, recent logs, port bindings, environment-variable names/presence, and dependency reachability. Use `pwd`, `ls`, `rg`, `ps`, and `curl` deliberately. Do not print the entire process environment or secret-containing files to debug one missing variable.

**How do paths and permissions affect deployment?** A path inside a container is not necessarily the same path on the host. A non-root service user should have write access only where needed. Permission errors, missing files, and wrong working directories deserve diagnosis rather than `chmod 777`.

**What is the difference between a commit and a deployment?** A commit records a repository snapshot. A push makes commits available remotely. CI validates that snapshot when it actually runs. A deployment runs a release somewhere. None establishes the others automatically.

**Exercise:** In **macOS Terminal**, run `git status --short` and inspect a diff before staging. Explain which files are generated, which are intentionally tracked, and why `.env` must remain ignored. Practice resolving a small conflict in a disposable practice repository, not in AqZhol or another existing project. Never rewrite others' history to improve a portfolio narrative.

## Docker and CI

**What is the difference between an image and a container?** An image is the packaged filesystem and configuration used to start a container. A container is a running or stopped instance. A named volume persists database data beyond the lifetime of one container. Deleting the volume deletes those persisted data.

**What does Compose provide?** It declares services, networks, configuration, and volumes for a repeatable local stack. A dependency health check can coordinate startup but cannot guarantee that the dependency stays available. The application must still handle later failures.

**Why use lockfiles and pinned compatible tools?** They reduce resolution differences between developer machines and CI. Exact versions still need maintained security updates and tests. Running the same image tag on different architectures can also need compatible packages and binaries.

**Exercise:** Follow the README startup commands, identify which service owns each port, and request the health endpoint. Stop the backend, observe the frontend error state, then restart it. Use `docker compose stop`, not `down -v`, when preserving database data. Do not describe a local successful run as a successful GitHub Actions execution.

## Testing and debugging

**What should a test prove?** A meaningful behavior or contract under stated conditions. A provider adapter test can prove timeout/error translation, parsing, and retry bounds with a fake transport. It does not prove that a real paid request works. A database-backed request test proves more about persistence than a test that replaces every model with a mock.

**What is the difference between a stub and an integration test?** A stub supplies a controlled result for a dependency. An integration test exercises the boundary between real components. SearchScope's ordinary provider tests use stubs to avoid paid calls; MongoDB-backed tests should connect to an actual test database. Always name the boundary exercised.

**How do you debug a failing request?** Reproduce it with minimal input, record the safe error code and request ID, identify the failing boundary, inspect the relevant logs, form one hypothesis, change one thing, and rerun the narrow check. Preserve the failing case as a regression test when useful.

**Exercise:** Inject an upstream `429`, empty body, invalid JSON, and read timeout independently. Predict the outcome, run the adapter tests, then explain any mismatch. Do not retry an unchanged command repeatedly or disable TLS validation to make a failure disappear.

**Exercise:** Deliberately point a disposable test process at an unavailable MongoDB port. Verify the bounded failure response and useful safe log, then restore the configuration. Do not stop a shared database or modify development history without considering other work in progress.

## System design, performance, and provider reliability

**Trace one search end to end.** The browser submits a validated query to the application API with its authenticated session and CSRF token. The backend checks the current user, validates the request, invokes the provider adapter, normalizes the result, persists selected history, and returns JSON. The UI renders the safe fields. Read the actual implementation to confirm the ordering and failure behavior.

**What happens if the provider succeeds but persistence fails?** The external operation may already have consumed credits even though the application returns an error. The user should not be told that no paid request happened. A future design might use operation records, idempotency, and background work, but these require explicit semantics rather than optimistic automatic retries.

**Why use a monotonic clock for durations?** Wall-clock time can change because of synchronization. A monotonic clock is intended to measure elapsed intervals. UTC timestamps still belong in history for when an operation happened. Explain whether duration includes the database and rendering; the answer must match the actual code.

**Why avoid calling every metric a production KPI?** Metrics describe observed application records. Demo records must be labeled and separated from live-provider records. A success rate from a few demo requests is a development observation, not evidence of production reliability or user adoption.

**What are safe retries?** Retry only failures for which repeating the operation is acceptable, with bounded attempts and a total budget. A DNS or connection-refused failure before connection establishment may be retryable. A read timeout or dropped connection after sending a paid request can leave the outcome unknown. Respect `Retry-After` and quotas; do not automatically retry a provider `429` in a tight loop.

**What is backoff with jitter?** It delays retries increasingly and varies the delay so many clients do not retry together. It is a general technique, not a claim that SearchScope implements it. First decide which failures may be retried at all and who owns retrying; retries at multiple layers can multiply requests.

**Exercise:** Sketch a sequence diagram for provider success, provider timeout, and database failure. State which steps consume provider credits and where the outcome is uncertain. Suggest one performance improvement supported by a measurable bottleneck, rather than adding caching or queues reflexively.

## Security and AWS awareness

**How should a password be stored?** As a salted password hash using an established password-hashing implementation such as bcrypt, not plaintext or reversible custom encryption. A general-purpose fast hash such as SHA-256 is not an appropriate substitute. Check supported input limits and validation before describing the full password policy.

**Why are cookie security and CSRF both relevant?** Browsers attach cookies automatically, which creates cross-site request risks. A state-changing authenticated endpoint must use the documented CSRF protection. `HttpOnly` limits direct JavaScript access, `Secure` requires HTTPS, and an appropriate `SameSite` policy adds defense. Each mechanism addresses different risks.

**Where should the SerpApi key live?** Only in backend configuration supplied securely at runtime. Do not use a frontend `VITE_` variable, return the key in API responses, or print a URL containing it. Keep upstream diagnostic bodies and query strings out of unsafe logs. TLS verification must stay enabled.

**How can injection and unsafe links happen?** Passing user-controlled objects directly into database selectors may let operators change query meaning. Accept explicit primitive fields and build known selectors. React normally escapes text, but unsafe HTML insertion or unvalidated external URL schemes can introduce another attack path. Validation and authorization protect different boundaries.

**What would you need for an AWS deployment?** A chosen hosting service, HTTPS, network restrictions, database authentication and backups, secret management, limited IAM permissions, logs, monitoring, and a rollback plan. This is a proposed checklist, not AWS experience. Do not claim to have deployed to AWS unless you actually performed and verified that deployment.

**Exercise:** Review only tracked SearchScope files for accidental credentials, unsafe log statements, external URL handling, and access-control checks. Add or verify a test for the most concrete finding. Record a dependency audit's actual output and limitations; a clean scanner result does not prove an application is secure.

## SearchScope discussion prompts

Use the implementation and validation report as evidence. Strong answers explain both behavior and limits.

1. Why Rails for this project, and what does it provide beyond a minimal HTTP framework?
2. Why MongoDB and Mongoid? What would be easier with PostgreSQL, and when would you choose it instead?
3. What fields are stored for a search, and why is the entire provider response excluded?
4. What does the health endpoint prove? How does readiness depend on MongoDB? Should readiness spend SerpApi credits?
5. What is the difference between demo data, stubbed tests, real database integration, and a paid live-provider check?
6. Where is user ownership enforced for history, analytics, comparison, and deletion? Show an actual negative test.
7. Which exact failures are retried, and how do you avoid duplicate paid requests?
8. What do “overlap,” “domain,” and “position” mean in the comparison implementation? How are missing values handled?
9. How is search history expired, and what limitations does MongoDB TTL deletion have?
10. Which checks actually ran locally, which could not run, and which require remote execution?
11. Which design decision would you simplify after reviewing the code? Explain a concrete benefit and test that would protect behavior.
12. What parts did you implement or investigate with assistance? What can you independently explain and change now?
13. How are application-side paid-provider limits counted atomically across processes? Explain the UTC day boundary, the difference between reserved attempts and successful results, and why this is a spending safeguard rather than a verified provider billing ledger.
14. How does logout invalidate copied older sessions? Trace the stored authentication version and explain the policy's effect on another active session for the same user.

The locally executed implementation checks reported by the engineering lead are 79 passing RSpec examples and 47 passing Vitest tests, plus frontend linting, formatting, type checking, and build checks. Refer to `docs/validation-report.md` for the final evidence and its limits. These are software checks performed during this assisted project; they are not a certification of independent candidate mastery. Paid SerpApi verification, remote CI execution, and external deployment require separate evidence.

## Existing personal-project discussion prompts

**AqZhol / SafeRoute:** Describe your exact contribution, the mapping API used, how route calculations work, and what “safer” means in the available data. Explain uncertainty and avoid implying a validated personal-safety guarantee. Show the exact repository and a reproducible request if available. Its source was not independently accessible during this portfolio review.

**CyberLearn API:** Explain the quiz score denominator, behavior for unknown question IDs and repeated answers, and why the current in-memory question list is a prototype. Propose validation and one request test. The read-only source review found endpoints; it did not execute them or establish passing tests.

**Shopify RAG Assistant:** Explain retrieval with embeddings and FAISS, which local sample documents are searched, and why returning the nearest document is not a Shopify API integration or a generative answer. Explain model download requirements and why fixed similarity thresholds are not measured accuracy.

**Sentinel Log Analyzer:** Explain the supported log format, counting threshold, IPv4 validation limitation, large-file memory behavior, and predictable error exit codes. A small regex demonstration is not proof of production intrusion detection.

**File Integrity Monitor:** Explain chunked SHA-256 hashing, baseline trust, new/modified/deleted classification, and what an unreadable file should mean. A writable baseline can itself be changed; hashing alone does not make the monitor tamper resistant.

## Questions to ask the engineering team

- What does a junior engineer's first reviewed API change typically involve?
- How do you test provider-specific behavior without making ordinary CI expensive or unreliable?
- How are production incidents reviewed and documented asynchronously?
- What do code reviews emphasize for an engineer learning Ruby and Rails?
- Which deployment and monitoring tasks would I learn first, and how is production access supervised?

Discuss the remote schedule and Kazakhstan time-zone overlap using actual availability. Do not promise hours, immediate relocation, or work authorization that has not been confirmed.
