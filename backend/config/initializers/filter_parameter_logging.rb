# frozen_string_literal: true

Rails.application.config.filter_parameters += %i[
  password password_confirmation token api_key serpapi_api_key authorization secret email query
]
