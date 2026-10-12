# Security model and operating requirements

This document describes implemented protections and remaining limitations. It
is not a penetration-test report or a claim of production certification.

## Secrets and trust boundaries

`SERPAPI_API_KEY` is a backend environment variable. It is never a `VITE_*`
variable, a browser configuration value, or an API response field. `.env` files,
Rails master keys, and credential key files are ignored by Git. Use `.env.example`
for names and instructions only; inject real production values at runtime from
a secret manager. Never paste secrets into issues, screenshots, or application
materials.

The production backend also requires `MONGODB_URI` and a high-entropy,
environment-specific `SECRET_KEY_BASE`. Normally, nonempty comma-separated
`ALLOWED_HOSTS` must contain the application's actual approved hostnames.
With `SERVE_FRONTEND=true` and no `ALLOWED_HOSTS` binding, the backend can instead
use the trusted platform's `RENDER_EXTERNAL_HOSTNAME`. It validates one DNS
hostname and rejects wildcards, URLs, host lists, and invalid labels; that exact
hostname is allowed without granting access to arbitrary subdomains. It never
derives this fallback from request headers. Explicit `ALLOWED_HOSTS` takes
precedence, an explicitly empty list is rejected, and missing or invalid host
configuration stops startup. Custom domains need an explicit approved host list.
Do not use broad wildcards. A MongoDB URI may contain credentials
and must be handled as a secret. Do not bake either value into an image or its
build arguments. Rotate exposed values at the source, then replace runtime
bindings; merely removing them from a file does not revoke them.

The live provider client uses a fixed HTTPS destination, verifies TLS peers,
and URL-encodes query parameters. It does not fetch returned result URLs or
accept a caller-selected upstream host. SerpApi receives the query and its API
key over HTTPS. The upstream URL contains the key as required by that API, so
HTTP proxy/debug tracing must not record full upstream URLs.

BuildKit's optional `cloud_ca` secret contains a trusted CA bundle for the
installation network, not an application credential. `bin/compose` also mounts
that existing bundle read-only for cloud runtime TLS and passes existing proxy
configuration through temporary overrides. It does not bake trust or credential
values into images or tracked files. TLS, package signatures,
and checksums must remain enabled. Never work around an installation failure
with insecure transport or disabled certificate verification.

## Authentication and CSRF

- `has_secure_password` uses bcrypt; only a digest is stored. Registration
  requires at least ten characters and rejects passwords above 72 bytes.
- Rails encrypts/authenticates the session cookie using its established cookie
  store. Cookies are HttpOnly, SameSite=Lax, expire after 24 hours, and are Secure
  in production. Production forces HTTPS.
- Successful registration and login reset the session. Logout increments the
  account's persisted session version, invalidating its other existing sessions.
- The session bootstrap endpoint returns a CSRF token. Mutations require that
  token in `X-CSRF-Token`; missing or invalid tokens return `403`. Login and
  registration also require CSRF protection. Tokens remain in browser memory,
  rather than local storage.
- API controllers explicitly enable Rails' `forgery_protection_origin_check`.
  A foreign Origin returns `403` even with a valid session cookie and CSRF token,
  before credential validation or data mutation. Valid same-origin registration
  remains supported. An absent Origin header does not remove the token
  requirement for defined state-changing endpoints. Correct Origin comparison
  depends on the trusted edge supplying the public host and HTTPS scheme.
- Login uses a generic credential error and performs a dummy bcrypt comparison
  for absent users to reduce a simple timing distinction. Registration validates
  email format and uniqueness and uses generic failure messages. These measures
  are not a claim of complete account-enumeration or timing-attack resistance.

There is no password reset, email verification, MFA, account deletion, password
change, or session/device management interface. Do not market the current
authentication implementation as a complete identity service. Browser XSS can
still issue authenticated requests even when it cannot read an HttpOnly cookie;
CSRF protection does not replace safe rendering and dependency maintenance.

## Authorization and input boundaries

All history, detail, deletion, comparison, and analytics access starts from the
current user's association and excludes expired documents. Search IDs supplied
by a client do not grant ownership. Foreign, absent, malformed, and expired IDs
are handled without returning another user's data.

Unknown `/api` routes use a final public, read-only handler returning JSON
`404` with `error.code=not_found`. That handler authenticates no account and
mutates no data, so it does not require a CSRF token for an unknown write route.
Defined API endpoints retain their authentication, CSRF, and Origin checks.
This fallback does not match missing assets or other non-API paths.

The API accepts only `google` and `bing`, validates string inputs, limits a
trimmed query to 1–200 characters, restricts supported filters, and bounds page
and page-size values. Query filtering uses normalized string equality. Client
objects and regex syntax are not passed through as MongoDB selectors. These
checks are server-side; frontend validation is only a usability aid.

Search result titles and snippets are rendered as React text, without raw HTML.
The backend accepts only HTTP(S) result URLs with a host and no embedded
credentials. New-tab result links use `noopener noreferrer`. Result links can
still lead to malicious websites; normalization does not endorse their content.

The provider parser rejects malformed/non-object JSON, empty bodies, invalid
result structures, and bodies over 2 MiB. The HTTP adapter checks incoming
chunks before accumulating a body larger than 2 MiB. Connection, retries, and
response download share a 30-second deadline; subsequent bounded JSON parsing
and database operations are outside it. At most 100 results are normalized, text is truncated to 2,000
characters, and URLs are limited to 4,096 bytes. Provider-generated HTML is not
rendered.

## Frontend HTTP policy and request sizes

The separate production topology retains nginx for built React files and
same-origin API proxying. Its configured security headers, cache rules, and
16 KiB request-body limit remain applicable. The combined root Docker image
instead copies built React files into Rails' `public/` directory and enables
`SERVE_FRONTEND=true`; it runs no nginx process. The frontend remains on the
API's origin, with the same cookie and CSRF flow.

In combined mode, `SearchScope::FrontendHosting` wraps the Rack stack before
static file serving or Rails parameter parsing. Application/static responses,
including application error responses, receive CSP, `nosniff`, frame denial,
no-referrer policy, and restricted camera/microphone/geolocation permissions.
CSP restricts scripts and connections to the application's origin; inline
styles remain allowed for dashboard bar widths. Cache policy is:

- `/api` and its descendants: `no-store`, including authentication errors.
- HTML, unversioned files, and missing assets: `no-cache` for revalidation.
- Successful fingerprinted non-HTML `/assets/` responses, including `304`:
  `public, max-age=31536000, immutable`.

The Rack layer buffers at most 16 KiB plus one byte, rejects oversized declared
or actual bodies, and supplies an accepted bounded input to Rails. It covers
missing/understated length headers and fragmented or chunked input. Rack-level
rejection returns JSON `413` with `payload_too_large`; a rejected HEAD response
has no body. This limit is measured in bytes, not characters.

Puma also enables its native 16 KiB payload limit when frontend hosting is
selected, before the Rack application processes an upload. Puma-generated
`413` responses use the server's response format and bypass the Rack JSON and
header policy. The same distinction applies to other server/platform errors
generated before the application. The application limit does not replace
trusted-edge upload limits, connection deadlines, or denial-of-service controls.
Without `SERVE_FRONTEND=true`, this additional Rack/Puma hosting policy is not
enabled; the separate nginx topology supplies its own frontend boundary.

## Errors, retries, and paid requests

| Condition | Client status | Behavior |
| --- | --- | --- |
| Unauthenticated resource access | 401 | Generic login requirement |
| Invalid CSRF token or foreign Origin | 403 | Generic session guidance; no mutation |
| Absent/foreign/expired search | 404 | Generic not-found response |
| Unknown API endpoint | 404 | Public JSON not-found response without data access |
| Request body exceeds 16 KiB in combined hosting | 413 | Puma's early response or safe Rack JSON rejection |
| Invalid request data | 422 | Validation error |
| Local or provider rate limit | 429 | Safe message; bounded retry interval when available |
| Daily provider-attempt budget exhausted | 429 | Persisted safe budget error before provider I/O |
| Invalid provider credentials | 502 | Safe provider-credential failure, no raw provider body |
| Network/malformed/upstream provider failure | 502 | Safe categorized error |
| Missing provider configuration | 503 | Configuration error without key disclosure |
| MongoDB unavailability | 503 | Generic database error |
| Provider timeout | 504 | Safe timeout error |

The live adapter uses 5-second connection/write and 20-second read timeouts,
plus the 30-second transport deadline. It
disables the HTTP library's automatic retries and allows one retry only on DNS
resolution or connection-refused errors. It does not retry timeouts, dropped
connections, HTTP errors, or provider rate limits. A timeout may still have
consumed a provider credit. Users must explicitly choose to try another search.
Network and timeout exceptions discard their underlying exception cause to
prevent credential-bearing request details from leaking through error chains.

Before live provider I/O, `ProviderBudget` reserves one per-account and one
global counter for the current UTC day. Atomic conditional updates and unique
indexes enforce defaults of 20 attempts per account and 200 globally across
processes. Environment overrides accept 1–10,000. Demo mode bypasses these
counters. Exhaustion returns `provider_budget_exceeded` with `429` and persists
the failed search. Reservations are not refunded, including credential/network
failures and cases where the global limit blocks an already reserved user slot.
This conservative policy can reject a request without spending provider credits;
the counters are safeguards rather than provider invoices. Counter expiry is
scheduled at the end of the next UTC day; physical cleanup is asynchronous.

Ordinary automated tests mock the provider and must never use a paid API call.
Demo mode is a separate adapter and labels synthetic results in records/UI.
Live verification requires explicit authorization and secure credentials. The
application does not scrape other sites, bypass CAPTCHAs, or evade access
controls.

## Rate limits and proxy trust

Rack::Attack applies a shared registration/login bucket of ten POST requests
per minute per client IP computed by Rails' proxy-aware remote-IP middleware.
Search creation has a separate ten-per-minute bucket keyed by the user ID from
the decrypted session, with a client-IP fallback for anonymous requests. Path
normalization covers repeated/trailing slashes and format suffixes such as
`.json`. The limiter returns JSON `429` with `Retry-After: 60`. Ordinary tests
disable the middleware; dedicated checks must explicitly enable it. These
limits are not a provider quota guarantee.

The limiter uses an in-memory 16 MiB cache. Counts reset on restart and are not
shared between processes or replicas. Authenticated searches remain scoped to
an account behind either production topology. Authentication limits depend on
an accurate trusted-proxy/client-IP policy. Multi-replica production requires a reviewed
edge limiter or shared Redis-backed state. The MongoDB-backed daily provider
budgets are separate and already shared between processes.
Configure Rails' trusted proxy ranges for the real network topology; do not
trust arbitrary forwarded headers from an exposed backend.

Keep Rails, and nginx when used, private behind the intended TLS gateway. Only
that gateway may set trusted forwarding headers; it must overwrite any supplied by clients.
Do not expose a backend port and assume `X-Forwarded-Proto` proves HTTPS. Rails
uses the forwarded scheme for SSL handling; an incorrect configuration can
cause redirect loops or an insecure trust boundary.

`RAILS_ASSUME_SSL=true` explicitly tells Rails to treat private backend HTTP as
HTTPS after a trusted edge has terminated TLS. It adds no encryption to that
HTTP connection. Enable it only when the edge owns the public connection and
prevents untrusted direct access to Rails. It must preserve the approved public
host and overwrite client-supplied forwarding headers. Cookie security and
Origin comparison rely on this boundary. The Render blueprint selects this
option for its intended TLS edge; the blueprint does not prove that this edge,
its header policy, or a public deployment has actually been configured.

## Logs, retention, and privacy

Rails parameter filters include exactly: `password`, `password_confirmation`,
`token`, `api_key`, `serpapi_api_key`, `authorization`, `secret`, `email`, and
`query`. The logger emits JSON lines containing UTC timestamp, severity, and a
message. Search completion events include request ID, saved search ID, status,
provider, and duration; database errors include an event and request ID.
Provider exceptions are translated rather than logged verbatim.
Mongoid and the MongoDB driver use a separate JSON logger at WARN, independent
of Rails verbosity, to suppress debug command/document values. This does not
control a separately operated MongoDB server's own logs.

In the separate topology, nginx access logs use JSON fields for method, path
without query string, status, and duration; they omit request bodies, cookies,
credentials, and IP addresses.
Its error log is restricted to critical errors to reduce diagnostic exposure.
The combined topology has no nginx logger; Rails/Puma stdout and the separately
operated TLS gateway require their own log review and retention policy.
Parameter filtering does not sanitize every possible log source. Review
load-balancer, MongoDB, critical error logs, and tracing/observability tools to avoid
request bodies, credential-bearing URLs, and query strings containing user
queries. Restrict log access and retention. JSON wrapping of Rails messages is
structured transport, not automatic PII removal or a complete monitoring system.

Only the account email, password digest/session version, search snapshots, and
opaque daily budget keys/counts needed for these features are stored. The
default search retention is 30 days, configurable
from 1–365 for newly created records. TTL deletion is asynchronous; application
queries immediately hide expired records. User-requested history deletion
removes the document. Retention/deletion does not automatically erase backups,
provider records, or external logs. Account data has no automatic expiry and
must have an operational deletion policy before public use.

## Before public deployment

Use authenticated MongoDB with TLS, a least-privilege application account,
restricted network access, encrypted storage, and tested backups/restores.
Protect the same-origin frontend/API with a TLS gateway and reviewed response
security headers. Do not expose the local development database or Vite server.
Set runtime secrets, verify cookie/CSRF behavior over HTTPS, and replace the
process-local throttle with a suitable production policy before scaling.

Run current lockfile vulnerability checks, Ruby static analysis, tests, linters,
and builds. A scanner finding requires dependency review; passing scanners do
not prove the absence of vulnerabilities. Pin release image digests, preserve
trusted installation paths, and record the exact checks performed. Deployment,
remote CI, live provider availability, and a formal security review require
their own evidence. The JSON dependency is constrained to a patched release
range (`>= 2.19.9`, `< 3.0`) and locked to 2.21.2 after review of CVE-2026-54696.
Consult the validation report for the executed advisory scan and its date.
