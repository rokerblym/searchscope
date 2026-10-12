import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Analytics, Monitoring, SearchList, SearchRecord } from '../api';
import { HistoryPage } from './History';
import { MonitoringPage } from './Monitoring';
import { SettingsPage } from './Settings';

const api = vi.hoisted(() => ({
  getSearches: vi.fn(),
  getSearch: vi.fn(),
  deleteSearch: vi.fn(),
  getMonitoring: vi.fn(),
  getAnalytics: vi.fn(),
}));
vi.mock('../api', () => api);

const record: SearchRecord = {
  id: 'search-1',
  query: 'rails api',
  engine: 'google',
  provider: 'demo',
  status: 'succeeded',
  duration_ms: 12,
  created_at: '2026-10-12T10:00:00Z',
  error: null,
  metadata: {},
  results: [
    {
      title: 'A saved result',
      url: 'https://example.com/rails',
      domain: 'example.com',
      snippet: 'Saved result detail.',
      position: 1,
    },
  ],
};
const list = (records: SearchRecord[] = [record], page = 1, totalPages = 1): SearchList => ({
  data: records,
  pagination: {
    page,
    per_page: 10,
    total: records.length ? 10 * (totalPages - 1) + records.length : 0,
    total_pages: totalPages,
  },
});
const monitoring: Monitoring = {
  api_status: 'ok',
  database_status: 'ok',
  provider: 'demo',
  provider_configured: true,
  retention_days: 30,
  allowed_engines: ['google', 'bing'],
  limits: { searches_per_minute: 10 },
};
const analytics: Analytics = {
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

beforeEach(() => {
  vi.resetAllMocks();
  api.getSearches.mockResolvedValue(list());
  api.getSearch.mockResolvedValue(record);
  api.deleteSearch.mockResolvedValue(undefined);
  api.getMonitoring.mockResolvedValue(monitoring);
  api.getAnalytics.mockResolvedValue(analytics);
});

describe('HistoryPage', () => {
  it('renders in-flight snapshots with unknown duration and refreshes their saved details safely', async () => {
    const pending: SearchRecord = { ...record, status: 'pending', duration_ms: null, results: [] };
    api.getSearches.mockResolvedValue(list([pending]));
    api.getSearch.mockResolvedValueOnce(pending).mockResolvedValueOnce(record);
    render(<HistoryPage onCompare={vi.fn()} />);
    await screen.findByText('rails api');
    expect(
      within(screen.getByRole('row', { name: /rails api/ })).getAllByText('In progress'),
    ).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Compare rails api' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete rails api' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('still processing'));
    expect(screen.queryByRole('link', { name: /A saved result/ })).not.toBeInTheDocument();
    api.getSearches.mockResolvedValue(list([record]));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }));
    expect(await screen.findByRole('link', { name: /A saved result/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare rails api' })).toBeEnabled();
  });

  it('paginates history and applies normalized exact query, engine, and status filters from page one', async () => {
    api.getSearches.mockImplementation(({ page = 1 }) => Promise.resolve(list([record], page, 2)));
    render(<HistoryPage onCompare={vi.fn()} />);
    await screen.findByText('rails api');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(api.getSearches).toHaveBeenLastCalledWith({ page: 2, per_page: 10 }),
    );
    await waitFor(() => expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  Rails   API  ' } });
    fireEvent.change(screen.getByLabelText('Engine'), { target: { value: 'bing' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() =>
      expect(api.getSearches).toHaveBeenLastCalledWith({
        query: 'rails api',
        engine: 'bing',
        status: 'failed',
        page: 1,
        per_page: 10,
      }),
    );
  });

  it('fetches saved details, labels demo data, and forwards only the chosen search to comparison', async () => {
    const onCompare = vi.fn();
    render(<HistoryPage onCompare={onCompare} />);
    await screen.findByText('rails api');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByRole('link', { name: /A saved result/ })).toHaveAttribute(
      'href',
      'https://example.com/rails',
    );
    expect(screen.getByText(/These are synthetic results/)).toBeInTheDocument();
    expect(api.getSearch).toHaveBeenCalledWith('search-1');
    fireEvent.click(screen.getByRole('button', { name: 'Compare rails api' }));
    expect(onCompare).toHaveBeenCalledWith('search-1');
  });

  it('requires inline confirmation before deleting, preserves the record on failure, and reloads after success', async () => {
    api.deleteSearch
      .mockRejectedValueOnce(new Error('Deletion failed.'))
      .mockResolvedValueOnce(undefined);
    api.getSearches.mockResolvedValueOnce(list()).mockResolvedValueOnce(list([], 1, 0));
    render(<HistoryPage onCompare={vi.fn()} />);
    await screen.findByText('rails api');
    fireEvent.click(screen.getByRole('button', { name: 'Delete rails api' }));
    expect(api.deleteSearch).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('group', { name: 'Confirm deletion of rails api' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Deletion failed.');
    expect(screen.getByText('rails api')).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByText('Your search history starts here')).toBeInTheDocument();
    expect(api.deleteSearch).toHaveBeenCalledTimes(2);
  });

  it('shows a failed history request and recovers on retry', async () => {
    api.getSearches
      .mockRejectedValueOnce(new Error('History service unavailable.'))
      .mockResolvedValueOnce(list());
    render(<HistoryPage onCompare={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('History service unavailable.');
    expect(screen.queryByText('rails api')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('rails api');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('MonitoringPage', () => {
  it('reports real server policy and uses unknown rates rather than inventing success for an empty account', async () => {
    render(<MonitoringPage />);
    expect(await screen.findByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('10 searches per minute')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText(/Demo mode is active/)).toBeInTheDocument();
    expect(screen.getByText('No provider activity yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Run your first search to begin monitoring activity.'),
    ).toBeInTheDocument();
  });

  it('retains analytics when service monitoring fails and recovers after refreshing', async () => {
    api.getMonitoring
      .mockRejectedValueOnce(new Error('Database check failed.'))
      .mockResolvedValueOnce(monitoring);
    api.getAnalytics.mockResolvedValue({
      ...analytics,
      total_searches: 7,
      successful_searches: 7,
      success_rate: 100,
      error_rate: 0,
      average_duration_ms: 50,
    });
    render(<MonitoringPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Database check failed.');
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.queryByText('Operational')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    await screen.findByText('Operational');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('SettingsPage', () => {
  it('shows current account and actual readonly settings without requesting or exposing provider keys', async () => {
    api.getMonitoring.mockResolvedValue({
      ...monitoring,
      provider: 'serpapi',
      provider_configured: false,
      retention_days: 14,
      limits: { searches_per_minute: 3 },
    });
    render(<SettingsPage user={{ id: 'account-1', email: 'engineer@example.com' }} />);
    expect(screen.getByText('engineer@example.com')).toBeInTheDocument();
    expect(await screen.findByText('Not configured')).toBeInTheDocument();
    expect(screen.getByText('3 searches per minute')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText(/Provider keys remain on the server/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
