# syntax=docker/dockerfile:1
FROM node:24.19.0-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=cloud_ca \
    if [ -f /run/secrets/cloud_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/cloud_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
