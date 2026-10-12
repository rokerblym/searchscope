export type HealthResponse = {
  status: 'ok';
  service: 'searchscope';
  version: string;
};

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`The API returned HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok' ||
    !('service' in data) ||
    data.service !== 'searchscope' ||
    !('version' in data) ||
    typeof data.version !== 'string' ||
    !data.version.trim()
  ) {
    throw new Error('The API returned an unexpected health response.');
  }

  return { status: data.status, service: data.service, version: data.version };
}
