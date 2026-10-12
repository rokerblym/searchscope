# frozen_string_literal: true

class SearchRunner
  def self.call(user:, query:, engine:)
    new.call(user: user, query: query, engine: engine)
  end

  def initialize(provider: nil)
    @provider = provider
  end

  def call(user:, query:, engine:)
    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    provider_name = ENV.fetch("SEARCH_PROVIDER", "serpapi")
    record = create_pending(user, query, engine, provider_name)
    execute(record, user, query, engine, provider_name)

    record.duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1_000).round(2)
    record.save!
    record
  end

  private

  def create_pending(user, query, engine, provider_name)
    SearchRequest.create!(user: user, query: query, normalized_query: query.downcase.strip.gsub(/\s+/, " "),
                          engine: engine, provider: provider_name, status: "pending",
                          expires_at: Time.current + retention_days.days)
  end

  def execute(record, user, query, engine, provider_name)
    ProviderBudget.reserve!(user: user) if provider_name == "serpapi"
    payload = provider(provider_name).call(query: query, engine: engine)
    record.assign_attributes(provider: payload.fetch(:provider), results: payload.fetch(:results),
                             metadata: payload.fetch(:metadata), status: "succeeded")
  rescue SearchProviders::Error => e
    record.assign_attributes(status: "failed", error_code: e.code, error_message: e.message,
                             error_http_status: e.http_status, retry_after: e.retry_after)
  end

  def provider(name)
    return @provider if @provider

    case name
    when "serpapi" then SearchProviders::SerpApi.new
    when "demo" then SearchProviders::Demo.new
    else
      raise SearchProviders::Error.new(code: "provider_not_configured",
                                       message: "The selected search provider is not configured.", http_status: 503)
    end
  end

  def retention_days
    value = Integer(ENV.fetch("SEARCH_RETENTION_DAYS", "30"), exception: false)
    value&.between?(1, 365) ? value : 30
  end
end
