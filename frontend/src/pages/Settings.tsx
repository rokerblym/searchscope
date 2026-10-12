import { useEffect, useState } from 'react';
import { getMonitoring, type Monitoring, type User } from '../api';
import './supporting.css';

export function SettingsPage({ user }: { user: User }) {
  const [monitoring, setMonitoring] = useState<Monitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    getMonitoring()
      .then((response) => {
        if (current) setMonitoring(response);
      })
      .catch((failure: unknown) => {
        if (current)
          setError(
            failure instanceof Error ? failure.message : 'Server settings could not be loaded.',
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCOUNT & CONFIGURATION</p>
          <h1>Settings</h1>
          <p className="intro">
            Your account details and the active configuration of this workspace.
          </p>
        </div>
      </div>
      <div className="page-grid support-settings-grid">
        <section className="panel" aria-labelledby="account-heading">
          <div className="panel-heading">
            <h2 id="account-heading">Your account</h2>
            <span className="badge">Signed in</span>
          </div>
          <div className="support-account-avatar" aria-hidden="true">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <dl className="support-definition-list">
            <div>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd className="support-account-id">{user.id}</dd>
            </div>
          </dl>
          <p className="muted support-panel-note">
            Search history, comparisons, and analytics are scoped to this account.
          </p>
        </section>

        <section className="panel" aria-labelledby="configuration-heading">
          <div className="panel-heading">
            <h2 id="configuration-heading">Server configuration</h2>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={loading}
              onClick={() => setAttempt((value) => value + 1)}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {loading && (
            <p className="muted" role="status">
              Loading active server settings…
            </p>
          )}
          {!loading && error && (
            <div className="error-message" role="alert">
              <strong>Settings are unavailable.</strong>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && monitoring && (
            <dl className="support-definition-list">
              <div>
                <dt>Search provider</dt>
                <dd>
                  {monitoring.provider === 'demo' ? 'Demo adapter' : 'SerpApi'}{' '}
                  <span
                    className={`status-pill ${monitoring.provider_configured ? 'success' : 'error'}`}
                  >
                    {monitoring.provider_configured ? 'Configured' : 'Not configured'}
                  </span>
                </dd>
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
                <dt>Search rate limit</dt>
                <dd>{monitoring.limits.searches_per_minute} searches per minute</dd>
              </div>
              <div>
                <dt>History retention</dt>
                <dd>{monitoring.retention_days} days</dd>
              </div>
            </dl>
          )}
          <p className="muted support-panel-note">
            These settings are controlled by the server and are read only in this workspace.
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="provider-settings-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PROVIDER & DATA</p>
            <h2 id="provider-settings-heading">How your searches run</h2>
          </div>
          <span className="badge">Server managed</span>
        </div>
        {!loading && !error && monitoring ? (
          monitoring.provider === 'demo' ? (
            <>
              <p className="notice">
                Demo mode is active. Results are synthetic examples, and no requests are sent to a
                live search provider.
              </p>
              <p>
                Demo searches support the same history, comparison, and analytics workflows so you
                can explore the application without consuming provider credits.
              </p>
              <p className="muted">
                Live SerpApi search requires the workspace administrator to select the SerpApi
                provider and configure its key securely on the server.
              </p>
            </>
          ) : (
            <>
              <p>
                Search requests are sent through the backend to SerpApi.{' '}
                {monitoring.provider_configured
                  ? 'The server reports that provider credentials are configured.'
                  : 'The server reports missing provider configuration; live searches may be unavailable.'}
              </p>
              <p className="notice">
                Provider keys remain on the server. They are never displayed or edited in this
                browser.
              </p>
              <p className="muted">
                Configured credentials do not confirm provider availability or credit balance. Check
                API Monitoring for recorded search failures.
              </p>
            </>
          )
        ) : (
          <p className="muted">
            {loading
              ? 'Loading provider information…'
              : 'Provider information will appear when server settings can be loaded.'}
          </p>
        )}
        <p className="muted support-panel-note">
          Retention removes older saved searches. Analytics reflect the history that is still
          available.
        </p>
      </section>
    </>
  );
}
