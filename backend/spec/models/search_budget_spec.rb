# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchBudget, type: :model do
  it "allows exactly three concurrent reservations without exceeding the shared limit" do
    ready = Queue.new
    gate = Queue.new
    threads = Array.new(10) do
      Thread.new do
        ready << true
        gate.pop
        described_class.reserve(key: "concurrent-budget", limit: 3)
      end
    end
    10.times { ready.pop }
    10.times { gate << true }

    expect(threads.map(&:value).count(true)).to eq(3)
    expect(described_class.where(key: "concurrent-budget").count).to eq(1)
    expect(described_class.find_by(key: "concurrent-budget").count).to eq(3)
    expect(described_class.find_by(key: "concurrent-budget").expires_at).to be > Time.current
    index = described_class.collection.indexes.to_a.find { |item| item["key"] == { "expires_at" => 1 } }
    expect(index.fetch("expireAfterSeconds")).to eq(0)
  end
end
