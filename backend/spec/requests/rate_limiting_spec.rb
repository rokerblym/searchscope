# frozen_string_literal: true

require "rails_helper"

RSpec.describe "API rate limiting", type: :request do
  around do |example|
    previously_enabled = Rack::Attack.enabled
    Rack::Attack.enabled = true
    example.run
  ensure
    Rack::Attack.enabled = previously_enabled
    Rack::Attack.cache.store.clear
  end

  def authenticated_browser(email)
    user = User.create!(email: email, password: RequestHelpers::TEST_PASSWORD)
    browser = ActionDispatch::Integration::Session.new(Rails.application)
    browser.get "/api/v1/session"
    token = JSON.parse(browser.response.body).fetch("csrf_token")
    browser.post "/api/v1/auth/login", params: { email: email, password: RequestHelpers::TEST_PASSWORD },
                                       as: :json, headers: { "X-CSRF-Token" => token }
    [browser, JSON.parse(browser.response.body).fetch("csrf_token"), user]
  end

  it "limits authentication attempts while keeping public health available" do
    credentials = { email: "unknown@example.test", password: "incorrect-test-password" }

    10.times do
      json_write(:post, "/api/v1/auth/login", credentials)
      expect(response).to have_http_status(:unauthorized)
    end
    json_write(:post, "/api/v1/auth/login", credentials)

    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers.fetch("Retry-After").to_i).to be > 0
    expect(json_body.fetch("error")).to include("code" => "rate_limited")
    get "/api/v1/health"
    expect(response).to have_http_status(:ok)
  end

  it "counts JSON and trailing-slash login aliases in the same authentication limit" do
    credentials = { email: "unknown@example.test", password: "incorrect-test-password" }
    paths = %w[/api/v1/auth/login /api/v1/auth/login.json /api/v1/auth/login/]
    10.times do |index|
      json_write(:post, paths[index % paths.length], credentials)
      expect(response).to have_http_status(:unauthorized)
    end

    json_write(:post, "/api/v1/auth/login.json", credentials)

    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers.fetch("Retry-After").to_i).to be > 0
  end

  it "keeps authenticated users' search limits separate on the same client IP" do
    first_user = sign_in
    other_browser, token, second_user = authenticated_browser("other@example.test")
    params = { query: "Ruby APIs", engine: "google" }
    10.times do
      json_write(:post, "/api/v1/searches", params)
      expect(response).to have_http_status(:created)
    end

    other_browser.post "/api/v1/searches", params: params, as: :json, headers: { "X-CSRF-Token" => token }
    expect(other_browser.response.status).to eq(201)
    expect(other_browser.request.remote_ip).to eq(request.remote_ip)
    json_write(:post, "/api/v1/searches.json", params)
    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers.fetch("Retry-After").to_i).to be > 0
    expect(SearchRequest.where(user: first_user).count).to eq(10)
    expect(SearchRequest.where(user: second_user).count).to eq(1)
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end
end
