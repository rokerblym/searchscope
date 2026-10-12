# frozen_string_literal: true

class ProviderBudget
  def self.reserve!(user:)
    day = Time.current.utc.strftime("%Y-%m-%d")
    user_allowed = SearchBudget.reserve(key: "serpapi:user:#{user.id}:#{day}",
                                        limit: configured_limit("SERPAPI_USER_DAILY_LIMIT", 20))
    global_allowed = user_allowed && SearchBudget.reserve(key: "serpapi:global:#{day}",
                                                          limit: configured_limit("SERPAPI_GLOBAL_DAILY_LIMIT", 200))
    return if global_allowed

    raise SearchProviders::Error.new(code: "provider_budget_exceeded",
                                     message: "The daily search budget has been reached. Try again tomorrow.",
                                     http_status: 429)
  end

  def self.configured_limit(name, default)
    value = Integer(ENV.fetch(name, default.to_s), exception: false)
    value&.between?(1, 10_000) ? value : default
  end
end
