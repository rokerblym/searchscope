import { useEffect, useState } from 'react';
import { getAnalytics, getSearches, type Analytics, type SearchRecord } from '../api';
import { formatDate, formatDuration, formatRate } from '../format';

export function DashboardPage({ onSearch }: { onSearch: () => void }) {
  const [data, setData] = useState<{ analytics: Analytics; recent: SearchRecord[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let current = true;
    Promise.all([getAnalytics(), getSearches({ per_page: 5 })])
      .then(([analytics, recent]) => {
        if (current) {
          setData({ analytics, recent: recent.data });
          setPending(false);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(failure instanceof Error ? failure.message : 'Unable to load analytics.');
          setPending(false);
        }
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  const analytics = data?.analytics;
  const maximumDomainCount = Math.max(
    1,
    ...(analytics?.top_domains.map((item) => item.count) ?? []),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR SEARCH WORKSPACE</p>
          <h1>A clearer view of every search.</h1>
          <p className="intro">
            Explore the signal. Understand performance. Keep your research moving.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onSearch}>
          New search <span aria-hidden="true">↗</span>
        </button>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setPending(true);
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {pending && (
        <p className="loading-message" role="status">
          Loading your search analytics…
        </p>
      )}
      {analytics && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Total searches</span>
              <strong>{analytics.total_searches.toLocaleString()}</strong>
              <small>Recorded in retained history</small>
            </div>
            <div className="metric-card">
              <span>Success rate</span>
              <strong>{formatRate(analytics.success_rate)}</strong>
              <small>{analytics.successful_searches} succeeded</small>
            </div>
            <div className="metric-card">
              <span>Average response</span>
              <strong>{formatDuration(analytics.average_duration_ms)}</strong>
              <small>Across recorded requests</small>
            </div>
            <div className="metric-card">
              <span>Failed searches</span>
              <strong>{analytics.failed_searches}</strong>
              <small>{formatRate(analytics.error_rate)} error rate</small>
            </div>
          </div>
          <div className="page-grid dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ORGANIC VISIBILITY</p>
                  <h2>Most frequent domains</h2>
                </div>
                <span className="badge">Your results</span>
              </div>
              {analytics.top_domains.length ? (
                <div className="domain-chart">
                  {analytics.top_domains.map((item) => (
                    <div key={item.domain}>
                      <div className="domain-chart-label">
                        <span>{item.domain}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="domain-chart-track">
                        <span style={{ width: `${(item.count / maximumDomainCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-symbol" aria-hidden="true">
                    ⌕
                  </span>
                  <h3>Your next insight starts with a search.</h3>
                  <p>Domains will appear here after you collect results.</p>
                  <button className="btn btn-secondary" onClick={onSearch}>
                    Explore a query
                  </button>
                </div>
              )}
            </section>
            <section className="panel provider-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">REQUEST DISTRIBUTION</p>
                  <h2>Provider usage</h2>
                </div>
              </div>
              {analytics.provider_usage.length ? (
                <div className="provider-list">
                  {analytics.provider_usage.map((item) => (
                    <div key={item.provider}>
                      <span className="provider-symbol" aria-hidden="true">
                        ◈
                      </span>
                      <span>{item.provider === 'demo' ? 'Demo fixtures' : item.provider}</span>
                      <strong>
                        {item.count}
                        <small> searches</small>
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No provider requests recorded yet.</p>
                </div>
              )}
              <p className="panel-note">
                Usage counts reflect your saved search requests. Demo fixtures are synthetic data.
              </p>
            </section>
          </div>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">LATEST ACTIVITY</p>
                <h2>Recent searches</h2>
              </div>
              <a className="text-link" href="#/history">
                View history ↗
              </a>
            </div>
            {data?.recent.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Engine</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((search) => (
                      <tr key={search.id}>
                        <td className="query-cell">{search.query}</td>
                        <td>
                          <span className="engine-label">{search.engine}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${search.status}`}>
                            {search.status === 'pending' ? 'In progress' : search.status}
                          </span>
                        </td>
                        <td>
                          {search.status === 'pending'
                            ? 'In progress'
                            : formatDuration(search.duration_ms)}
                        </td>
                        <td className="muted">{formatDate(search.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>Your search history is empty. Run a query to create your first snapshot.</p>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
