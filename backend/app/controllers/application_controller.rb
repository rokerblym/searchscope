# frozen_string_literal: true

class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection

  before_action :authenticate_user!
  protect_from_forgery with: :exception

  rescue_from ActionController::InvalidAuthenticityToken do
    render_error("invalid_csrf_token", "Refresh your session and try again.", :forbidden)
  end
  rescue_from ActionController::ParameterMissing do
    render_error("validation_failed", "A required field is missing or invalid.", :unprocessable_content)
  end
  rescue_from Mongoid::Errors::DocumentNotFound, BSON::Error::InvalidObjectId do
    render_error("not_found", "The requested resource was not found.", :not_found)
  end
  rescue_from Mongoid::Errors::Validations do |error|
    render_error("validation_failed", error.document.errors.full_messages.join(". "), :unprocessable_content)
  end
  rescue_from Mongo::Error do
    Rails.logger.error({ event: "database_unavailable", request_id: request.request_id }.to_json)
    render_error("database_unavailable", "The database is temporarily unavailable.", :service_unavailable)
  end

  private

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = User.where(id: session[:user_id]).first if session[:user_id]
    @current_user = nil unless @current_user && session[:auth_version] == @current_user.auth_version
    @current_user
  end

  def authenticate_user!
    render_error("unauthorized", "Log in to access this resource.", :unauthorized) unless current_user
  end

  def render_error(code, message, status, **extra)
    render json: { error: { code: code, message: message } }.merge(extra), status: status
  end

  def serialized_user(user)
    { id: user.id.to_s, email: user.email }
  end

  def serialized_search(search)
    SearchSerializer.call(search)
  end

  def owned_searches
    current_user.search_requests.where(:expires_at.gt => Time.current)
  end
end
