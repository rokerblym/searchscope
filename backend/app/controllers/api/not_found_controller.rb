# frozen_string_literal: true

module Api
  class NotFoundController < ApplicationController
    skip_before_action :authenticate_user!
    skip_forgery_protection

    def show
      render_error("not_found", "The requested endpoint was not found.", :not_found)
    end
  end
end
