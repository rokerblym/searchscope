# frozen_string_literal: true

require "digest"
require "uri"

module SearchProviders
  # Synthetic examples only. This adapter makes no network calls and never
  # represents its result counts as live search-engine data.
  class Demo
    def call(query:, engine:)
      encoded_query = URI.encode_www_form_component(query)
      fingerprint = Digest::SHA256.hexdigest(query.downcase.strip)[0, 12]
      results = [
        { title: "Demo: #{query} overview", url: "https://example.com/search/#{fingerprint}",
          snippet: "Synthetic result for testing SearchScope. This is not a live search result.", position: 1 },
        { title: "Demo: API engineering reference", url: "https://docs.example.org/api-engineering",
          snippet: "A shared synthetic result useful for demonstrating query comparison.", position: 2 },
        { title: "Demo: #{query} discussion", url: "https://community.example.net/?q=#{encoded_query}", snippet: nil, position: 3 }
      ]
      {
        results: ResultNormalizer.call(results),
        metadata: { provider_search_id: "demo-#{fingerprint}", total_results: 3, demo: true, requested_engine: engine },
        provider: "demo"
      }
    end
  end
end
