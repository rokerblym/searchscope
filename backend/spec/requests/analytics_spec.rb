# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Analytics and monitoring", type: :request do
  it "requires authentication for both endpoints" do
    get "/api/v1/analytics"
    expect(response).to have_http_status(:unauthorized)
    get "/api/v1/monitoring"
    expect(response).to have_http_status(:unauthorized)
  end

  it "shows real persisted analytics while excluding another user's requests" do
    user = sign_in
    other = User.create!(email: "other@example.test", password: RequestHelpers::TEST_PASSWORD)
    persist_search(user: user, duration_ms: 10)
    persist_search(user: user, status: "failed", duration_ms: 30,
                   error_code: "provider_timeout", error_message: "Timed out.")
    persist_search(user: other, query: "Private other-user query", duration_ms: 1000)

    get "/api/v1/analytics"

    expect(response).to have_http_status(:ok)
    expect(json_body).to include("total_searches" => 2, "successful_searches" => 1, "failed_searches" => 1,
                                 "success_rate" => 50.0, "error_rate" => 50.0, "average_duration_ms" => 20.0)
    expect(response.body).not_to include("Private other-user query")
  end

  it "reports monitoring without spending provider credits or exposing user records" do
    user = sign_in
    other = User.create!(email: "other@example.test", password: RequestHelpers::TEST_PASSWORD)
    persist_search(user: user, status: "failed", error_code: "provider_timeout", error_message: "Timed out.")
    persist_search(user: other, query: "Private other-user failure", status: "failed", error_code: "provider_timeout")

    get "/api/v1/monitoring"

    expect(response).to have_http_status(:ok)
    expect(json_body).to include("api_status" => "ok", "database_status" => "ok", "provider" => "demo",
                                 "provider_configured" => true, "retention_days" => 30)
    expect(response.body).not_to include("Private other-user failure", "api_key", "password_digest")
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end
end
