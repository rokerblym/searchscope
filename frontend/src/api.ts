export type SearchEngine = 'google' | 'bing';
export type SearchProvider = 'serpapi' | 'demo';
export type SearchStatus = 'pending' | 'succeeded' | 'failed';

export type SearchResult = {
  title: string;
  url: string;
  snippet: string | null;
  position: number | null;
  domain: string;
};

export type ApiFailure = {
  code: string;
  message: string;
  retry_after?: number;
};

export type SearchRecord = {
  id: string;
  query: string;
  engine: SearchEngine;
  provider: SearchProvider;
  status: SearchStatus;
  duration_ms: number | null;
  created_at: string;
  results: SearchResult[];
  metadata: { provider_search_id?: string; total_results?: number };
  error: ApiFailure | null;
};

export type User = { id: string; email: string };

export type Session = {
  authenticated: boolean;
  user: User | null;
  csrf_token: string;
};

export type AuthResponse = { user: User; csrf_token: string };
export type Credentials = { email: string; password: string };

export type SearchFilters = {
  page?: number;
  per_page?: number;
  status?: SearchStatus | '';
  engine?: SearchEngine | '';
  query?: string;
};

export type SearchList = {
  data: SearchRecord[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
};

export type Analytics = {
  total_searches: number;
  successful_searches: number;
  failed_searches: number;
  success_rate: number | null;
  error_rate: number | null;
  average_duration_ms: number | null;
  top_domains: { domain: string; count: number }[];
  provider_usage: { provider: SearchProvider; count: number }[];
  recent_errors: SearchRecord[];
};

export type Monitoring = {
  api_status: 'ok';
  database_status: 'ok' | 'unavailable';
  provider: SearchProvider;
  provider_configured: boolean;
  retention_days: number;
  allowed_engines: SearchEngine[];
  limits: { searches_per_minute: number };
  [key: string]: unknown;
};

export type ComparisonResponse = {
  left: SearchRecord;
  right: SearchRecord;
  comparison: {
    overlapping_results: {
      url: string;
      title: string;
      domain: string;
      left_position: number | null;
      right_position: number | null;
    }[];
    left_unique_results: SearchResult[];
    right_unique_results: SearchResult[];
    overlapping_domains: string[];
    left_unique_domains: string[];
    right_unique_domains: string[];
    position_changes: {
      url: string;
      domain: string;
      left_position: number | null;
      right_position: number | null;
    }[];
    left_result_count: number;
    right_result_count: number;
    left_total_results?: number | null;
    right_total_results?: number | null;
  };
};

type ErrorDetails = { search?: SearchRecord; retryAfter?: number };

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly search?: SearchRecord;
  readonly retryAfter?: number;

  constructor(message: string, code: string, status: number, details: ErrorDetails = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.search = details.search;
    this.retryAfter = details.retryAfter;
  }
}

const API_BASE = '/api/v1';
let csrfToken: string | null = null;
let pendingSession: Promise<Session> | null = null;

/** Tokens stay in memory; the browser manages the HTTP-only session cookie. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token && token.trim() ? token : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResponse(status: number): ApiError {
  return new ApiError(
    'The API returned an invalid response. Please try again.',
    'invalid_response',
    status,
  );
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!pendingSession) {
    pendingSession = getSession().finally(() => {
      pendingSession = null;
    });
  }
  await pendingSession;
  // getSession validates the token before resolving.
  if (!csrfToken) throw invalidResponse(200);
  return csrfToken;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  allowEmpty?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = await ensureCsrfToken();
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (isObject(error) && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Unable to reach the SearchScope API. Please try again.',
      'network_error',
      0,
    );
  }

  if (response.status === 204 && response.ok) {
    if (options.allowEmpty) return undefined as T;
    throw invalidResponse(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw invalidResponse(response.status);
    throw new ApiError(
      `The API request failed (HTTP ${response.status}). Please try again.`,
      'http_error',
      response.status,
    );
  }

  if (!response.ok) {
    const failure = isObject(payload) && isObject(payload.error) ? payload.error : null;
    const message =
      failure && typeof failure.message === 'string' && failure.message.trim()
        ? failure.message
        : `The API request failed (HTTP ${response.status}). Please try again.`;
    const code =
      failure && typeof failure.code === 'string' && failure.code.trim()
        ? failure.code
        : 'http_error';
    const search =
      isObject(payload) && isObject(payload.search) ? (payload.search as SearchRecord) : undefined;
    const retryAfter =
      failure && typeof failure.retry_after === 'number' && Number.isFinite(failure.retry_after)
        ? failure.retry_after
        : undefined;
    throw new ApiError(message, code, response.status, { search, retryAfter });
  }

  if (!isObject(payload)) throw invalidResponse(response.status);
  return payload as T;
}

function rememberCsrf<T extends { csrf_token: string }>(payload: T): T {
  if (typeof payload.csrf_token !== 'string' || !payload.csrf_token.trim())
    throw invalidResponse(200);
  setCsrfToken(payload.csrf_token);
  return payload;
}

export async function getSession(signal?: AbortSignal): Promise<Session> {
  return rememberCsrf(await request<Session>('/session', { signal }));
}

export async function register(credentials: Credentials): Promise<AuthResponse> {
  return rememberCsrf(
    await request<AuthResponse>('/auth/register', { method: 'POST', body: credentials }),
  );
}

export async function login(credentials: Credentials): Promise<AuthResponse> {
  return rememberCsrf(
    await request<AuthResponse>('/auth/login', { method: 'POST', body: credentials }),
  );
}

export async function logout(): Promise<{ csrf_token: string }> {
  return rememberCsrf(await request<{ csrf_token: string }>('/auth/logout', { method: 'DELETE' }));
}

export function getSearches(
  filters: SearchFilters = {},
  signal?: AbortSignal,
): Promise<SearchList> {
  const params = new URLSearchParams();
  for (const key of ['page', 'per_page', 'status', 'engine', 'query'] as const) {
    const value = filters[key];
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return request<SearchList>(`/searches${query ? `?${query}` : ''}`, { signal });
}

export function getSearch(id: string, signal?: AbortSignal): Promise<SearchRecord> {
  return request<SearchRecord>(`/searches/${encodeURIComponent(id)}`, { signal });
}

export function createSearch(search: {
  query: string;
  engine: SearchEngine;
}): Promise<SearchRecord> {
  return request<SearchRecord>('/searches', { method: 'POST', body: search });
}

export function deleteSearch(id: string): Promise<void> {
  return request<void>(`/searches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    allowEmpty: true,
  });
}

export function compareSearches(leftId: string, rightId: string): Promise<ComparisonResponse> {
  return request<ComparisonResponse>('/comparisons', {
    method: 'POST',
    body: { left_search_id: leftId, right_search_id: rightId },
  });
}

export function getAnalytics(signal?: AbortSignal): Promise<Analytics> {
  return request<Analytics>('/analytics', { signal });
}

export function getMonitoring(signal?: AbortSignal): Promise<Monitoring> {
  return request<Monitoring>('/monitoring', { signal });
}
