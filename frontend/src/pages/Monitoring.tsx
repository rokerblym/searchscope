import { useEffect, useState } from 'react';
import { getAnalytics, getMonitoring, type Analytics, type Monitoring } from '../api';
import './supporting.css';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The request could not be completed.';
const rate = (value: number | null) => (value == null ? '—' : `${value.toFixed(1)}%`);

export function MonitoringPage() {
  const [monitoring, setMonitoring] = useState<Monitoring | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setErrors([]);
    Promise.allSettled([getMonitoring(), getAnalytics()]).then(([system, activity]) => {
      if (!current) return;
      const failures: string[] = [];
      if (system.status === 'fulfilled') setMonitoring(system.value);
      else {
        setMonitoring(null);
        failures.push(`System status: ${errorMessage(system.reason)}`);
      }
      if (activity.status === 'fulfilled') setAnalytics(activity.value);
      else {
        setAnalytics(null);
        failures.push(`Search analytics: ${errorMessage(activity.reason)}`);
      }
      setErrors(failures);
      setCheckedAt(new Date());
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEM & PROVIDER</p>
          <h1>API monitoring</h1>
          <p className="intro">
            Current service status and the search activity recorded for your account.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={loading}
          onClick={() => setAttempt((value) => value + 1)}
        >
          {loading ? 'Checking…' : 'Refresh status'}
        </button>
      </div>
      {loading && (
        <p className="notice" role="status">
          Checking services and search analytics…
        </p>
      )}
      {errors.length > 0 && (
        <div className="error-message" role="alert">
          <strong>Some monitoring data is unavailable.</strong>
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      {monitoring && !loading && (
        <>
          <div className="metric-grid support-service-grid">
            <article className="metric-card">
              <span className="muted">Rails API</span>
              <div className="support-service-value">
                <span
                  className={`support-status-dot ${monitoring.api_status === 'ok' ? 'is-good' : 'is-error'}`}
                />
                <strong>{monitoring.api_status === 'ok' ? 'Operational' : 'Unavailable'}</strong>
              </div>
              <p className="muted">Authenticated API is responding.</p>
            </article>
            <article className="metric-card">
              <span className="muted">MongoDB</span>
              <div className="support-service-value">
                <span
                  className={`support-status-dot ${monitoring.database_status === 'ok' ? 'is-good' : 'is-error'}`}
                />
                <strong>{monitoring.database_status === 'ok' ? 'Connected' : 'Unavailable'}</strong>
              </div>
              <p className="muted">Database status reported by the backend.</p>
            </article>
            <article className="metric-card">
              <span className="muted">Search provider</span>
              <div className="support-service-value">
                <span
                  className={`support-status-dot ${monitoring.provider_configured ? 'is-good' : 'is-error'}`}
                />
                <strong>{monitoring.provider === 'demo' ? 'Demo adapter' : 'SerpApi'}</strong>
              </div>
              <p className="muted">
                {monitoring.provider_configured ? 'Configured' : 'Missing configuration'} ·{' '}
                {monitoring.provider === 'demo' ? 'Synthetic data' : 'Credential presence only'}
              </p>
            </article>
          </div>
          {monitoring.provider === 'demo' ? (
            <p className="notice">
              Demo mode is active. Search results and provider activity are synthetic; no live
              provider requests are made.
            </p>
          ) : (
            <p className="notice">
              Provider configuration reflects server settings. Refreshing this page does not contact
              SerpApi or verify available credits.
            </p>
          )}
        </>
      )}

      {analytics && !loading && (
        <div className="metric-grid support-analytics-grid">
          <article className="metric-card">
            <span className="muted">Searches recorded</span>
            <strong className="support-metric-value">
              {analytics.total_searches.toLocaleString()}
            </strong>
            <p className="muted">Within the retained history</p>
          </article>
          <article className="metric-card">
            <span className="muted">Success rate</span>
            <strong className="support-metric-value">{rate(analytics.success_rate)}</strong>
            <p className="muted">
              {analytics.successful_searches.toLocaleString()} successful searches
            </p>
          </article>
          <article className="metric-card">
            <span className="muted">Error rate</span>
            <strong className="support-metric-value">{rate(analytics.error_rate)}</strong>
            <p className="muted">{analytics.failed_searches.toLocaleString()} failed searches</p>
          </article>
          <article className="metric-card">
            <span className="muted">Average duration</span>
            <strong className="support-metric-value">
              {analytics.average_duration_ms == null
                ? '—'
                : `${Math.round(analytics.average_duration_ms).toLocaleString()} ms`}
            </strong>
            <p className="muted">Recorded search execution time</p>
          </article>
        </div>
      )}

      <div className="page-grid support-monitoring-panels">
        <section className="panel" aria-labelledby="policy-heading">
          <div className="panel-heading">
            <h2 id="policy-heading">Server policy</h2>
            <span className="badge">Read only</span>
          </div>
          {monitoring && !loading ? (
            <dl className="support-definition-list">
              <div>
                <dt>Rate limit</dt>
                <dd>{monitoring.limits.searches_per_minute} searches per minute</dd>
              </div>
              <div>
                <dt>History retention</dt>
                <dd>{monitoring.retention_days} days</dd>
              </div>
              <div>
                <dt>Allowed engines</dt>
                <dd>
                  {monitoring.allowed_engines
                    .map((engine) => (engine === 'google' ? 'Google' : 'Bing'))
                    .join(', ')}
                </dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>{checkedAt?.toLocaleTimeString()}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">
              {loading ? 'Loading server policy…' : 'Server policy is currently unavailable.'}
            </p>
          )}
        </section>
        <section className="panel" aria-labelledby="provider-usage-heading">
          <div className="panel-heading">
            <h2 id="provider-usage-heading">Provider usage</h2>
            <span className="badge">Your account</span>
          </div>
          {analytics && !loading ? (
            analytics.provider_usage.length > 0 ? (
              <ul className="support-usage-list">
                {analytics.provider_usage.map((entry) => (
                  <li key={entry.provider}>
                    <span>
                      {entry.provider === 'demo'
                        ? 'Demo adapter'
                        : entry.provider === 'serpapi'
                          ? 'SerpApi'
                          : entry.provider}
                    </span>
                    <strong>{entry.count.toLocaleString()} searches</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No provider activity yet.</p>
              </div>
            )
          ) : (
            <p className="muted">
              {loading ? 'Loading provider usage…' : 'Provider usage is currently unavailable.'}
            </p>
          )}
          <p className="muted support-panel-note">
            Counts reflect saved searches, including failures. Billing and provider credit balances
            are not available here.
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="recent-errors-heading">
        <div className="panel-heading">
          <div>
            <h2 id="recent-errors-heading">Recent search errors</h2>
            <p className="muted">Failures recorded in your retained search history.</p>
          </div>
        </div>
        {analytics && !loading ? (
          analytics.recent_errors.length > 0 ? (
            <div className="table-wrap">
              <table className="support-history-table">
                <thead>
                  <tr>
                    <th scope="col">Query</th>
                    <th scope="col">Error</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_errors.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.query}</strong>
                        <div className="muted support-table-meta">
                          {record.engine === 'google' ? 'Google' : 'Bing'}
                        </div>
                      </td>
                      <td>
                        <span className="status-pill error">
                          {record.error?.code ?? 'search_failed'}
                        </span>
                        <p className="support-error-detail">
                          {record.error?.message ?? 'No additional error detail is available.'}
                        </p>
                      </td>
                      <td>{record.provider === 'demo' ? 'Demo' : 'SerpApi'}</td>
                      <td className="support-date-cell">
                        {new Date(record.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No recorded errors</h3>
              <p>
                {analytics.total_searches === 0
                  ? 'Run your first search to begin monitoring activity.'
                  : 'No failures appear in your retained history.'}
              </p>
            </div>
          )
        ) : (
          <p className="muted">
            {loading ? 'Loading recent errors…' : 'Recent errors are currently unavailable.'}
          </p>
        )}
      </section>
    </>
  );
}
