# syntax=docker/dockerfile:1
FROM ruby:3.4.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libyaml-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV BUNDLE_PATH=/usr/local/bundle BUNDLE_FROZEN=true

COPY Gemfile Gemfile.lock ./
# Cloud proxy trust is optional and mounted only during installation.
# Verification remains enabled and the CA bundle is not baked into the image.
RUN --mount=type=secret,id=cloud_ca \
    if [ -f /run/secrets/cloud_ca ]; then export SSL_CERT_FILE=/run/secrets/cloud_ca BUNDLE_SSL_CA_CERT=/run/secrets/cloud_ca; fi; \
    bundle install --jobs 4 --retry 2

COPY . .
EXPOSE 3000
CMD ["bin/server"]
