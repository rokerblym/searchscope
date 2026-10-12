# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Searches", type: :request do
  it "requires authentication for history and search creation" do
    get "/api/v1/searches"
    expect(response).to have_http_status(:unauthorized)

    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "google" })
    expect(response).to have_http_status(:unauthorized)
    expect(SearchRequest.count).to eq(0)
  end

  it "creates and persists a search with structured results and metadata" do
    user = sign_in
    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "google" })

    expect(response).to have_http_status(:created)
    expect(json_body).to include("query" => "Ruby APIs", "engine" => "google",
                                 "provider" => "demo", "status" => "succeeded")
    expect(json_body.fetch("results").first).to include("title", "url", "position", "domain")
    expect(json_body.fetch("metadata")).to include("demo" => true)
    expect(json_body.fetch("duration_ms")).to be >= 0
    expect(SearchRequest.find(json_body.fetch("id")).user).to eq(user)
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end

  [nil, "", " ", "x" * 201, ["unexpected array"], { "unexpected" => "object" }].each do |query|
    it "rejects invalid query input #{query.inspect[0, 50]} before calling the provider" do
      sign_in
      json_write(:post, "/api/v1/searches", { query: query, engine: "google" })

      expect(response).to have_http_status(:unprocessable_content)
      expect(SearchRequest.count).to eq(0)
      expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
    end
  end

  it "rejects unsupported search engines" do
    sign_in
    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "unsupported" })

    expect(response).to have_http_status(:unprocessable_content)
    expect(SearchRequest.count).to eq(0)
  end

  it "returns a safe service-unavailable error when persistence fails" do
    sign_in
    database_error = Mongo::Error.new("private-database-host password=do-not-expose")
    allow(SearchRunner).to receive(:call).and_raise(database_error)

    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "google" })

    expect(response).to have_http_status(:service_unavailable)
    expect(json_body.fetch("error")).to include("code" => "database_unavailable")
    expect(response.body).not_to include("private-database-host", "do-not-expose")
    get "/api/v1/health"
    expect(response).to have_http_status(:ok)
  end

  it "returns provider errors with meaningful status codes and persists their history" do
    sign_in
    provider = instance_double(SearchProviders::Demo)
    allow(SearchProviders::Demo).to receive(:new).and_return(provider)
    allow(provider).to receive(:call).and_raise(
      SearchProviders::Error.new(code: "provider_rate_limited", message: "Rate limit reached.",
                                 http_status: 429, retry_after: 30)
    )
    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "google" })

    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers["Retry-After"]).to eq("30")
    expect(json_body.fetch("error")).to include("code" => "provider_rate_limited")
    expect(SearchRequest.first.status).to eq("failed")
  end

  it "paginates and filters only the authenticated user's history" do
    user = sign_in
    other = User.create!(email: "other@example.test", password: RequestHelpers::TEST_PASSWORD)
    persist_search(user: user, query: "Ruby APIs")
    persist_search(user: user, query: "Other search", engine: "bing")
    persist_search(user: other, query: "Ruby APIs")

    get "/api/v1/searches",
        params: { query: "  RUBY APIS  ", engine: "google", status: "succeeded", page: 1, per_page: 1 }

    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("data").length).to eq(1)
    expect(json_body.fetch("data").first.fetch("query")).to eq("Ruby APIs")
    expect(json_body.fetch("pagination")).to include("page" => 1, "per_page" => 1, "total" => 1, "total_pages" => 1)
  end

  it "rejects invalid pagination rather than performing an unbounded query" do
    sign_in
    get "/api/v1/searches", params: { page: 0, per_page: 101 }

    expect(response).to have_http_status(:unprocessable_content)
  end

  it "allows owned detail and deletion without allowing access to another user's records" do
    user = sign_in
    other = User.create!(email: "other@example.test", password: RequestHelpers::TEST_PASSWORD)
    owned = persist_search(user: user)
    private_record = persist_search(user: other)

    get "/api/v1/searches/#{owned.id}"
    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("id")).to eq(owned.id.to_s)

    get "/api/v1/searches/#{private_record.id}"
    expect(response).to have_http_status(:not_found)
    json_write(:delete, "/api/v1/searches/#{private_record.id}")
    expect(response).to have_http_status(:not_found)
    expect(SearchRequest.where(id: private_record.id).count).to eq(1)

    json_write(:delete, "/api/v1/searches/#{owned.id}")
    expect(response.status).to be_in([200, 204])
    expect(SearchRequest.where(id: owned.id).count).to eq(0)
  end

  it "treats malformed database identifiers as missing records" do
    sign_in
    get "/api/v1/searches/not-a-database-id"

    expect(response).to have_http_status(:not_found)
  end

  it "excludes expired records before MongoDB's asynchronous TTL cleanup runs" do
    user = sign_in
    expired = persist_search(user: user, expires_at: 1.minute.ago)

    get "/api/v1/searches"
    expect(json_body.fetch("data")).to eq([])
    expect(json_body.fetch("pagination").fetch("total")).to eq(0)
    get "/api/v1/searches/#{expired.id}"
    expect(response).to have_http_status(:not_found)
    get "/api/v1/analytics"
    expect(json_body.fetch("total_searches")).to eq(0)
  end
end
