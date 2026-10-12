# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Search provider budget", type: :request do
  around { |example| with_budget_limits(provider: "serpapi") { example.run } }

  it "returns a stored budget error before invoking the paid provider" do
    user = sign_in
    ProviderBudget.reserve!(user: user)
    adapter = instance_spy(SearchProviders::SerpApi)
    allow(SearchProviders::SerpApi).to receive(:new).and_return(adapter)

    json_write(:post, "/api/v1/searches", { query: "Ruby APIs", engine: "google" })

    expect(adapter).not_to have_received(:call)
    expect(response).to have_http_status(:too_many_requests)
    expect(json_body.fetch("error")).to include("code" => "provider_budget_exceeded")
    expect(SearchRequest.first).to have_attributes(status: "failed", error_code: "provider_budget_exceeded",
                                                   error_http_status: 429)
    expect(SearchBudget.where(key: /\Aserpapi:global:/).first.count).to eq(1)
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end
end
