# frozen_string_literal: true

module Api
  module V1
    class ComparisonsController < ApplicationController
      def create
        unless params[:left_search_id].is_a?(String) && params[:right_search_id].is_a?(String)
          render_error("validation_failed", "Choose two search IDs to compare.", :unprocessable_content)
          return
        end
        left = owned_searches.find(params.expect(:left_search_id))
        right = owned_searches.find(params.expect(:right_search_id))
        unless [left, right].all? { |search| search.status == "succeeded" }
          render_error("validation_failed", "Only successful searches can be compared.", :unprocessable_content)
          return
        end
        render json: { left: serialized_search(left), right: serialized_search(right),
                       comparison: SearchComparison.call(left: left, right: right) }
      end
    end
  end
end
