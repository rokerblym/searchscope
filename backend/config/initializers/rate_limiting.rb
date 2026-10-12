# frozen_string_literal: true

Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new(size: 16.megabytes)
Rack::Attack.enabled = !Rails.env.test?

normalize_path = ->(request) { request.path.gsub(%r{/+}, "/").delete_suffix("/") }
client_ip = lambda do |request|
  (request.get_header("action_dispatch.remote_ip") || request.get_header("REMOTE_ADDR")).to_s
end

Rack::Attack.throttle("auth/ip", limit: 10, period: 60) do |request|
  path = normalize_path.call(request)
  client_ip.call(request) if request.post? && path.match?(%r{\A/api/v1/auth/(?:login|register)(?:\.[^/]+)?\z})
end
Rack::Attack.throttle("search/user", limit: 10, period: 60) do |request|
  path = normalize_path.call(request)
  if request.post? && path.match?(%r{\A/api/v1/searches(?:\.[^/]+)?\z})
    user_id = request.session["user_id"]
    user_id ? "user:#{user_id}" : "ip:#{client_ip.call(request)}"
  end
end
Rack::Attack.throttled_responder = lambda do |_request|
  [429, { "Content-Type" => "application/json", "Retry-After" => "60" },
   [{ error: { code: "rate_limited", message: "Too many requests. Try again in one minute.",
               retry_after: 60 } }.to_json]]
end
Rails.application.config.middleware.use Rack::Attack
