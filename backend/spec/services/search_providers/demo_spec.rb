# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchProviders::Demo do
  it "returns deterministic, explicitly labelled synthetic results without a network request" do
    provider = described_class.new
    first = provider.call(query: "Ruby APIs", engine: "google")
    second = provider.call(query: "Ruby APIs", engine: "google")

    expect(first).to eq(second)
    expect(first[:provider]).to eq("demo")
    expect(first[:metadata][:demo]).to be(true)
    expect(first[:results]).not_to be_empty
    expect(first[:results].first[:snippet]).to include("Synthetic", "not a live search result")
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end
end
