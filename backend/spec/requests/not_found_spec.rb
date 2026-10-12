# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Unknown API endpoints", type: :request do
  it "returns a public JSON not-found error even when the client requests HTML" do
    get "/api/v1/does-not-exist", headers: { "Accept" => "text/html" }

    expect(response).to have_http_status(:not_found)
    expect(response.media_type).to eq("application/json")
    expect(json_body.fetch("error")).to include("code" => "not_found")
    expect(json_body.fetch("error").fetch("message")).to be_present
  end

  it "returns JSON for the base API path without requiring authentication" do
    get "/api"

    expect(response).to have_http_status(:not_found)
    expect(response.media_type).to eq("application/json")
    expect(json_body.fetch("error").fetch("code")).to eq("not_found")
  end

  it "does not authenticate or mutate data for an unknown write endpoint" do
    post "/api/v1/does-not-exist", params: {}, as: :json, headers: { "Origin" => "https://foreign.example" }

    expect(response).to have_http_status(:not_found)
    expect(json_body.fetch("error").fetch("code")).to eq("not_found")
    expect(User.count).to eq(0)
    expect(SearchRequest.count).to eq(0)
    expect(SearchBudget.count).to eq(0)
  end

  it "keeps valid endpoints and missing non-API asset routes outside the fallback" do
    get "/api/v1/health"
    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("service")).to eq("searchscope")

    get "/assets/missing-ab123456.js", headers: { "Accept" => "text/html" }
    expect(response).to have_http_status(:not_found)
    expect(response.media_type).not_to eq("application/json")
  end
end
