# frozen_string_literal: true

Rails.application.configure do
  config.secret_key_base = ENV.fetch("SECRET_KEY_BASE")
  config.hosts = SearchScope::ProductionHosts.call(ENV)

  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.force_ssl = true
  # Enable only behind a trusted TLS edge that makes backend HTTP private.
  config.assume_ssl = ENV["RAILS_ASSUME_SSL"] == "true"
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.logger = ActiveSupport::Logger.new($stdout)
end
