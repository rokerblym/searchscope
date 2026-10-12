import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparisonPage } from './Comparison';
import * as api from '../api';
import { testSearch } from '../test-fixtures';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  getSearches: vi.fn(),
  compareSearches: vi.fn(),
}));
const right = { ...testSearch, id: 'search-two', query: 'clean energy', engine: 'bing' as const };
const response: api.ComparisonResponse = {
  left: testSearch,
  right,
  comparison: {
    overlapping_results: [
      {
        url: testSearch.results[0].url,
        title: testSearch.results[0].title,
        domain: testSearch.results[0].domain,
        left_position: 3,
        right_position: 1,
      },
    ],
    left_unique_results: [],
    right_unique_results: [],
    overlapping_domains: ['example.test'],
    left_unique_domains: [],
    right_unique_domains: [],
    position_changes: [
      {
        url: testSearch.results[0].url,
        domain: 'example.test',
        left_position: 3,
        right_position: 1,
      },
    ],
    left_result_count: 1,
    right_result_count: 1,
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.getSearches).mockResolvedValue({
    data: [testSearch, right],
    pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
  });
});

describe('Comparison', () => {
  it('compares existing snapshots and displays overlap and rank movement', async () => {
    vi.mocked(api.compareSearches).mockResolvedValue(response);
    render(<ComparisonPage initialSearchId={testSearch.id} />);
    fireEvent.change(await screen.findByLabelText('Right snapshot'), {
      target: { value: right.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare snapshots' }));
    expect(await screen.findByRole('link', { name: /Energy research/ })).toBeInTheDocument();
    expect(api.compareSearches).toHaveBeenCalledWith(testSearch.id, right.id);
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('Left position: 3')).toBeInTheDocument();
    expect(screen.getByText('Right position: 1')).toBeInTheDocument();
    expect(screen.getByText('Synthetic demo snapshots.')).toBeInTheDocument();
    expect(api.getSearches).toHaveBeenCalledWith({ per_page: 100, status: 'succeeded' });
  });

  it('requires distinct snapshots before requesting comparison', async () => {
    render(<ComparisonPage initialSearchId={testSearch.id} />);
    fireEvent.change(await screen.findByLabelText('Right snapshot'), {
      target: { value: testSearch.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare snapshots' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('two different');
    expect(api.compareSearches).not.toHaveBeenCalled();
  });

  it('reports comparison failure instead of displaying fabricated overlap', async () => {
    vi.mocked(api.compareSearches).mockRejectedValue(new Error('Snapshot no longer exists.'));
    render(<ComparisonPage initialSearchId={testSearch.id} />);
    fireEvent.change(await screen.findByLabelText('Right snapshot'), {
      target: { value: right.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare snapshots' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Snapshot no longer exists.');
    expect(screen.queryByText('Shared pages')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare snapshots' })).toBeEnabled();
  });
});
