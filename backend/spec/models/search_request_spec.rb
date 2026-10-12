# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchRequest, type: :model do
  let(:user) { User.create!(email: "eldar@example.test", password: "secure-test-password") }
  let(:attributes) do
    { user: user, query: "Ruby APIs", normalized_query: "ruby apis", engine: "google", provider: "demo",
      status: "succeeded", duration_ms: 10.5, expires_at: 30.days.from_now }
  end

  it "persists the owning user, request metadata and timestamps" do
    record = described_class.create!(attributes.merge(results: [{ title: "Ruby", url: "https://ruby-lang.org/" }]))

    expect(record.reload.user).to eq(user)
    expect(record.results.first["title"]).to eq("Ruby")
    expect(record.created_at).to be_present
    expect(record.updated_at).to be_present
  end

  it "rejects unsupported engines and statuses" do
    record = described_class.new(attributes.merge(engine: "unsupported", status: "invented"))

    expect(record).not_to be_valid
    expect(record.errors[:engine]).not_to be_empty
    expect(record.errors[:status]).not_to be_empty
  end

  it "requires ownership and a nonblank query no longer than 200 characters" do
    expect(described_class.new(attributes.merge(user: nil))).not_to be_valid
    expect(described_class.new(attributes.merge(query: " "))).not_to be_valid
    expect(described_class.new(attributes.merge(query: "x" * 201))).not_to be_valid
  end

  it "creates an expiration index and an owner-aware history index in MongoDB" do
    indexes = described_class.collection.indexes.to_a
    ttl = indexes.find { |index| index["key"] == { "expires_at" => 1 } }

    expect(ttl).not_to be_nil
    expect(ttl["expireAfterSeconds"]).to eq(0)
    expect(indexes.any? { |index| index["key"].key?("user_id") }).to be(true)
  end
end
