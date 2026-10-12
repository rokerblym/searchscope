# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchAnalytics do
  let(:user) { User.create!(email: "eldar@example.test", password: "secure-test-password") }

  def add_search(owner: user, status: "succeeded", duration: 10, domain: "example.test", provider: "demo")
    SearchRequest.create!(
      user: owner, query: "Ruby APIs", normalized_query: "ruby apis", engine: "google", provider: provider,
      status: status, duration_ms: duration, expires_at: 30.days.from_now,
      results: status == "succeeded" ? [{ title: "Result", url: "https://#{domain}/", domain: domain }] : [],
      error_code: status == "failed" ? "provider_timeout" : nil,
      error_message: status == "failed" ? "The search provider timed out." : nil
    )
  end

  it "returns honest empty-state metrics without an invented average" do
    metrics = described_class.call(scope: SearchRequest.where(user: user))

    expect(metrics).to include(total_searches: 0, successful_searches: 0, failed_searches: 0,
                               success_rate: nil, error_rate: nil, average_duration_ms: nil)
    expect(metrics[:top_domains]).to eq([])
    expect(metrics[:recent_errors]).to eq([])
  end

  it "aggregates stored requests within the supplied owner scope" do
    add_search(duration: 10)
    add_search(duration: 20)
    add_search(status: "failed", duration: 30)
    other = User.create!(email: "other@example.test", password: "secure-test-password")
    add_search(owner: other, duration: 1000, domain: "private-other-user.test", provider: "serpapi")

    metrics = described_class.call(scope: SearchRequest.where(user: user))

    expect(metrics).to include(total_searches: 3, successful_searches: 2, failed_searches: 1,
                               success_rate: 66.67, error_rate: 33.33, average_duration_ms: 20.0)
    expect(metrics[:top_domains]).to eq([{ domain: "example.test", count: 2 }])
    expect(metrics[:provider_usage]).to eq([{ provider: "demo", count: 3 }])
    expect(metrics[:recent_errors].length).to eq(1)
    expect(metrics[:recent_errors].first.fetch(:error)).to include(code: "provider_timeout")
  end
end
