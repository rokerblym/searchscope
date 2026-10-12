# frozen_string_literal: true

module Api
  module V1
    class AnalyticsController < ApplicationController
      def show
        render json: SearchAnalytics.call(scope: owned_searches)
      end
    end
  end
end
