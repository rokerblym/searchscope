# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchComparison do
  let(:record_class) { Struct.new(:results, :metadata) }
  let(:left_results) do
    [
      { "title" => "Shared", "url" => "https://www.example.com/guide#top",
        "domain" => "example.com", "position" => 1 },
      { "title" => "Left", "url" => "https://left.test/", "domain" => "left.test", "position" => 2 }
    ]
  end
  let(:right_results) do
    [
      { title: "Shared", url: "https://example.com/guide#details", domain: "example.com", position: 3 },
      { title: "Right", url: "https://right.test/", domain: "right.test", position: 1 }
    ]
  end

  it "compares matching URLs, result positions, shared domains and unique results" do
    left = record_class.new(left_results, { "total_results" => 150 })
    right = record_class.new(right_results, {})

    comparison = described_class.call(left: left, right: right)

    expect(comparison[:overlapping_results].length).to eq(1)
    expect(comparison[:position_changes].first).to include(left_position: 1, right_position: 3)
    expect(comparison[:overlapping_domains]).to eq(["example.com"])
    expect(comparison[:left_unique_domains]).to eq(["left.test"])
    expect(comparison[:right_unique_domains]).to eq(["right.test"])
    expect(comparison[:left_unique_results].first["title"]).to eq("Left")
    expect(comparison[:right_unique_results].first[:title]).to eq("Right")
    expect(comparison).to include(left_result_count: 2, right_result_count: 2,
                                  left_total_results: 150, right_total_results: nil)
  end

  it "preserves missing positions and empty result sets without inventing counts" do
    left = record_class.new([{ title: "Shared", url: "https://example.com/", domain: "example.com" }], {})
    right = record_class.new([{ title: "Shared", url: "https://example.com/", domain: "example.com", position: 2 }], {})

    comparison = described_class.call(left: left, right: right)

    expect(comparison[:position_changes].first).to include(left_position: nil, right_position: 2)
    empty = described_class.call(left: record_class.new([], {}), right: record_class.new([], {}))
    expect(empty[:overlapping_results]).to eq([])
    expect(empty[:left_result_count]).to eq(0)
    expect(empty[:left_total_results]).to be_nil
  end

  it "does not treat different URL query strings as the same result" do
    left = record_class.new([{ title: "A", url: "https://example.com/?q=a", domain: "example.com" }], {})
    right = record_class.new([{ title: "B", url: "https://example.com/?q=b", domain: "example.com" }], {})

    comparison = described_class.call(left: left, right: right)

    expect(comparison[:overlapping_results]).to eq([])
    expect(comparison[:overlapping_domains]).to eq(["example.com"])
    expect(comparison[:left_unique_results].length).to eq(1)
    expect(comparison[:right_unique_results].length).to eq(1)
  end
end
