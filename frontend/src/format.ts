export function formatDuration(milliseconds: number | null | undefined): string {
  if (milliseconds == null) return 'No data';
  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} s`
    : `${Math.round(milliseconds)} ms`;
}

export function formatRate(rate: number | null | undefined): string {
  return rate == null ? 'No data' : `${rate.toFixed(1)}%`;
}

export function formatDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString();
}

export function externalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
