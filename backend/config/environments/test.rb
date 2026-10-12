# frozen_string_literal: true

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = ENV["CI"].present?
  config.consider_all_requests_local = true
  config.logger = ActiveSupport::Logger.new($stdout)
  config.log_level = :warn
  config.action_dispatch.show_exceptions = :rescuable
  config.action_controller.perform_caching = false
  config.action_controller.allow_forgery_protection = true
end
