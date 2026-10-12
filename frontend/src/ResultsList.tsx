import type { SearchResult } from './api';
import { externalUrl } from './format';

export function ResultsList({
  results,
  emptyMessage = 'No organic results were returned.',
}: {
  results: SearchResult[];
  emptyMessage?: string;
}) {
  if (!results.length)
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  return (
    <ol className="results-list">
      {results.map((result, index) => {
        const href = externalUrl(result.url);
        return (
          <li className="result-item" key={`${result.url}-${index}`}>
            <span
              className="result-position"
              aria-label={`Position ${result.position ?? 'unavailable'}`}
            >
              {result.position ?? '—'}
            </span>
            <div>
              <span className="result-domain">{result.domain || 'Unknown domain'}</span>
              <h3>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {result.title || result.url}
                    <span className="external-arrow" aria-hidden="true">
                      {' '}
                      ↗
                    </span>
                  </a>
                ) : (
                  result.title || result.url
                )}
              </h3>
              {result.snippet && <p>{result.snippet}</p>}
              <span className="result-url">{result.url}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
