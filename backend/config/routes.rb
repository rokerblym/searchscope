# frozen_string_literal: true

Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"
      get "session", to: "sessions#show"
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      resources :searches, only: %i[index create show destroy]
      resources :comparisons, only: :create
      get "analytics", to: "analytics#show"
      get "monitoring", to: "monitoring#show"
    end
  end

  # Keep last: this read-only fallback must never replace valid API endpoints.
  match "/api", to: "api/not_found#show", via: :all
  match "/api/*unmatched_path", to: "api/not_found#show", via: :all
end
