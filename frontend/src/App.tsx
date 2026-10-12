import { useEffect, useState } from 'react';
import {
  getSession,
  getMonitoring,
  login,
  register,
  logout,
  type User,
  type Monitoring,
} from './api';
import { DashboardPage } from './pages/Dashboard';
import { SearchExplorerPage } from './pages/SearchExplorer';
import { ComparisonPage } from './pages/Comparison';
import { HistoryPage } from './pages/History';
import { MonitoringPage } from './pages/Monitoring';
import { SettingsPage } from './pages/Settings';

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'search', label: 'Search Explorer', icon: '⌕' },
  { id: 'comparison', label: 'Comparison', icon: '⇄' },
  { id: 'history', label: 'History', icon: '◷' },
  { id: 'monitoring', label: 'Monitoring', icon: '⌁' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;
type Page = (typeof pages)[number]['id'];
type SessionState =
  | { state: 'loading' }
  | { state: 'ready'; user: User | null }
  | { state: 'error'; message: string };

function currentPage(): Page {
  const id = window.location.hash.replace('#/', '');
  return pages.some((page) => page.id === id) ? (id as Page) : 'dashboard';
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (
      mode === 'register' &&
      (password.length < 10 || new TextEncoder().encode(password).length > 72)
    ) {
      setError('Use a password with at least 10 characters and no more than 72 bytes.');
      return;
    }
    setPending(true);
    try {
      const result = await (mode === 'login' ? login : register)({ email: email.trim(), password });
      setPassword('');
      onAuthenticated(result.user);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to authenticate. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand" href="#/dashboard">
          <span className="brand-mark" aria-hidden="true">
            S<span>•</span>
          </span>
          SearchScope
        </a>
        <div className="auth-story-copy">
          <p className="eyebrow">SEARCH INTELLIGENCE</p>
          <h1>
            See the search.
            <br />
            Understand the signal.
          </h1>
          <p>
            Explore results, compare snapshots, and monitor your search API in one focused
            workspace.
          </p>
          <div className="auth-orbit" aria-hidden="true">
            <span>SEARCH</span>
            <span>COMPARE</span>
            <span>UNDERSTAND</span>
          </div>
        </div>
        <span className="auth-caption">Search Intelligence & API Analytics Platform</span>
      </section>
      <main className="auth-main">
        <div className="auth-form-wrap">
          <p className="eyebrow">YOUR SEARCH WORKSPACE</p>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Start with a clear view.'}</h2>
          <p className="intro">
            {mode === 'login'
              ? 'Sign in to access your searches and analytics.'
              : 'Create an account to build your search history.'}
          </p>
          <div className="auth-tabs" aria-label="Account access">
            <button
              type="button"
              className={mode === 'login' ? 'selected' : ''}
              aria-pressed={mode === 'login'}
              disabled={pending}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'selected' : ''}
              aria-pressed={mode === 'register'}
              disabled={pending}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label className="field">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                required
                disabled={pending}
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                disabled={pending}
                aria-describedby={mode === 'register' ? 'password-help' : undefined}
              />
            </label>
            {mode === 'register' && (
              <p className="field-help" id="password-help">
                At least 10 characters. Maximum 72 bytes.
              </p>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in to SearchScope'
                  : 'Create your account'}
            </button>
          </form>
          <p className="auth-note">
            Your search history belongs to your account. Provider keys are configured securely on
            the server.
          </p>
        </div>
      </main>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<SessionState>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<Page>(currentPage);
  const [monitoring, setMonitoring] = useState<Monitoring | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [comparisonSeed, setComparisonSeed] = useState<string | undefined>();

  useEffect(() => {
    let current = true;
    getSession()
      .then((result) => {
        if (current)
          setSession({ state: 'ready', user: result.authenticated ? result.user : null });
      })
      .catch((error: unknown) => {
        if (current)
          setSession({
            state: 'error',
            message: error instanceof Error ? error.message : 'Unable to load the session.',
          });
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  useEffect(() => {
    const update = () => setPage(currentPage());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const user = session.state === 'ready' ? session.user : null;
  useEffect(() => {
    if (!user) return;
    let current = true;
    getMonitoring()
      .then((result) => {
        if (current) setMonitoring(result);
      })
      .catch(() => {
        /* Individual pages show request failures. */
      });
    return () => {
      current = false;
    };
  }, [user]);

  async function signOut() {
    setLogoutPending(true);
    setLogoutError(null);
    try {
      await logout();
      setSession({ state: 'ready', user: null });
      setMonitoring(null);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setLogoutPending(false);
    }
  }

  function navigate(next: Page) {
    window.location.hash = `/${next}`;
    setPage(next);
  }

  if (session.state === 'loading')
    return (
      <main className="session-screen">
        <div className="loader" />
        <h1>Opening your workspace…</h1>
        <p className="muted" role="status">
          Loading account session
        </p>
      </main>
    );
  if (session.state === 'error')
    return (
      <main className="session-screen">
        <h1>Unable to open your workspace.</h1>
        <div className="error-message" role="alert">
          {session.message}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSession({ state: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </main>
    );
  if (!user)
    return (
      <AuthPage
        onAuthenticated={(authenticatedUser) => {
          setSession({ state: 'ready', user: authenticatedUser });
          navigate('dashboard');
        }}
      />
    );

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#/dashboard">
          <span className="brand-mark" aria-hidden="true">
            S<span>•</span>
          </span>
          SearchScope
        </a>
        <p className="sidebar-label">WORKSPACE</p>
        <nav>
          {pages.map((item) => (
            <a
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              href={`#/${item.id}`}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="foundation-dot" /> Search Intelligence
          <span className="footer-caption">
            Every search tells a story.
            <br />
            Find the signal.
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-separator">/</span>{' '}
            <strong>{pages.find((item) => item.id === page)?.label}</strong>
          </span>
          <div className="account-menu">
            <span className="account-email">{user.email}</span>
            <button className="btn btn-quiet" onClick={signOut} disabled={logoutPending}>
              {logoutPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          {logoutError && (
            <div className="error-message" role="alert">
              {logoutError}
            </div>
          )}
          {monitoring?.provider === 'demo' && (
            <div className="demo-banner" role="note">
              <strong>DEMO MODE</strong>
              <span>
                Search results are synthetic fixtures. No live search provider requests are made.
              </span>
            </div>
          )}
          {page === 'dashboard' && <DashboardPage onSearch={() => navigate('search')} />}
          {page === 'search' && (
            <SearchExplorerPage
              onCompare={(id) => {
                setComparisonSeed(id);
                navigate('comparison');
              }}
            />
          )}
          {page === 'comparison' && <ComparisonPage initialSearchId={comparisonSeed} />}
          {page === 'history' && (
            <HistoryPage
              onCompare={(id) => {
                setComparisonSeed(id);
                navigate('comparison');
              }}
            />
          )}
          {page === 'monitoring' && <MonitoringPage />}
          {page === 'settings' && <SettingsPage user={user} />}
          <footer className="page-footer">
            SearchScope <span>Search Intelligence & API Analytics Platform</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
