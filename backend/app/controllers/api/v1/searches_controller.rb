# frozen_string_literal: true

module Api
  module V1
    class SearchesController < ApplicationController
      FILTER_VALUES = { status: %w[pending succeeded failed], engine: %w[google bing] }.freeze
      before_action :validate_search_payload, only: :create

      def index
        page = parse_integer(params[:page], default: 1, range: 1..1000)
        per_page = parse_integer(params[:per_page], default: 20, range: 1..100)
        return if performed?

        scope = filtered_searches
        return if performed?

        total = scope.count
        records = scope.order_by(created_at: :desc, _id: :desc).skip((page - 1) * per_page).limit(per_page)
        render json: { data: records.map { |record| serialized_search(record) },
                       pagination: { page: page, per_page: per_page, total: total,
                                     total_pages: (total.to_f / per_page).ceil } }
      end

      def show
        render json: serialized_search(owned_searches.find(params.expect(:id)))
      end

      def create
        search = SearchRunner.call(user: current_user, query: @query, engine: @engine)
        Rails.logger.info({ event: "search_completed", request_id: request.request_id,
                            search_id: search.id.to_s, status: search.status,
                            provider: search.provider, duration_ms: search.duration_ms }.to_json)
        render_search(search)
      end

      def destroy
        owned_searches.find(params.expect(:id)).destroy!
        head :no_content
      end

      private

      def validate_search_payload
        query, engine = params.expect(:query, :engine)
        if query.is_a?(String) && query.strip.length.between?(1, 200) && %w[google bing].include?(engine)
          @query = query.strip
          @engine = engine
          return
        end
        render_error("validation_failed", "Query must contain 1–200 characters and engine must be google or bing.",
                     :unprocessable_content)
      end

      def render_search(search)
        if search.status == "failed"
          response.set_header("Retry-After", search.retry_after.to_s) if search.retry_after
          render_error(search.error_code, search.error_message, search.error_http_status || 502,
                       search: serialized_search(search))
        else
          render json: serialized_search(search), status: :created
        end
      end

      def filtered_searches
        scope = owned_searches
        FILTER_VALUES.each do |field, allowed|
          value = params[field]
          next if value.nil? || value == ""

          unless allowed.include?(value)
            render_error("validation_failed", "Invalid #{field} filter.", :unprocessable_content)
            return scope
          end
          scope = scope.where(field => value)
        end
        filter_by_query(scope)
      end

      def filter_by_query(scope)
        query = params[:query]
        return scope if query.nil? || query == ""

        unless query.is_a?(String) && query.length <= 200
          render_error("validation_failed", "Invalid query filter.", :unprocessable_content)
          return scope
        end
        scope.where(normalized_query: query.downcase.strip.gsub(/\s+/, " "))
      end

      def parse_integer(value, default:, range:)
        number = if value.nil?
                   default
                 else
                   (value.is_a?(String) ? Integer(value, exception: false) : nil)
                 end
        return number if number && range.cover?(number)

        unless performed?
          render_error("validation_failed", "Pagination is outside the supported range.",
                       :unprocessable_content)
        end
        nil
      end
    end
  end
end
