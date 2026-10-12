# syntax=docker/dockerfile:1
# One same-origin service: React is built once, then served by Rails/Puma.
FROM node:24.19.0-bookworm-slim AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=cloud_ca \
    if [ -f /run/secrets/cloud_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/cloud_ca; fi; \
    npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM ruby:3.4.11-slim AS backend-build

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libyaml-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_FROZEN=true \
    BUNDLE_WITHOUT=development:test

COPY backend/Gemfile backend/Gemfile.lock ./
RUN --mount=type=secret,id=cloud_ca \
    if [ -f /run/secrets/cloud_ca ]; then export SSL_CERT_FILE=/run/secrets/cloud_ca BUNDLE_SSL_CA_CERT=/run/secrets/cloud_ca; fi; \
    bundle install --jobs 4 --retry 2 \
    && rm -rf /usr/local/bundle/cache

FROM ruby:3.4.11-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libyaml-0-2 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 searchscope \
    && useradd --uid 10001 --gid searchscope --create-home --shell /usr/sbin/nologin searchscope

WORKDIR /app
ENV RAILS_ENV=production \
    RAILS_LOG_TO_STDOUT=true \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_FROZEN=true \
    BUNDLE_WITHOUT=development:test \
    SERVE_FRONTEND=true \
    MALLOC_ARENA_MAX=2 \
    PORT=10000

COPY --from=backend-build /usr/local/bundle /usr/local/bundle
COPY --chown=searchscope:searchscope backend/ ./
COPY --from=frontend-build --chown=searchscope:searchscope /app/dist/ ./public/
RUN mkdir -p tmp/pids log && chown -R searchscope:searchscope tmp log

# Secrets are runtime-only. MongoDB is a separate managed service, not a
# database inside the ephemeral application container. Trust SSL forwarding
# only when deployed behind the platform's HTTPS gateway.
USER searchscope:searchscope
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["bin/check-http-health"]
CMD ["bin/server"]
