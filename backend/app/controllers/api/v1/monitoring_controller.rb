# frozen_string_literal: true

module Api
  module V1
    class MonitoringController < ApplicationController
      def show
        database_status = Mongoid.default_client.database.command(ping: 1).first["ok"] == 1 ? "ok" : "unavailable"
        render json: payload(database_status)
      rescue Mongo::Error
        render json: payload("unavailable"), status: :service_unavailable
      end

      private

      def payload(database_status)
        provider = ENV.fetch("SEARCH_PROVIDER", "serpapi")
        days = Integer(ENV.fetch("SEARCH_RETENTION_DAYS", "30"), exception: false)
        {
          api_status: "ok", database_status: database_status, provider: provider,
          provider_configured: provider == "demo" || ENV["SERPAPI_API_KEY"].present?,
          retention_days: days&.between?(1, 365) ? days : 30,
          allowed_engines: %w[google bing],
          limits: { searches_per_minute: 10,
                    provider_attempts_per_user_per_day: ProviderBudget.configured_limit("SERPAPI_USER_DAILY_LIMIT", 20),
                    provider_attempts_globally_per_day: ProviderBudget.configured_limit("SERPAPI_GLOBAL_DAILY_LIMIT",
                                                                                        200) }
        }
      end
    end
  end
end
