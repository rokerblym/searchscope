# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Search comparisons", type: :request do
  it "compares two owned successful searches with overlapping and unique results" do
    user = sign_in
    shared = { title: "Shared reference", url: "https://example.test/shared", domain: "example.test", position: 1 }
    left = persist_search(user: user, query: "Ruby APIs", results: [shared])
    right_results = [shared.merge(position: 3), { title: "Unique", url: "https://unique.test/", domain: "unique.test" }]
    right = persist_search(user: user, query: "Rails APIs", results: right_results)

    json_write(:post, "/api/v1/comparisons", { left_search_id: left.id.to_s, right_search_id: right.id.to_s })

    expect(response).to have_http_status(:ok)
    expect(json_body.fetch("left").fetch("id")).to eq(left.id.to_s)
    expect(json_body.fetch("right").fetch("id")).to eq(right.id.to_s)
    comparison = json_body.fetch("comparison")
    expect(comparison.fetch("overlapping_results").length).to eq(1)
    expect(comparison.fetch("right_unique_results").length).to eq(1)
    expect(comparison.fetch("position_changes").first).to include("left_position" => 1, "right_position" => 3)
  end

  it "rejects failed searches and prevents cross-user comparison" do
    user = sign_in
    other = User.create!(email: "other@example.test", password: RequestHelpers::TEST_PASSWORD)
    owned = persist_search(user: user)
    failed = persist_search(user: user, status: "failed")
    private_record = persist_search(user: other)

    json_write(:post, "/api/v1/comparisons", { left_search_id: owned.id.to_s, right_search_id: failed.id.to_s })
    expect(response).to have_http_status(:unprocessable_content)

    json_write(:post, "/api/v1/comparisons", { left_search_id: owned.id.to_s, right_search_id: private_record.id.to_s })
    expect(response).to have_http_status(:not_found)
  end

  it "requires authenticated access" do
    json_write(:post, "/api/v1/comparisons", { left_search_id: "missing", right_search_id: "missing" })

    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects missing or structured IDs without an unhandled exception" do
    sign_in
    json_write(:post, "/api/v1/comparisons", { left_search_id: ["unexpected array"], right_search_id: nil })

    expect(response).to have_http_status(:unprocessable_content)
  end
end
