# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchRunner do
  let(:user) { User.create!(email: "eldar@example.test", password: "secure-test-password") }

  it "persists successful results with a measured duration and retention deadline" do
    record = described_class.call(user: user, query: "Ruby APIs", engine: "google")

    expect(record.reload.status).to eq("succeeded")
    expect(record.provider).to eq("demo")
    expect(record.normalized_query).to eq("ruby apis")
    expect(record.results.length).to eq(3)
    expect(record.duration_ms).to be >= 0
    expect(record.expires_at).to be_within(5.seconds).of(30.days.from_now)
    expect(record.metadata["demo"]).to be(true)
  end

  it "records provider failures rather than silently losing failed requests" do
    provider = instance_double(SearchProviders::SerpApi)
    error = SearchProviders::Error.new(code: "provider_timeout", message: "The search provider timed out.",
                                       http_status: 504)
    allow(provider).to receive(:call).with(query: "Ruby APIs", engine: "google").and_raise(error)

    record = described_class.new(provider: provider).call(user: user, query: "Ruby APIs", engine: "google")

    expect(record.reload.status).to eq("failed")
    expect(record.error_code).to eq("provider_timeout")
    expect(record.error_http_status).to eq(504)
    expect(record.error_message).to eq(error.message)
    expect(record.results).to eq([])
    expect(record.duration_ms).to be >= 0
  end
end
