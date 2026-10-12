# frozen_string_literal: true

module Api
  module V1
    class AuthController < ApplicationController
      DUMMY_PASSWORD_DIGEST = BCrypt::Password.create(
        SecureRandom.hex(32), cost: Rails.env.test? ? BCrypt::Engine::MIN_COST : BCrypt::Engine.cost
      ).freeze

      skip_before_action :authenticate_user!
      before_action :authenticate_user!, only: :logout
      before_action :validate_credentials, only: %i[register login]

      def register
        user = User.create!(email: @credentials[:email], password: @credentials[:password])
        establish_session(user)
        render json: { user: serialized_user(user), csrf_token: form_authenticity_token }, status: :created
      rescue Mongoid::Errors::Validations
        render_error("validation_failed",
                     "Registration failed. Check your email and use a password of at least 10 characters.",
                     :unprocessable_content)
      rescue Mongo::Error::OperationFailure => e
        raise unless e.code == 11_000

        render_error("validation_failed", "Registration could not be completed with these details.",
                     :unprocessable_content)
      end

      def login
        email = @credentials[:email].strip.downcase
        password = @credentials[:password]
        user = User.where(email: email).first
        valid_password = user ? user.authenticate(password) : BCrypt::Password.new(DUMMY_PASSWORD_DIGEST).is_password?(password)
        unless user && valid_password
          render_error("invalid_credentials", "Email or password is incorrect.", :unauthorized)
          return
        end
        establish_session(user)
        render json: { user: serialized_user(user), csrf_token: form_authenticity_token }
      end

      def logout
        current_user.inc(auth_version: 1)
        reset_session
        @current_user = nil
        render json: { csrf_token: form_authenticity_token }
      end

      private

      def validate_credentials
        email, password = params.expect(:email, :password)
        if email.is_a?(String) && password.is_a?(String) && email.bytesize <= 254 && password.bytesize <= 72
          @credentials = { email: email, password: password }
          return
        end

        render_error("validation_failed", "Email and password must be valid text values.", :unprocessable_content)
      end

      def establish_session(user)
        reset_session
        session[:user_id] = user.id.to_s
        session[:auth_version] = user.auth_version
        @current_user = user
      end
    end
  end
end
