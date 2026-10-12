import { useState } from 'react';
import { ApiError, createSearch, type SearchEngine, type SearchRecord } from '../api';
import { formatDate, formatDuration } from '../format';
import { ResultsList } from '../ResultsList';

export function SearchExplorerPage({ onCompare }: { onCompare: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState<SearchEngine>('google');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchRecord | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setError('Enter a search query.');
      return;
    }
    setPending(true);
    setError(null);
    setSearch(null);
    try {
      setSearch(await createSearch({ query: normalized, engine }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Search could not be completed.');
      if (failure instanceof ApiError && failure.search) setSearch(failure.search);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEARCH INTELLIGENCE</p>
          <h1>Find the signal in every query.</h1>
          <p className="intro">Collect a result snapshot and explore the pages that matter.</p>
        </div>
        <span className="page-icon" aria-hidden="true">
          ⌕
        </span>
      </div>
      <section className="panel search-form-panel">
        <form onSubmit={submit}>
          <div className="search-form">
            <label className="field search-query">
              Search query
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. sustainable travel trends"
                maxLength={500}
                required
                disabled={pending}
              />
            </label>
            <label className="field">
              Search engine
              <select
                aria-label="Search engine"
                value={engine}
                onChange={(event) => setEngine(event.target.value as SearchEngine)}
                disabled={pending}
              >
                <option value="google">Google</option>
                <option value="bing">Bing</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? 'Searching…' : 'Run search'} <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="field-help">
            A search creates a snapshot in your history. Live provider mode uses one SerpApi
            request.
          </p>
        </form>
      </section>
      {pending && (
        <div className="panel empty-state" role="status">
          <div className="loader" />
          <h2>Collecting your results…</h2>
          <p>Waiting for the search provider response.</p>
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          <strong>Search could not be completed.</strong>
          <p>{error}</p>
          {search?.status === 'failed' && <p>This failed request was saved to your history.</p>}
        </div>
      )}
      {search && (
        <section className="panel search-results-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RESULT SNAPSHOT</p>
              <h2>{search.query}</h2>
              <p className="muted">
                {search.engine} · {formatDate(search.created_at)}
              </p>
            </div>
            <div className="heading-actions">
              <span className={`status-pill ${search.status}`}>
                {search.status === 'pending' ? 'In progress' : search.status}
              </span>
              {search.status === 'succeeded' && (
                <button className="btn btn-secondary" onClick={() => onCompare(search.id)}>
                  Compare snapshot
                </button>
              )}
            </div>
          </div>
          {search.provider === 'demo' && (
            <div className="notice">
              <strong>Synthetic demo results.</strong> These fixtures do not represent live search
              rankings.
            </div>
          )}
          <div className="snapshot-stats">
            <span>
              <strong>{search.results.length}</strong> organic results
            </span>
            <span>
              <strong>
                {search.status === 'pending' ? 'In progress' : formatDuration(search.duration_ms)}
              </strong>{' '}
              duration
            </span>
            <span>
              Provider <strong>{search.provider}</strong>
            </span>
            {search.metadata.total_results != null && (
              <span>
                <strong>{Number(search.metadata.total_results).toLocaleString()}</strong> estimated
                total results
              </span>
            )}
          </div>
          {search.status === 'succeeded' && <ResultsList results={search.results} />}
        </section>
      )}
      {!search && !pending && !error && (
        <section className="panel explorer-empty">
          <div className="search-illustration" aria-hidden="true">
            ⌕
          </div>
          <p className="eyebrow">YOUR NEXT DISCOVERY</p>
          <h2>One query. A new perspective.</h2>
          <p>
            Run a search to inspect result positions, domains, and snippets.
            <br />
            Each snapshot stays available in your search history.
          </p>
          <div className="suggested-queries">
            <span>Try a query</span>
            {['renewable energy', 'urban gardening', 'open source analytics'].map((suggestion) => (
              <button
                className="btn btn-secondary"
                key={suggestion}
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
