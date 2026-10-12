import type { Analytics, Monitoring, SearchRecord } from './api';

export const testUser = { id: 'user-one', email: 'researcher@example.test' };
export const testMonitoring: Monitoring = {
  api_status: 'ok',
  database_status: 'ok',
  provider: 'demo',
  provider_configured: true,
  retention_days: 30,
  allowed_engines: ['google', 'bing'],
  limits: { searches_per_minute: 10 },
};
export const testSearch: SearchRecord = {
  id: 'search-one',
  query: 'renewable energy',
  engine: 'google',
  provider: 'demo',
  status: 'succeeded',
  duration_ms: 45,
  created_at: '2026-10-12T10:00:00Z',
  results: [
    {
      title: 'Energy research',
      url: 'https://example.test/energy',
      snippet: 'A research summary.',
      domain: 'example.test',
      position: 1,
    },
  ],
  metadata: { total_results: 1 },
  error: null,
};
export const testAnalytics: Analytics = {
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
