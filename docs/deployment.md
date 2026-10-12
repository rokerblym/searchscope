# Local operation and deployment preparation

The repository includes development, separate production images, and a combined
Rails/React image for a single hosted service. Public source access and GitHub
Actions results are recorded in [publication-report.md](publication-report.md).
No public application deployment, AWS execution, or paid live SerpApi call has
been verified. Consult [hosting-validation.md](hosting-validation.md) for the
latest local production checks and [free-deployment.md](free-deployment.md) for
the conditional free-hosting setup and remaining account/network prerequisites.

## Development on macOS

**macOS Terminal:** install and start Docker Desktop, then open the SearchScope
repository root. Native Ruby and MongoDB are not required for the Docker route.
Docker must support Compose and BuildKit. Check the tools with:

```sh
docker version
docker compose version
```

**VS Code:** copy `.env.example` to the ignored `.env` file without overwriting
an existing file. Select `SEARCH_PROVIDER=demo` for a no-cost local walkthrough.
Do not enter an API key into frontend files, `VITE_*` variables, or tracked code.

**macOS Terminal, repository root:**

```sh
bin/setup
SEARCH_PROVIDER=demo ./bin/start
./bin/compose ps
curl --fail http://127.0.0.1:3000/api/v1/health
```

**Browser:** open `http://localhost:5173`, create a local account, and run a
search. Demo mode clearly marks its synthetic fixtures. History, comparison,
and analytics use the records actually created in the local database.

The development Compose file binds frontend port 5173, backend port 3000, and
MongoDB port 27017 to loopback only. Its unauthenticated MongoDB and Vite server
are local-development choices. Do not publish these ports on a remote host.
The `mongodb_data` volume retains database files. The frontend dependency volume
retains installed Node modules. `bin/server` creates Mongoid indexes before
starting Rails; inspect startup failures rather than skipping index creation.

**macOS Terminal, repository root:** inspect safe operational logs and stop
containers without deleting volumes:

```sh
./bin/compose logs --tail 100 backend frontend
./bin/compose down
```

Avoid submitting sensitive queries; logs from proxies or external tools may
have different filtering than Rails. Volume deletion is a separate destructive
operation and is not part of routine shutdown.

## Tests and quality checks

**macOS Terminal, repository root:**

```sh
bin/test
```

The helper starts MongoDB, runs RSpec against `searchscope_test`, checks database
connectivity, and runs frontend tests and the production frontend build. The
RSpec provider tests mock network interactions; they do not consume API credits.
Keep test database URIs distinct from development and production. Test cleanup
must never target real user data.

Additional checks can be run in the development images:

```sh
./bin/compose run --rm --no-deps backend bundle exec rubocop
./bin/compose run --rm --no-deps backend bundle exec brakeman --no-pager
./bin/compose run --rm --no-deps backend bundle exec bundle-audit check --update
./bin/compose run --rm --no-deps frontend npm run lint
./bin/compose run --rm --no-deps frontend npm run format:check
./bin/compose run --rm --no-deps frontend npm audit
```

Dependency-audit updates need network access to their advisory sources. Report
unavailable or failing checks as such. A local pass does not establish that a
workflow has passed on GitHub.

## Production images

### One hosted Rails/React service

**macOS Terminal or a Linux build host, repository root:**

```sh
docker build -t searchscope-hosted:local .
```

The root Dockerfile builds the existing frontend, then copies its assets into
Rails' public directory. Its unprivileged runtime contains Ruby and production
gems; it needs only one application service plus managed MongoDB. Hash-based
navigation keeps every page on the same origin as the API. `SERVE_FRONTEND=true`
enables static serving and the application's security, cache, and request-body
middleware. The image defaults to port 10000; both Puma and its health check
respect `PORT`. The optional `cloud_ca` build secret described below also works
with this image.

`render.yaml` declares a Free Docker service using synthetic demo searches.
The manifest has been parsed locally; authenticated Render validation and
deployment remain pending. Follow the [free setup guide](free-deployment.md)
and confirm the account's current $0 terms before applying it. Render's exact
`RENDER_EXTERNAL_HOSTNAME` is used only when frontend hosting is enabled and
`ALLOWED_HOSTS` is absent. Explicitly empty configuration fails startup.

### Separate Rails and nginx services

**macOS Terminal or a Linux build host, repository root:**

```sh
docker build -f backend/Dockerfile.production -t searchscope-api:local backend
docker build -f frontend/Dockerfile.production -t searchscope-web:local frontend
```

The backend uses a multistage Ruby image, frozen Bundler installation, no
development/test gems, and an unprivileged runtime user. It listens on port
3000. `MONGODB_URI` is mandatory in production; there is no localhost fallback.
Rails forces SSL, sets Secure session cookies, and needs a runtime
`SECRET_KEY_BASE` and nonempty `ALLOWED_HOSTS`. The startup command creates
indexes and then starts Rails.
The database role therefore needs suitable collection/index permissions during
startup; a future deployment can move index creation to a controlled release
step and reduce the steady-state role's permissions.

Do not bypass index creation on a fresh database. The unique budget-key index
is part of the daily reservation limit's enforcement, and the email/TTL indexes
provide uniqueness and retention behavior.

The frontend builds TypeScript and Vite assets using Node, then serves them
from unprivileged nginx on port 8080. It runs neither Node nor the Vite
development server in production. Its nginx configuration serves the SPA,
proxies `/api/` to `http://backend:3000`, avoids caching API responses, caches
hashed assets for one year, and refreshes the SPA document with `no-cache`.
It limits request bodies to 16 KiB and supplies CSP, framing, content-type,
referrer, and permissions headers. Inline styles remain allowed for calculated
dashboard bar widths; inline scripts are not allowed.

Both images support an optional installation-only BuildKit secret named
`cloud_ca`. If the build network uses a trusted organizational/cloud proxy,
supply its authoritative complete CA bundle:

```sh
docker build --secret "id=cloud_ca,src=$SSL_CERT_FILE" \
  -f backend/Dockerfile.production -t searchscope-api:local backend
docker build --secret "id=cloud_ca,src=$SSL_CERT_FILE" \
  -f frontend/Dockerfile.production -t searchscope-web:local frontend
```

Use these commands only when `SSL_CERT_FILE` names the correct readable trust
bundle. A required HTTP(S) proxy can be passed using Docker's predefined proxy
build arguments. `bin/compose`, used by `bin/setup`, `bin/start`, and `bin/test`,
handles the development case through temporary overrides. It supplies the build
secret, mounts the existing trust bundle read-only for runtime TLS, passes proxy
configuration, and resolves the cloud proxy host entry when available. Normal
macOS execution without those cloud variables uses ordinary Compose. This is an
environment-specific build requirement, not a reason to disable TLS. The CA
secret is not copied into the final image. Runtime external connections must
use their own correctly configured trusted CA store.

## Required production configuration

| Variable | Requirement |
| --- | --- |
| `RAILS_ENV` | `production`; set by the backend production image |
| `MONGODB_URI` | Authenticated production MongoDB URI with TLS, supplied at runtime |
| `SECRET_KEY_BASE` | Stable high-entropy secret, unique to this environment, supplied at runtime |
| `ALLOWED_HOSTS` | Nonempty comma-separated approved hostnames; combined Render hosting can use its exact validated platform hostname when this variable is absent |
| `SERVE_FRONTEND` | `true` for the combined image; enables static frontend, headers, caching, and bounded input |
| `RAILS_ASSUME_SSL` | `true` only behind a trusted TLS gateway with a private backend HTTP port |
| `PORT` | Listener and health-check port; combined image defaults to 10000, separate backend to 3000 |
| `SERPAPI_USER_DAILY_LIMIT` | 1–10,000 attempted live searches per account per UTC day; default 20 |
| `SERPAPI_GLOBAL_DAILY_LIMIT` | 1–10,000 attempted live searches globally per UTC day; default 200 |
| `SEARCH_PROVIDER` | `demo` for no-cost evaluation; `serpapi` only when live calls are intended |
| `SERPAPI_API_KEY` | Server-only secret required for the live adapter |
| `SEARCH_RETENTION_DAYS` | 1–365; defaults to 30 for new searches |
| `RAILS_MAX_THREADS` | Optional; defaults to 3, tune after measuring resources/provider latency |
| `RAILS_LOG_LEVEL` | Optional; defaults to `info` |

**Browser, deployment platform's secure environment/secret settings:** create
the secrets and bind them to the backend runtime. Use an established secret
generator/manager for `SECRET_KEY_BASE`; do not commit the resulting value.
Keep a stable key between replicas and restarts. Changing it invalidates cookie
sessions. Production credentials must not be build arguments, frontend assets,
public repository settings, or plaintext deployment documentation. The
[production environment template](production.env.example) lists required names
without credentials. It is not ready to run until actual runtime values are
configured. Budget reservations are shared in MongoDB, include failed attempts,
and are not refunded; demo mode bypasses them.

## Network and TLS contract

For combined hosting, publish only the platform TLS gateway and keep its Puma
HTTP listener private. For separate hosting, place both application containers
on a private network. Publish only the TLS
gateway, which routes the public hostname to nginx port 8080. The gateway must
overwrite client-supplied `X-Forwarded-Proto` and forwarded client-IP headers.
nginx preserves the original `Host` and forwards a trusted HTTPS scheme to
Rails. Rails and nginx ports must not be directly reachable from untrusted
clients. The supplied nginx map accepts an incoming HTTPS scheme on the
assumption that only the trusted gateway can contact it.

Ensure the hostname `backend` resolves to the Rails service on this private
network. It is fixed in the supplied nginx configuration. Docker Compose
service-name DNS can provide this in a reviewed production Compose definition.
The development Compose file does not select these production images and is
not a production deployment manifest. An orchestration platform must provide
equivalent DNS/service discovery, or a separately reviewed deployment-specific
nginx configuration. Docker production images alone do not provision it.

Permit only necessary egress: backend to the configured MongoDB service and
`serpapi.com:443` for live requests, plus DNS and any explicitly chosen
operational services. Build workers separately need their package/image
registries. The browser talks to the application's own origin; it never needs
access to a provider key or the database.

Use authenticated MongoDB, TLS verification, restricted network access,
least-privilege application credentials, encrypted storage, and tested backup
and restore procedures. Keep database files on persistent infrastructure rather
than an ephemeral application container. A managed MongoDB service is one
option, not a deployment already performed by this project.

## Health and observability

`GET /api/v1/health` is public liveness only. It does not ping MongoDB or SerpApi
and does not prove quota or provider credentials. The production backend image
checks this endpoint over loopback HTTP using the first configured allowed
hostname and `X-Forwarded-Proto: https` to satisfy host authorization and avoid
Rails' intentional SSL redirect. That internal health-check convention is not
permission to accept untrusted forwarding headers publicly.

The frontend image checks only that nginx can serve `/`; that check does not
prove API connectivity. Authenticated `GET /api/v1/monitoring` performs a database
ping and reports provider configuration presence. It does not make a paid
request or verify a live key. Use a reviewed non-billable database readiness
probe in the deployment platform; do not turn health checks into paid searches.

Rails emits JSON log lines and safe search-completion events. Collect stdout
and container health with the platform's monitoring tools. Alert on HTTP error
rates, database connectivity, timeouts, pending-record buildup, resource use,
and provider rate limits. The dashboard summarizes retained user activity;
it is not an infrastructure monitoring or billing replacement. Nginx access
logs omit query strings, bodies, cookies, and IP addresses. Review gateway and
critical error logs for sensitive data and set an explicit retention policy.

The current limiter is per-process. Search creation is keyed by the authenticated
session's user ID; login/registration use Rails' proxy-aware client IP. Review
trusted proxy ranges and header handling. Production traffic needs edge rate
limits or reviewed shared limiter state before multiple replicas. Daily
provider-attempt counters are already atomic and shared in MongoDB; those
spending safeguards do not replace distributed per-minute traffic protection.
See [security.md](security.md) for this and other current limits.

## Optional AWS path

A possible future Linux deployment is Amazon ECS/Fargate for the two images,
an HTTPS Application Load Balancer, Amazon ECR for image storage, Secrets Manager
for runtime secrets, CloudWatch for logs, and MongoDB Atlas for the database.
This repository does not provision these resources or verify that topology.

A deployment task must define private subnets/security groups, database network
access, the backend DNS name (for example through suitable service discovery),
TLS and forwarding-header policy, non-billable readiness checks, secret IAM
permissions, resource limits, shared/edge rate limiting, and backup/restore
ownership. Validate the exact provider/database trust and DNS configuration in
that environment rather than assuming a local Docker test proves it.

## Release gate

**ChatGPT/Codex:** inspect the working tree for secrets and unrelated changes,
record exact local checks, review known limitations, and prepare the release.
**GitHub:** check the actual workflow outcome after each push; writing a workflow
is not proof of a passing run. The owner has authorized source publication and
free deployment for this task. **Browser/deployment platform:** confirm the
no-charge account terms and supply secure hosting/database configuration before
provisioning. Charges and paid live-provider verification require separate
approval. Record the real public browser results before adding a live URL.
