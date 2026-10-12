# frozen_string_literal: true

module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :authenticate_user!

      def show
        render json: { authenticated: current_user.present?,
                       user: current_user ? serialized_user(current_user) : nil,
                       csrf_token: form_authenticity_token }
      end
    end
  end
end
