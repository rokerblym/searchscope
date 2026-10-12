import { useEffect, useState } from 'react';
import {
  deleteSearch,
  getSearch,
  getSearches,
  type SearchFilters,
  type SearchList,
  type SearchRecord,
} from '../api';
import { ResultsList } from '../ResultsList';
import { formatDuration } from '../format';
import './supporting.css';

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : 'The request could not be completed. Please try again.';

export function HistoryPage({ onCompare }: { onCompare: (id: string) => void }) {
  const [draft, setDraft] = useState({ query: '', engine: '', status: '' });
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<SearchList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    getSearches({ ...filters, page, per_page: 10 })
      .then((response) => {
        if (current) setHistory(response);
      })
      .catch((failure: unknown) => {
        if (current) setError(messageFrom(failure));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, page, attempt]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }
    let current = true;
    setSelected(null);
    setDetailLoading(true);
    setDetailError('');
    getSearch(selectedId)
      .then((response) => {
        if (current) setSelected(response);
      })
      .catch((failure: unknown) => {
        if (current) setDetailError(messageFrom(failure));
      })
      .finally(() => {
        if (current) setDetailLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selectedId, attempt]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      query: draft.query.trim().replace(/\s+/g, ' ').toLowerCase() || undefined,
      engine: draft.engine ? (draft.engine as SearchFilters['engine']) : undefined,
      status: draft.status ? (draft.status as SearchFilters['status']) : undefined,
    });
    setPage(1);
    setDeleteId(null);
    setDeleteError('');
  }

  function resetFilters() {
    setDraft({ query: '', engine: '', status: '' });
    setFilters({});
    setPage(1);
    setDeleteId(null);
    setDeleteError('');
  }

  async function confirmDelete(id: string) {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteSearch(id);
      if (selectedId === id) setSelectedId(null);
      setDeleteId(null);
      if (history?.data.length === 1 && page > 1) setPage(page - 1);
      else setAttempt((value) => value + 1);
    } catch (failure: unknown) {
      setDeleteError(messageFrom(failure));
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(filters.query || filters.engine || filters.status);
  const totalPages = Math.max(1, history?.pagination.total_pages ?? 1);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR SEARCH LIBRARY</p>
          <h1>Search history</h1>
          <p className="intro">
            Revisit results, inspect failures, and choose searches to compare.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={loading}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh history
        </button>
      </div>

      <section className="panel" aria-labelledby="history-heading">
        <div className="panel-heading">
          <div>
            <h2 id="history-heading">Saved searches</h2>
            <p className="muted">Only searches in your account appear here.</p>
          </div>
          <span className="badge">
            {history ? `${history.pagination.total} searches` : 'History'}
          </span>
        </div>
        <form className="filter-bar" onSubmit={applyFilters} aria-label="Search history filters">
          <label className="field support-query-field">
            Query — exact match
            <input
              type="search"
              value={draft.query}
              onChange={(event) => setDraft({ ...draft, query: event.target.value })}
              placeholder="Filter by a search query"
            />
            <span className="muted support-field-help">
              Matches the full query; case and extra spaces are ignored.
            </span>
          </label>
          <label className="field">
            Engine
            <select
              aria-label="Engine"
              value={draft.engine}
              onChange={(event) => setDraft({ ...draft, engine: event.target.value })}
            >
              <option value="">All engines</option>
              <option value="google">Google</option>
              <option value="bing">Bing</option>
            </select>
          </label>
          <label className="field">
            Status
            <select
              aria-label="Status"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="">All statuses</option>
              <option value="pending">In progress</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <div className="support-filter-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Apply filters
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={resetFilters}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </form>

        {loading && (
          <div className="empty-state" role="status">
            Loading your search history…
          </div>
        )}
        {!loading && error && (
          <div className="error-message" role="alert">
            <strong>History could not be loaded.</strong>
            <p>{error}</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && history && history.data.length === 0 && (
          <div className="empty-state">
            <h3>{hasFilters ? 'No matching searches' : 'Your search history starts here'}</h3>
            <p>
              {hasFilters
                ? 'Try another exact query or clear the filters.'
                : 'Run a query in Search Explorer to save your first search.'}
            </p>
          </div>
        )}
        {!loading && !error && history && history.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="support-history-table">
                <thead>
                  <tr>
                    <th scope="col">Query</th>
                    <th scope="col">Status</th>
                    <th scope="col">Results</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.query}</strong>
                        <div className="muted support-table-meta">
                          {record.engine === 'google' ? 'Google' : 'Bing'} ·{' '}
                          {record.provider === 'demo' ? 'Demo data' : 'SerpApi'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${record.status}`}>
                          {record.status === 'pending'
                            ? 'In progress'
                            : record.status === 'succeeded'
                              ? 'Succeeded'
                              : 'Failed'}
                        </span>
                      </td>
                      <td>{record.results.length}</td>
                      <td>
                        {record.status === 'pending'
                          ? 'In progress'
                          : formatDuration(record.duration_ms)}
                      </td>
                      <td className="support-date-cell">{formatDate(record.created_at)}</td>
                      <td>
                        <div className="support-row-actions">
                          <button
                            className="btn btn-secondary"
                            type="button"
                            aria-expanded={selectedId === record.id}
                            aria-controls="search-detail"
                            onClick={() =>
                              setSelectedId(selectedId === record.id ? null : record.id)
                            }
                          >
                            {selectedId === record.id ? 'Close' : 'View'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => onCompare(record.id)}
                            disabled={record.status !== 'succeeded'}
                            aria-label={`Compare ${record.query}`}
                          >
                            Compare
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            disabled={deleting || record.status === 'pending'}
                            onClick={() => {
                              setDeleteId(record.id);
                              setDeleteError('');
                            }}
                            aria-label={`Delete ${record.query}`}
                          >
                            Delete
                          </button>
                        </div>
                        {deleteId === record.id && (
                          <div
                            className="support-delete-confirm"
                            role="group"
                            aria-label={`Confirm deletion of ${record.query}`}
                          >
                            <p>Delete this search and its saved results?</p>
                            <div className="support-row-actions">
                              <button
                                className="btn btn-danger"
                                type="button"
                                disabled={deleting}
                                onClick={() => void confirmDelete(record.id)}
                              >
                                {deleting ? 'Deleting…' : 'Confirm delete'}
                              </button>
                              <button
                                className="btn btn-secondary"
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                            {deleteError && (
                              <p className="error-message" role="alert">
                                {deleteError}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span className="muted">
                Page {history.pagination.page} of {totalPages} · {history.pagination.total} matching
                searches
              </span>
              <div className="support-row-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage(page - 1);
                    setDeleteId(null);
                  }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage(page + 1);
                    setDeleteId(null);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedId && (
        <section
          className="panel support-detail-panel"
          id="search-detail"
          aria-labelledby="detail-heading"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SAVED RESULT DETAIL</p>
              <h2 id="detail-heading">{selected?.query ?? 'Search details'}</h2>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setSelectedId(null)}>
              Close details
            </button>
          </div>
          {detailLoading && (
            <p role="status" className="muted">
              Loading saved results…
            </p>
          )}
          {detailError && (
            <p role="alert" className="error-message">
              {detailError}
            </p>
          )}
          {selected && (
            <>
              <div className="support-detail-meta">
                <span className="badge">{selected.engine === 'google' ? 'Google' : 'Bing'}</span>
                <span className="badge">
                  {selected.provider === 'demo' ? 'Demo data' : 'SerpApi'}
                </span>
                <span className="muted">
                  {formatDate(selected.created_at)} ·{' '}
                  {selected.status === 'pending'
                    ? 'In progress'
                    : formatDuration(selected.duration_ms)}
                </span>
              </div>
              {selected.status === 'pending' && (
                <p className="notice" role="status">
                  This search is still processing. Refresh history to check its progress.
                </p>
              )}
              {selected.provider === 'demo' && (
                <p className="notice">
                  These are synthetic results generated for demonstration. They do not represent a
                  live search.
                </p>
              )}
              {selected.error && (
                <div className="error-message" role="alert">
                  <strong>Search failed · {selected.error.code}</strong>
                  <p>{selected.error.message}</p>
                  {selected.error.retry_after != null && (
                    <p>Suggested retry delay: {selected.error.retry_after} seconds.</p>
                  )}
                </div>
              )}
              {selected.status === 'succeeded' && selected.results.length === 0 && (
                <p className="empty-state">This search returned no saved organic results.</p>
              )}
              {selected.results.length > 0 && <ResultsList results={selected.results} />}
            </>
          )}
        </section>
      )}
    </>
  );
}
