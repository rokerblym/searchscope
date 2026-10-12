# frozen_string_literal: true

Rails.application.configure do
  config.secret_key_base = ENV.fetch("SECRET_KEY_BASE")
  config.hosts = ENV.fetch("ALLOWED_HOSTS").split(",").map(&:strip).reject(&:empty?)
  raise "ALLOWED_HOSTS must contain a hostname" if config.hosts.empty?

  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.force_ssl = true
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.logger = ActiveSupport::Logger.new($stdout)
end
