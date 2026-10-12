# frozen_string_literal: true

Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.logger = ActiveSupport::Logger.new($stdout)
  config.action_controller.perform_caching = false
  config.hosts << "backend" # Internal Compose hostname used by the Vite proxy.
end
