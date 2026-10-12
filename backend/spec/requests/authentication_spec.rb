# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Authentication", type: :request do
  it "returns an unauthenticated session and a CSRF token without exposing credentials" do
    get "/api/v1/session"

    expect(response).to have_http_status(:ok)
    expect(json_body).to include("authenticated" => false, "user" => nil)
    expect(json_body.fetch("csrf_token")).to be_present
  end

  it "rejects a state-changing request without a CSRF token" do
    credentials = { email: "eldar@example.test", password: RequestHelpers::TEST_PASSWORD }
    post "/api/v1/auth/register", params: credentials, as: :json

    expect(response).to have_http_status(:forbidden)
    expect(User.count).to eq(0)
  end

  it "registers an account, establishes a session and never serializes a password" do
    json_write(:post, "/api/v1/auth/register", { email: "ELDAR@example.test", password: RequestHelpers::TEST_PASSWORD })

    expect(response).to have_http_status(:created)
    expect(json_body.fetch("user")).to include("email" => "eldar@example.test")
    expect(response.body).not_to include("password", "password_digest", RequestHelpers::TEST_PASSWORD)
    expect(User.count).to eq(1)

    get "/api/v1/session"
    expect(json_body).to include("authenticated" => true)
  end

  it "validates registration input without creating an account" do
    json_write(:post, "/api/v1/auth/register", { email: "invalid", password: "short" })

    expect(response).to have_http_status(:unprocessable_content)
    expect(User.count).to eq(0)
  end

  it "rejects structured credentials without an unhandled exception" do
    json_write(:post, "/api/v1/auth/register", { email: ["unexpected array"], password: { "unexpected" => "object" } })

    expect(response).to have_http_status(:unprocessable_content)
    expect(User.count).to eq(0)
  end

  it "logs in with valid credentials and rejects an incorrect password" do
    user = User.create!(email: "eldar@example.test", password: RequestHelpers::TEST_PASSWORD)
    json_write(:post, "/api/v1/auth/login", { email: user.email, password: "incorrect-password" })
    expect(response).to have_http_status(:unauthorized)

    json_write(:post, "/api/v1/auth/login", { email: user.email, password: RequestHelpers::TEST_PASSWORD })
    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("user").fetch("id")).to eq(user.id.to_s)
  end

  it "logs out, invalidates previous authentication and returns a fresh CSRF token" do
    user = sign_in
    previous_version = user.reload.auth_version
    json_write(:delete, "/api/v1/auth/logout")

    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("csrf_token")).to be_present
    expect(user.reload.auth_version).to be > previous_version

    get "/api/v1/session"
    expect(json_body).to include("authenticated" => false)
    get "/api/v1/searches"
    expect(response).to have_http_status(:unauthorized)
  end

  it "invalidates a previously issued cookie in another browser when logging out" do
    user = sign_in
    other_browser = ActionDispatch::Integration::Session.new(Rails.application)
    other_browser.get "/api/v1/session"
    token = JSON.parse(other_browser.response.body).fetch("csrf_token")
    other_browser.post "/api/v1/auth/login", params: { email: user.email, password: RequestHelpers::TEST_PASSWORD },
                                             as: :json, headers: { "X-CSRF-Token" => token }
    expect(other_browser.response.status).to eq(200)

    json_write(:delete, "/api/v1/auth/logout")
    other_browser.get "/api/v1/searches"

    expect(other_browser.response.status).to eq(401)
  end
end
