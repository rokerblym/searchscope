# frozen_string_literal: true

module Api
  module V1
    class HealthController < ApplicationController
      skip_before_action :authenticate_user!
      def show
        response.headers["Cache-Control"] = "no-store"
        render json: { status: "ok", service: "searchscope", version: "0.1.0" }
      end
    end
  end
end
