import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  compareSearches,
  createSearch,
  deleteSearch,
  getAnalytics,
  getMonitoring,
  getSearch,
  getSearches,
  getSession,
  login,
  logout,
  register,
  setCsrfToken,
  type SearchRecord,
} from './api';

const user = { id: 'user-1', email: 'developer@example.com' };
const search: SearchRecord = {
  id: 'search-1',
  query: 'SearchScope',
  engine: 'google',
  provider: 'demo',
  status: 'succeeded',
  duration_ms: 25,
  created_at: '2026-10-12T10:00:00Z',
  results: [
    {
      title: 'SearchScope',
      url: 'https://example.com',
      domain: 'example.com',
      position: 1,
      snippet: null,
    },
  ],
  metadata: {},
  error: null,
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  setCsrfToken(null);
  vi.unstubAllGlobals();
});

describe('session and authentication requests', () => {
  it('uses browser-managed same-origin cookies and remembers the session CSRF token for writes', async () => {
    const session = { authenticated: false, user: null, csrf_token: 'session-token' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json(search, 201));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(getSession(controller.signal)).resolves.toEqual(session);
    await expect(createSearch({ query: 'SearchScope', engine: 'google' })).resolves.toEqual(search);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/searches', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'session-token',
      },
      body: JSON.stringify({ query: 'SearchScope', engine: 'google' }),
    });
  });

  it.each(['login', 'register'] as const)(
    'bootstraps a missing CSRF token before %s and sends credentials only in the JSON body',
    async (operation) => {
      const credentials = { email: user.email, password: 'sample-password-123' };
      const authenticated = { user, csrf_token: 'authenticated-token' };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          json({ authenticated: false, user: null, csrf_token: 'anonymous-token' }),
        )
        .mockResolvedValueOnce(json(authenticated))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);

      await expect((operation === 'login' ? login : register)(credentials)).resolves.toEqual(
        authenticated,
      );
      await deleteSearch('search-1');

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/v1/session',
        expect.objectContaining({ credentials: 'same-origin' }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/v1/auth/${operation}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'anonymous-token',
        },
        body: JSON.stringify(credentials),
      });
      expect(fetchMock.mock.calls[2]?.[1].headers['X-CSRF-Token']).toBe('authenticated-token');
    },
  );

  it('shares the session bootstrap when writes start concurrently', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          path === '/api/v1/session'
            ? json({ authenticated: false, user: null, csrf_token: 'shared-token' })
            : json(search, 201),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      createSearch({ query: 'first', engine: 'google' }),
      createSearch({ query: 'second', engine: 'bing' }),
    ]);

    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/v1/session')).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/v1/searches')).toHaveLength(2);
    for (const [, options] of fetchMock.mock.calls.slice(1)) {
      expect(options.headers['X-CSRF-Token']).toBe('shared-token');
    }
  });

  it('rotates the remembered CSRF token on logout and omits JSON content headers when there is no body', async () => {
    setCsrfToken('authenticated-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ csrf_token: 'signed-out-token' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(logout()).resolves.toEqual({ csrf_token: 'signed-out-token' });
    await deleteSearch('search-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/auth/logout', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-CSRF-Token': 'authenticated-token' },
    });
    expect(fetchMock.mock.calls[1]?.[1].headers['X-CSRF-Token']).toBe('signed-out-token');
  });

  it('does not submit a write when the session response lacks a CSRF token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ authenticated: false, user: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      login({ email: user.email, password: 'sample-password-123' }),
    ).rejects.toMatchObject({
      code: 'invalid_response',
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('search and reporting requests', () => {
  it('encodes pagination and exact query filters without interpreting query text as a URL', async () => {
    const payload = {
      data: [search],
      pagination: { page: 2, per_page: 20, total: 21, total_pages: 2 },
    };
    const fetchMock = vi.fn().mockResolvedValue(json(payload));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getSearches({
        page: 2,
        per_page: 20,
        status: 'succeeded',
        engine: 'google',
        query: 'c++ & data/AI?',
      }),
    ).resolves.toEqual(payload);

    const [path, options] = fetchMock.mock.calls[0]!;
    const url = new URL(path, 'https://searchscope.example');
    expect(url.pathname).toBe('/api/v1/searches');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      per_page: '20',
      status: 'succeeded',
      engine: 'google',
      query: 'c++ & data/AI?',
    });
    expect(options).toEqual({
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  });

  it('omits unset or empty optional filters', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await getSearches({ status: '', engine: '', query: '' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/searches');
  });

  it('encodes record IDs and accepts an empty 204 response when deleting', async () => {
    setCsrfToken('csrf-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(search))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSearch('id/with?special#characters')).resolves.toEqual(search);
    await expect(deleteSearch('id/with?special#characters')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/searches/id%2Fwith%3Fspecial%23characters');
    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/v1/searches/id%2Fwith%3Fspecial%23characters',
      {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-CSRF-Token': 'csrf-token' },
      },
    ]);
  });

  it('posts comparison record IDs using the agreed backend field names', async () => {
    setCsrfToken('csrf-token');
    const response = {
      left: search,
      right: search,
      comparison: {
        overlapping_results: search.results,
        left_unique_results: [],
        right_unique_results: [],
        overlapping_domains: ['example.com'],
        left_unique_domains: [],
        right_unique_domains: [],
        position_changes: [],
        left_result_count: 1,
        right_result_count: 1,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(json(response));
    vi.stubGlobal('fetch', fetchMock);

    await expect(compareSearches('left-id', 'right-id')).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/comparisons', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'csrf-token',
      },
      body: JSON.stringify({ left_search_id: 'left-id', right_search_id: 'right-id' }),
    });
  });

  it('preserves null analytics rates and additional monitoring fields without rejecting them', async () => {
    const analytics = {
      total_searches: 0,
      successful_searches: 0,
      failed_searches: 0,
      success_rate: null,
      error_rate: null,
      average_duration_ms: null,
      top_domains: [],
      provider_usage: [],
      recent_errors: [],
    };
    const monitoring = {
      api_status: 'ok',
      database_status: 'ok',
      provider: 'demo',
      provider_configured: false,
      retention_days: 30,
      allowed_engines: ['google', 'bing'],
      limits: { searches_per_minute: 10 },
      future_metric: 123,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(analytics))
      .mockResolvedValueOnce(json(monitoring));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAnalytics()).resolves.toEqual(analytics);
    await expect(getMonitoring()).resolves.toEqual(monitoring);

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/analytics',
      '/api/v1/monitoring',
    ]);
  });
});

describe('API errors', () => {
  it('preserves a serialized failed search, API error code, and retry interval on provider failure', async () => {
    setCsrfToken('csrf-token');
    const failedSearch = {
      ...search,
      status: 'failed',
      results: [],
      error: { code: 'provider_rate_limited', message: 'Provider limit reached.', retry_after: 30 },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ error: failedSearch.error, search: failedSearch }, 429)),
    );

    await expect(createSearch({ query: 'SearchScope', engine: 'google' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
      code: 'provider_rate_limited',
      message: 'Provider limit reached.',
      search: failedSearch,
      retryAfter: 30,
    });
  });

  it('returns safe HTTP errors for non-JSON server responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<html>private diagnostic details</html>', { status: 502 }),
        ),
    );

    await expect(getSearches()).rejects.toMatchObject({
      code: 'http_error',
      status: 502,
      message: 'The API request failed (HTTP 502). Please try again.',
    });
  });

  it('uses a safe fallback for malformed error payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ error: { code: 123, message: ['unexpected detail'], retry_after: '30' } }, 500),
        ),
    );

    await expect(getMonitoring()).rejects.toMatchObject({
      code: 'http_error',
      status: 500,
      retryAfter: undefined,
    });
  });

  it.each(['{broken JSON', 'null', '[]', '"unexpected"'])(
    'rejects invalid successful JSON payloads: %s',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));

      await expect(getSearches()).rejects.toMatchObject({
        name: 'ApiError',
        code: 'invalid_response',
        status: 200,
      });
    },
  );

  it('rejects an empty success when an endpoint requires JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(getAnalytics()).rejects.toMatchObject({ code: 'invalid_response', status: 204 });
  });

  it('wraps network failures without exposing the raw exception text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('private proxy diagnostics')));

    const error: unknown = await getSearches().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      code: 'network_error',
      message: 'Unable to reach the SearchScope API. Please try again.',
    });
  });

  it('preserves request cancellation so callers can ignore aborted reads', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValue(abort);
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMonitoring(controller.signal)).rejects.toBe(abort);
    expect(fetchMock.mock.calls[0]?.[1].signal).toBe(controller.signal);
  });
});
