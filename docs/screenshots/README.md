# SearchScope browser screenshots

These are real Chromium captures of the running Rails, React, and MongoDB
development stack. The server used `SEARCH_PROVIDER=demo`; all displayed search
results are synthetic fixtures, and the visible banners identify demo mode.
Dashboard metrics are calculated from the smoke account's two saved demo
requests, not hardcoded frontend values. No live SerpApi requests were made.

| Capture                                     | Description                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| [Account access](01-account-access.png)     | Registration and sign-in interface, before entering credentials.           |
| [Search Explorer](02-search-explorer.png)   | A saved Google demo snapshot with organic results and request metadata.    |
| [History](03-search-history.png)            | Persisted Google/Bing demo searches and fetched saved-result detail.       |
| [Comparison](04-snapshot-comparison.png)    | Actual shared/unique demo pages, domain overlap, and left/right positions. |
| [Dashboard](05-analytics-dashboard.png)     | Analytics computed from two successful saved demo searches.                |
| [Monitoring](06-api-monitoring.png)         | Actual API/database status, provider mode, policy, and recorded activity.  |
| [Settings](07-server-settings.png)          | Readonly account and server configuration without provider key values.     |
| [Mobile dashboard](08-mobile-dashboard.png) | The same account analytics at a 390-pixel viewport.                        |

Reproduce from a running demo stack:

```sh
cd frontend
node scripts/browser-smoke.mjs
```

The script requires Playwright or `playwright-core` and Chromium. It discovers
the existing cloud installation; elsewhere set `PLAYWRIGHT_MODULE_PATH` and
`CHROMIUM_PATH` to installed packages/browser paths. `BROWSER_BASE_URL` selects
the application origin; `BROWSER_SCREENSHOT_DIR` selects the capture directory.

The script creates a unique test account, verifies HTTP-only session cookies
and CSRF/Origin headers on ten real browser writes, searches both engines,
filters history, compares snapshots, checks analytics, verifies confirmed
deletion, tests rejected and accepted login, and signs out. It deletes its own
created search records after a successful run and attempts the same cleanup if
a run fails. Test accounts remain in the development database. No existing
user records are reset or deleted. Captures are taken before search cleanup.

The latest complete run passed all eight check groups with no uncaught browser
exceptions. The captures demonstrate demo workflows, not live provider
performance or a production deployment.
