import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import * as api from './api';
import { testAnalytics, testMonitoring, testUser } from './test-fixtures';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  getSession: vi.fn(),
  getMonitoring: vi.fn(),
  getAnalytics: vi.fn(),
  getSearches: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/');
  vi.mocked(api.getSession).mockResolvedValue({
    authenticated: false,
    user: null,
    csrf_token: 'test-csrf',
  });
  vi.mocked(api.getMonitoring).mockResolvedValue(testMonitoring);
  vi.mocked(api.getAnalytics).mockResolvedValue(testAnalytics);
  vi.mocked(api.getSearches).mockResolvedValue({
    data: [],
    pagination: { page: 1, per_page: 5, total: 0, total_pages: 0 },
  });
});

describe('account access and navigation', () => {
  it('shows session loading before asking for credentials', () => {
    vi.mocked(api.getSession).mockImplementation(() => new Promise(() => {}));
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading account session');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows login failure and can sign in without inventing analytics', async () => {
    vi.mocked(api.login)
      .mockRejectedValueOnce(
        new api.ApiError('Invalid email or password.', 'invalid_credentials', 401),
      )
      .mockResolvedValueOnce({ user: testUser, csrf_token: 'rotated' });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Email address'), {
      target: { value: testUser.email },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to SearchScope' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to SearchScope' }));
    expect(
      await screen.findByRole('heading', { name: 'A clearer view of every search.' }),
    ).toBeInTheDocument();
    expect(api.login).toHaveBeenLastCalledWith({
      email: testUser.email,
      password: 'correct-password',
    });
    expect(await screen.findByText('DEMO MODE')).toBeInTheDocument();
    expect(await screen.findAllByText('No data')).toHaveLength(2);
    for (const label of [
      'Dashboard',
      'Search Explorer',
      'Comparison',
      'History',
      'Monitoring',
      'Settings',
    ])
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Search Explorer' }));
    expect(
      await screen.findByRole('heading', { name: 'Find the signal in every query.' }),
    ).toBeInTheDocument();
  });

  it('checks registration password requirements before sending credentials', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: testUser.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create your account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 10 characters');
    expect(api.register).not.toHaveBeenCalled();
    vi.mocked(api.register).mockResolvedValue({ user: testUser, csrf_token: 'registered' });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'safe-new-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create your account' }));
    expect(
      await screen.findByRole('heading', { name: 'A clearer view of every search.' }),
    ).toBeInTheDocument();
  });

  it('retries failed session bootstrap and signs out through the backend', async () => {
    vi.mocked(api.getSession)
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce({ authenticated: true, user: testUser, csrf_token: 'session-token' });
    vi.mocked(api.logout).mockResolvedValue({ csrf_token: 'anonymous-token' });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole('button', { name: 'Sign in to SearchScope' }),
    ).toBeInTheDocument();
  });
});
