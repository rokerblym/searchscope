import { describe, expect, it, vi } from 'vitest';
import { getHealth } from './health';

describe('getHealth', () => {
  it('requests the relative API endpoint and returns its health payload', async () => {
    const payload = { status: 'ok', service: 'searchscope', version: '0.1.0' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(getHealth(controller.signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  });

  it('rejects unsuccessful HTTP responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(getHealth()).rejects.toThrow('HTTP 503');
  });

  it.each([
    null,
    { status: 'ok', service: 'other', version: '0.1.0' },
    { status: 'ok', service: 'searchscope', version: '' },
    { status: 'error', service: 'searchscope', version: '0.1.0' },
  ])('rejects an unexpected payload: %j', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    await expect(getHealth()).rejects.toThrow('unexpected health response');
  });
});
