import { useEffect, useState } from 'react';
import { compareSearches, getSearches, type ComparisonResponse, type SearchRecord } from '../api';
import { externalUrl, formatDate } from '../format';
import { ResultsList } from '../ResultsList';

export function ComparisonPage({ initialSearchId }: { initialSearchId?: string }) {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [leftId, setLeftId] = useState(initialSearchId ?? '');
  const [rightId, setRightId] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    getSearches({ per_page: 100, status: 'succeeded' })
      .then((response) => {
        if (current) {
          setSearches(response.data);
          setLoading(false);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(failure instanceof Error ? failure.message : 'Unable to load saved searches.');
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leftId || !rightId) {
      setError('Choose two saved searches to compare.');
      return;
    }
    if (leftId === rightId) {
      setError('Choose two different search snapshots.');
      return;
    }
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await compareSearches(leftId, rightId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to compare these snapshots.');
    } finally {
      setPending(false);
    }
  }

  const comparison = result?.comparison;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SIDE BY SIDE INTELLIGENCE</p>
          <h1>Compare results. See what changed.</h1>
          <p className="intro">
            Find shared pages, unique domains, and movement across saved snapshots.
          </p>
        </div>
        <span className="page-icon" aria-hidden="true">
          ⇄
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Choose your snapshots</h2>
            <p className="muted">
              Compare up to the 100 most recent successful searches. No additional provider
              requests.
            </p>
          </div>
        </div>
        {loading ? (
          <p className="loading-message" role="status">
            Loading saved snapshots…
          </p>
        ) : searches.length < 2 ? (
          <div className="empty-state">
            <h3>Two snapshots make a comparison.</h3>
            <p>Run at least two successful searches, then return to compare their results.</p>
            <a className="btn btn-secondary" href="#/search">
              Open Search Explorer
            </a>
          </div>
        ) : (
          <form className="comparison-form" onSubmit={submit}>
            <div className="form-grid">
              <label className="field">
                Left snapshot
                <select
                  aria-label="Left snapshot"
                  value={leftId}
                  onChange={(event) => {
                    setLeftId(event.target.value);
                    setResult(null);
                  }}
                  required
                  disabled={pending}
                >
                  <option value="">Choose a saved search</option>
                  {searches.map((search) => (
                    <option key={search.id} value={search.id}>
                      {search.query} · {search.engine} · {formatDate(search.created_at)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="comparison-divider" aria-hidden="true">
                ⇄
              </span>
              <label className="field">
                Right snapshot
                <select
                  aria-label="Right snapshot"
                  value={rightId}
                  onChange={(event) => {
                    setRightId(event.target.value);
                    setResult(null);
                  }}
                  required
                  disabled={pending}
                >
                  <option value="">Choose a saved search</option>
                  {searches.map((search) => (
                    <option key={search.id} value={search.id}>
                      {search.query} · {search.engine} · {formatDate(search.created_at)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? 'Comparing…' : 'Compare snapshots'}
            </button>
          </form>
        )}
      </section>
      {error && (
        <div className="error-message" role="alert">
          {error}
          {!searches.length && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setError(null);
                setLoading(true);
                setAttempt((value) => value + 1);
              }}
            >
              Retry loading snapshots
            </button>
          )}
        </div>
      )}
      {pending && (
        <p className="loading-message" role="status">
          Comparing saved results…
        </p>
      )}
      {result && comparison && (
        <>
          {(result.left.provider === 'demo' || result.right.provider === 'demo') && (
            <div className="notice">
              <strong>Synthetic demo snapshots.</strong> This comparison uses fixture data and does
              not describe live rankings.
            </div>
          )}
          <div className="comparison-title">
            <span>
              <small>LEFT SNAPSHOT</small>
              <strong>{result.left.query}</strong>
              <span className="muted">{result.left.engine}</span>
            </span>
            <span aria-hidden="true">⇄</span>
            <span>
              <small>RIGHT SNAPSHOT</small>
              <strong>{result.right.query}</strong>
              <span className="muted">{result.right.engine}</span>
            </span>
          </div>
          <div className="metric-grid comparison-metrics">
            <div className="metric-card">
              <span>Shared pages</span>
              <strong>{comparison.overlapping_results.length}</strong>
              <small>Present in both snapshots</small>
            </div>
            <div className="metric-card">
              <span>Unique to left</span>
              <strong>{comparison.left_unique_results.length}</strong>
              <small>Of {comparison.left_result_count} results</small>
            </div>
            <div className="metric-card">
              <span>Unique to right</span>
              <strong>{comparison.right_unique_results.length}</strong>
              <small>Of {comparison.right_result_count} results</small>
            </div>
            <div className="metric-card">
              <span>Shared domains</span>
              <strong>{comparison.overlapping_domains.length}</strong>
              <small>Domains in both snapshots</small>
            </div>
          </div>
          <div className="page-grid comparison-results">
            <section className="panel">
              <div className="panel-heading">
                <h2>Shared pages</h2>
                <span className="badge">{comparison.overlapping_results.length}</span>
              </div>
              {comparison.overlapping_results.length ? (
                <ol className="results-list">
                  {comparison.overlapping_results.map((item) => {
                    const href = externalUrl(item.url);
                    return (
                      <li className="result-item" key={item.url}>
                        <div>
                          <span className="result-domain">{item.domain}</span>
                          <h3>
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {item.title || item.url}
                                <span className="external-arrow" aria-hidden="true">
                                  {' '}
                                  ↗
                                </span>
                              </a>
                            ) : (
                              item.title || item.url
                            )}
                          </h3>
                          <div className="heading-actions">
                            <span className="badge">
                              Left position: {item.left_position ?? 'Unavailable'}
                            </span>
                            <span className="badge">
                              Right position: {item.right_position ?? 'Unavailable'}
                            </span>
                          </div>
                          <span className="result-url">{item.url}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="empty-state">
                  <p>No shared pages across these snapshots.</p>
                </div>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Unique to left</h2>
                <span className="badge">{comparison.left_unique_results.length}</span>
              </div>
              <ResultsList
                results={comparison.left_unique_results}
                emptyMessage="Every left result is also in the right snapshot."
              />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Unique to right</h2>
                <span className="badge">{comparison.right_unique_results.length}</span>
              </div>
              <ResultsList
                results={comparison.right_unique_results}
                emptyMessage="Every right result is also in the left snapshot."
              />
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DOMAIN OVERLAP</p>
                <h2>Where the results converge</h2>
              </div>
            </div>
            <div className="domain-comparison">
              {[
                { label: 'Shared domains', items: comparison.overlapping_domains },
                { label: 'Only in left', items: comparison.left_unique_domains },
                { label: 'Only in right', items: comparison.right_unique_domains },
              ].map((group) => (
                <div key={group.label}>
                  <h3>{group.label}</h3>
                  <div className="domain-tags">
                    {group.items.length ? (
                      group.items.map((domain) => (
                        <span key={domain} className="badge">
                          {domain}
                        </span>
                      ))
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">RANK MOVEMENT</p>
                <h2>Positions of shared pages</h2>
                <p className="muted">
                  Position change is left rank minus right rank; a positive change means a higher
                  rank on the right.
                </p>
              </div>
            </div>
            {comparison.position_changes.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Left position</th>
                      <th>Right position</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.position_changes.map((item) => (
                      <tr key={item.url}>
                        <td>
                          <strong>{item.domain}</strong>
                          <span className="result-url">{item.url}</span>
                        </td>
                        <td>{item.left_position ?? '—'}</td>
                        <td>{item.right_position ?? '—'}</td>
                        <td>
                          {item.left_position == null || item.right_position == null
                            ? 'Unavailable'
                            : `${item.left_position - item.right_position > 0 ? '+' : ''}${item.left_position - item.right_position}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No shared ranked pages to compare.</p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
