# frozen_string_literal: true

require_relative "boot"

require "rails"
require "action_controller/railtie"
require_relative "../lib/search_scope/frontend_hosting"
require_relative "../lib/search_scope/production_hosts"

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

    if ENV["SERVE_FRONTEND"] == "true"
      config.public_file_server.enabled = true
      config.middleware.insert_before 0, SearchScope::FrontendHosting
    end
  end
end
