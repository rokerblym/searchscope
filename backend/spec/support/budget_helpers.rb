# frozen_string_literal: true

module BudgetHelpers
  def with_budget_limits(user_limit: "1", global_limit: "10", provider: ENV.fetch("SEARCH_PROVIDER", "demo"))
    replacements = { "SERPAPI_USER_DAILY_LIMIT" => user_limit,
                     "SERPAPI_GLOBAL_DAILY_LIMIT" => global_limit, "SEARCH_PROVIDER" => provider }
    previous = replacements.keys.index_with { |name| ENV.fetch(name, nil) }
    ENV.update(replacements)
    yield
  ensure
    previous.each { |name, value| value.nil? ? ENV.delete(name) : ENV[name] = value }
  end
end
