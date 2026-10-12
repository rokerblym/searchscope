/* global process, console, document, window, fetch */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Real browser integration smoke. Requires a running stack with SEARCH_PROVIDER=demo.
// Normal development: install Playwright or point PLAYWRIGHT_MODULE_PATH at it.
// CHROMIUM_PATH can select an existing browser; credentials are generated per run.
const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.BROWSER_BASE_URL ?? 'http://127.0.0.1:5173';
const screenshotDirectory =
  process.env.BROWSER_SCREENSHOT_DIR ?? resolve(scriptDirectory, '../../docs/screenshots');
const moduleCandidates = [
  process.env.PLAYWRIGHT_MODULE_PATH,
  'playwright',
  'playwright-core',
  '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core',
].filter(Boolean);
let chromium;
for (const candidate of moduleCandidates) {
  try {
    ({ chromium } = require(candidate));
    break;
  } catch {
    /* Try the next supported installation. */
  }
}
if (!chromium)
  throw new Error(
    'Playwright is unavailable. Set PLAYWRIGHT_MODULE_PATH to an installed playwright or playwright-core package.',
  );

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { executablePath: '/usr/bin/chromium' }),
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const browserErrors = [];
const writes = [];
const writeHeaderChecks = [];
const checks = [];
const createdSearchIds = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('request', (request) => {
  if (request.url().includes('/api/v1/') && ['POST', 'DELETE'].includes(request.method())) {
    writeHeaderChecks.push(
      request.allHeaders().then((headers) => {
        writes.push({
          path: request.url().split('/api/v1')[1],
          method: request.method(),
          csrfPresent: Boolean(headers['x-csrf-token']),
          originPresent: Boolean(headers.origin),
        });
      }),
    );
  }
});

async function responseFor(method, path, action, expectedStatus) {
  const pending = page.waitForResponse(
    (response) =>
      response.request().method() === method && response.url().split('?')[0].endsWith(path),
  );
  await action();
  const response = await pending;
  assert.equal(
    response.status(),
    expectedStatus,
    `${method} ${path} returned HTTP ${response.status()}`,
  );
  return response.status() === 204 ? null : response.json();
}
async function navigate(label) {
  await page.getByRole('link', { name: label, exact: true }).click();
}
async function screenshot(filename) {
  await page.screenshot({ path: resolve(screenshotDirectory, filename), fullPage: true });
}
async function runSearch(query, engine) {
  await page.getByLabel('Search query', { exact: true }).fill(query);
  await page.getByLabel('Search engine', { exact: true }).selectOption(engine);
  const search = await responseFor(
    'POST',
    '/api/v1/searches',
    () => page.getByRole('button', { name: /Run search/ }).click(),
    201,
  );
  assert.equal(search.status, 'succeeded');
  assert.equal(search.provider, 'demo', 'The smoke test must use synthetic demo data only.');
  assert.equal(search.query, query);
  assert.equal(search.engine, engine);
  assert.ok(search.results.length > 0, 'Demo search should return organic result fixtures.');
  createdSearchIds.push(search.id);
  await page.getByRole('button', { name: 'Compare snapshot' }).waitFor();
  return search;
}
async function deleteOwnSearch(search) {
  await page.getByRole('button', { name: `Delete ${search.query}`, exact: true }).click();
  await responseFor(
    'DELETE',
    `/api/v1/searches/${search.id}`,
    () => page.getByRole('button', { name: 'Confirm delete', exact: true }).click(),
    204,
  );
  await page
    .getByRole('button', { name: `Delete ${search.query}`, exact: true })
    .waitFor({ state: 'hidden' });
}

try {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Sign in to SearchScope', exact: true }).waitFor();
  await screenshot('01-account-access.png');

  const email = `smoke-${Date.now()}@example.test`;
  const password = `Browser-smoke-${randomUUID()}`;
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await responseFor(
    'POST',
    '/api/v1/auth/register',
    () => page.getByRole('button', { name: 'Create your account', exact: true }).click(),
    201,
  );
  await page.getByRole('heading', { name: 'A clearer view of every search.' }).waitFor();
  await page.getByText('DEMO MODE', { exact: true }).waitFor();
  const monitoring = await (await page.request.get(`${baseUrl}/api/v1/monitoring`)).json();
  assert.equal(
    monitoring.provider,
    'demo',
    'Refusing search requests because the running provider is not demo.',
  );
  assert.equal(monitoring.database_status, 'ok');
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (cookie) => cookie.name.includes('searchscope') && cookie.httpOnly,
  );
  assert.ok(sessionCookie, 'A SearchScope HTTP-only session cookie should be set.');
  assert.equal(sessionCookie.sameSite, 'Lax');
  const readableCookies = await page.evaluate(() => document.cookie);
  assert.ok(
    !readableCookies.includes(`${sessionCookie.name}=`),
    'The browser must not expose the session cookie to scripts.',
  );
  checks.push(
    'Registration, authenticated session, HTTP-only cookie, demo provider, and MongoDB readiness',
  );

  await navigate('Search Explorer');
  await page.getByRole('link', { name: 'Skip to content', exact: true }).focus();
  await page.getByRole('link', { name: 'Skip to content', exact: true }).click();
  assert.ok(
    page.url().endsWith('#/search'),
    'Skipping to content must preserve the selected page.',
  );
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');
  const left = await runSearch('renewable energy', 'google');
  await page.getByText('Synthetic demo results.', { exact: true }).waitFor();
  await screenshot('02-search-explorer.png');
  const right = await runSearch('urban gardening', 'bing');
  checks.push('Google and Bing search requests through real browser Origin and CSRF validation');

  await navigate('History');
  await page.getByRole('button', { name: `Compare ${left.query}`, exact: true }).waitFor();
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  await page.locator('#search-detail .results-list .result-item').first().waitFor();
  await screenshot('03-search-history.png');
  await page
    .getByLabel('Query — exact match', { exact: false })
    .fill(`  ${left.query.toUpperCase()}  `);
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await page
    .getByRole('button', { name: `Compare ${right.query}`, exact: true })
    .waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: `Compare ${left.query}`, exact: true }).waitFor();
  assert.ok(
    !(await page.getByRole('button', { name: `Compare ${right.query}`, exact: true }).isVisible()),
  );
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: `Compare ${right.query}`, exact: true }).waitFor();
  checks.push('Persisted search history, saved result detail, and normalized query filtering');

  await navigate('Comparison');
  await page.getByLabel('Left snapshot', { exact: true }).selectOption(left.id);
  await page.getByLabel('Right snapshot', { exact: true }).selectOption(right.id);
  const comparison = await responseFor(
    'POST',
    '/api/v1/comparisons',
    () => page.getByRole('button', { name: 'Compare snapshots', exact: true }).click(),
    200,
  );
  assert.equal(comparison.left.id, left.id);
  assert.equal(comparison.right.id, right.id);
  assert.ok(Array.isArray(comparison.comparison.overlapping_results));
  assert.ok(Array.isArray(comparison.comparison.position_changes));
  await page.getByRole('heading', { name: 'Positions of shared pages', exact: true }).waitFor();
  await screenshot('04-snapshot-comparison.png');
  checks.push('Saved snapshot comparison, shared and unique result groups, domains, and positions');

  await navigate('Dashboard');
  await page
    .locator('.metric-card')
    .filter({ hasText: 'Total searches' })
    .locator('strong')
    .filter({ hasText: '2' })
    .waitFor();
  const analytics = await (await page.request.get(`${baseUrl}/api/v1/analytics`)).json();
  assert.equal(analytics.total_searches, 2);
  assert.equal(analytics.successful_searches, 2);
  assert.equal(analytics.failed_searches, 0);
  assert.equal(analytics.success_rate, 100);
  assert.ok(analytics.top_domains.length > 0);
  await screenshot('05-analytics-dashboard.png');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)),
    'The mobile dashboard should not overflow horizontally.',
  );
  await screenshot('08-mobile-dashboard.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  checks.push(
    'Analytics calculated from two real saved demo searches and responsive mobile layout',
  );

  await navigate('Monitoring');
  await page.getByText('Connected', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Server policy', exact: true }).waitFor();
  await screenshot('06-api-monitoring.png');
  await navigate('Settings');
  await page.getByRole('heading', { name: 'Your account', exact: true }).waitFor();
  await page.getByText('30 days', { exact: true }).waitFor();
  await screenshot('07-server-settings.png');
  checks.push('Database/provider monitoring and readonly account/server settings');

  await navigate('History');
  await page.getByRole('button', { name: `Delete ${left.query}`, exact: true }).waitFor();
  await deleteOwnSearch(left);
  const afterDeletion = await (await page.request.get(`${baseUrl}/api/v1/analytics`)).json();
  assert.equal(afterDeletion.total_searches, 1);
  checks.push("Confirmed deletion of only this smoke account's own search and updated analytics");

  await responseFor(
    'DELETE',
    '/api/v1/auth/logout',
    () => page.getByRole('button', { name: 'Sign out', exact: true }).click(),
    200,
  );
  await page.getByRole('button', { name: 'Sign in to SearchScope', exact: true }).waitFor();
  const anonymousSession = await (await page.request.get(`${baseUrl}/api/v1/session`)).json();
  assert.equal(anonymousSession.authenticated, false);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-smoke-password');
  await responseFor(
    'POST',
    '/api/v1/auth/login',
    () => page.getByRole('button', { name: 'Sign in to SearchScope', exact: true }).click(),
    401,
  );
  await page.getByRole('alert').waitFor();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await responseFor(
    'POST',
    '/api/v1/auth/login',
    () => page.getByRole('button', { name: 'Sign in to SearchScope', exact: true }).click(),
    200,
  );
  await page.getByRole('heading', { name: 'A clearer view of every search.' }).waitFor();
  await navigate('History');
  await page.getByRole('button', { name: `Delete ${right.query}`, exact: true }).waitFor();
  await deleteOwnSearch(right);
  await responseFor(
    'DELETE',
    '/api/v1/auth/logout',
    () => page.getByRole('button', { name: 'Sign out', exact: true }).click(),
    200,
  );
  await page.getByRole('button', { name: 'Sign in to SearchScope', exact: true }).waitFor();
  checks.push(
    'Logout, rejected bad credentials, login, persisted history, own-search cleanup, and final logout',
  );

  await Promise.all(writeHeaderChecks);
  assert.ok(writes.length >= 10);
  assert.ok(
    writes.every((write) => write.csrfPresent && write.originPresent),
    'Every browser write should carry a CSRF token and Origin.',
  );
  assert.deepEqual(browserErrors, [], 'No uncaught browser exceptions should occur.');
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        mode: 'demo',
        checks,
        browserWrites: writes.length,
        screenshots: screenshotDirectory,
        browserErrors,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page
    .screenshot({ path: '/tmp/searchscope-browser-failure.png', fullPage: true })
    .catch(() => {});
  // Clean up only IDs returned for this run's own successful searches.
  // Browser fetch supplies the same Origin/cookie behavior as the application.
  if (createdSearchIds.length) {
    await page
      .evaluate(async (ids) => {
        const session = await (
          await fetch('/api/v1/session', { credentials: 'same-origin' })
        ).json();
        for (const id of ids) {
          await fetch(`/api/v1/searches/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'X-CSRF-Token': session.csrf_token, Accept: 'application/json' },
          });
        }
      }, createdSearchIds)
      .catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
