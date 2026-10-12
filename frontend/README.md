# SearchScope frontend

React and TypeScript application built with Vite. Six account pages provide
search analytics, Google/Bing search, saved snapshot comparisons, searchable
history, monitoring, and readonly server settings. Registration and login use
the backend's cookie session and CSRF token. No secrets are stored in browser
storage or frontend environment variables.

Use Node.js 24:

```sh
npm ci
npm run dev
```

The development server listens on port 5173 and forwards `/api` to
`http://127.0.0.1:3000`. To use a different backend, start it with
`API_PROXY_TARGET=http://backend:3000 npm run dev`. This variable is used only
by Vite's development proxy and is not a credential. Browser requests stay on
the same origin.

```sh
npm test
npm run lint
npm run format:check
npm run build
```

`build` runs the TypeScript checker before producing `dist/`. Production hosting
must serve that directory and route `/api` to the backend; Vite's development
proxy is not part of the production bundle. The Dockerfile runs the development
server. No provider credentials belong in this frontend.

Searches, comparisons, and metrics come from `/api/v1`. The server selects the
provider. Demo mode is visibly labeled and uses synthetic fixtures; live mode
uses SerpApi. Comparing saved snapshots does not make new provider requests.

The API client sends same-origin cookies and `X-CSRF-Token` on every write.
Vite preserves the browser's Host header so Rails can validate the request
Origin. Production reverse proxies must preserve that header as well.

Use `npm run format` to apply Prettier. Vitest covers account states, client
CSRF handling, search success/failure, comparisons, history, and monitoring.
