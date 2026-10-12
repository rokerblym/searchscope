import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchExplorerPage } from './SearchExplorer';
import * as api from '../api';
import { testSearch } from '../test-fixtures';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  createSearch: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());

describe('Search Explorer', () => {
  it('displays unknown duration safely without turning it into a fabricated zero', async () => {
    vi.mocked(api.createSearch).mockResolvedValue({ ...testSearch, duration_ms: null });
    render(<SearchExplorerPage onCompare={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search query'), {
      target: { value: testSearch.query },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run search/ }));
    expect(await screen.findByRole('link', { name: /Energy research/ })).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByText('0 ms')).not.toBeInTheDocument();
  });

  it('submits a normalized query and chosen engine, then renders returned results', async () => {
    let resolve: (search: api.SearchRecord) => void = () => {};
    vi.mocked(api.createSearch).mockImplementation(
      () =>
        new Promise((complete) => {
          resolve = complete;
        }),
    );
    const onCompare = vi.fn();
    render(<SearchExplorerPage onCompare={onCompare} />);
    fireEvent.change(screen.getByLabelText('Search query'), {
      target: { value: '  renewable energy  ' },
    });
    fireEvent.change(screen.getByLabelText('Search engine'), { target: { value: 'bing' } });
    fireEvent.click(screen.getByRole('button', { name: /Run search/ }));
    expect(api.createSearch).toHaveBeenCalledWith({ query: 'renewable energy', engine: 'bing' });
    expect(screen.getByRole('status')).toHaveTextContent('Collecting your results');
    expect(screen.getByRole('button', { name: /Searching/ })).toBeDisabled();
    expect(screen.queryByText('Energy research')).not.toBeInTheDocument();
    await act(async () => resolve({ ...testSearch, engine: 'bing' }));
    const link = await screen.findByRole('link', { name: /Energy research/ });
    expect(link).toHaveAttribute('href', testSearch.results[0].url);
    expect(screen.getByText('Synthetic demo results.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compare snapshot' }));
    expect(onCompare).toHaveBeenCalledWith(testSearch.id);
  });

  it('shows provider failure and the saved failed snapshot without successful results', async () => {
    const failed: api.SearchRecord = {
      ...testSearch,
      status: 'failed',
      results: [],
      error: { code: 'rate_limited', message: 'Search rate limit reached.', retry_after: 30 },
    };
    vi.mocked(api.createSearch).mockRejectedValue(
      new api.ApiError(failed.error!.message, 'rate_limited', 429, {
        search: failed,
        retryAfter: 30,
      }),
    );
    render(<SearchExplorerPage onCompare={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search query'), {
      target: { value: 'renewable energy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run search/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Search rate limit reached.');
    expect(screen.getByRole('alert')).toHaveTextContent('saved to your history');
    expect(screen.queryByRole('link', { name: /Energy research/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run search/ })).toBeEnabled();
  });

  it('reports a network failure and permits another attempt', async () => {
    vi.mocked(api.createSearch)
      .mockRejectedValueOnce(new Error('Unable to reach API'))
      .mockResolvedValueOnce(testSearch);
    render(<SearchExplorerPage onCompare={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search query'), {
      target: { value: testSearch.query },
    });
    fireEvent.click(screen.getByRole('button', { name: /Run search/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach API');
    fireEvent.click(screen.getByRole('button', { name: /Run search/ }));
    expect(await screen.findByRole('link', { name: /Energy research/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
