# frozen_string_literal: true

require_relative "boot"

require "rails"
require "action_controller/railtie"

Bundler.require(*Rails.groups)

module SearchScope
  class Application < Rails::Application
    config.load_defaults 8.1
    config.api_only = true
    config.generators.orm :mongoid
    config.session_store :cookie_store,
                         key: "_searchscope_session",
                         httponly: true,
                         same_site: :lax,
                         secure: Rails.env.production?,
                         expire_after: 24.hours
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore, config.session_options
  end
end
