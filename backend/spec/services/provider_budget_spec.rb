# frozen_string_literal: true

require "rails_helper"
require "active_support/testing/time_helpers"

RSpec.describe ProviderBudget do
  include ActiveSupport::Testing::TimeHelpers

  let(:first_user) { User.create!(email: "eldar@example.test", password: "secure-test-password") }
  let(:second_user) { User.create!(email: "other@example.test", password: "secure-test-password") }

  around { |example| with_budget_limits { example.run } }

  it "keeps per-user reservations independent and excludes rejected attempts from the global total" do
    described_class.reserve!(user: first_user)
    expect { described_class.reserve!(user: first_user) }.to raise_error(SearchProviders::Error)
    expect { described_class.reserve!(user: second_user) }.not_to raise_error
    expect { described_class.reserve!(user: second_user) }.to raise_error(SearchProviders::Error)

    global = SearchBudget.where(key: /\Aserpapi:global:/).first
    expect(global.count).to eq(2)
  end

  it "stops reservations across users when the shared global budget is exhausted" do
    ENV["SERPAPI_USER_DAILY_LIMIT"] = "10"
    ENV["SERPAPI_GLOBAL_DAILY_LIMIT"] = "2"
    described_class.reserve!(user: first_user)
    described_class.reserve!(user: second_user)

    expect { described_class.reserve!(user: first_user) }.to raise_error(SearchProviders::Error) do |error|
      expect(error).to have_attributes(code: "provider_budget_exceeded", http_status: 429)
    end
    expect(SearchBudget.where(key: /\Aserpapi:global:/).first.count).to eq(2)
  end

  it "resets daily reservations at UTC midnight even when the local calendar day is unchanged" do
    user = first_user
    Time.use_zone("Asia/Almaty") do
      travel_to(Time.utc(2026, 10, 12, 23, 59, 30)) do
        described_class.reserve!(user: user)
        expect { described_class.reserve!(user: user) }.to raise_error(SearchProviders::Error)
      end
      travel_to(Time.utc(2026, 10, 13, 0, 0, 30)) do
        expect { described_class.reserve!(user: user) }.not_to raise_error
      end
    end
  end

  it "uses a bounded default budget when configured limits are invalid" do
    ENV["SERPAPI_USER_DAILY_LIMIT"] = "0"
    ENV["SERPAPI_GLOBAL_DAILY_LIMIT"] = "not-an-integer"
    user = first_user
    20.times { described_class.reserve!(user: user) }

    expect { described_class.reserve!(user: user) }.to raise_error(SearchProviders::Error) do |error|
      expect(error).to have_attributes(code: "provider_budget_exceeded", http_status: 429)
    end
    expect(SearchBudget.where(key: /\Aserpapi:global:/).first.count).to eq(20)
  end
end
