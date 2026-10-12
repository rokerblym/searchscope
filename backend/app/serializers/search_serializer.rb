# frozen_string_literal: true

class SearchSerializer
  def self.call(search)
    {
      id: search.id.to_s, query: search.query, engine: search.engine,
      provider: search.provider, status: search.status, duration_ms: search.duration_ms,
      created_at: search.created_at.iso8601, results: search.results,
      metadata: search.metadata,
      error: if search.error_code
               { code: search.error_code, message: search.error_message,
                 retry_after: search.retry_after }.compact
             end
    }
  end
end
