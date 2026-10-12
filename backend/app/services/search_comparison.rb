# frozen_string_literal: true

require "uri"

class SearchComparison
  def self.call(left:, right:)
    new.call(left: left, right: right)
  end

  def call(left:, right:)
    left_index = indexed_results(left.results)
    right_index = indexed_results(right.results)
    shared = left_index.keys & right_index.keys
    overlaps = shared.map { |url| overlap(left_index.fetch(url), right_index.fetch(url)) }
    {
      overlapping_results: overlaps,
      left_unique_results: unique_results(left_index, shared),
      right_unique_results: unique_results(right_index, shared),
      position_changes: overlaps.map { |result| result.slice(:url, :domain, :left_position, :right_position) }
    }.merge(domain_sets(left_index.values, right_index.values), result_counts(left, right))
  end

  private

  def unique_results(index, shared)
    (index.keys - shared).map { |url| index.fetch(url) }
  end

  def domain_sets(left_results, right_results)
    left_domains = domains(left_results)
    right_domains = domains(right_results)
    { overlapping_domains: left_domains & right_domains,
      left_unique_domains: left_domains - right_domains,
      right_unique_domains: right_domains - left_domains }
  end

  def result_counts(left, right)
    { left_result_count: Array(left.results).length, right_result_count: Array(right.results).length,
      left_total_results: field(left.metadata || {}, :total_results),
      right_total_results: field(right.metadata || {}, :total_results) }
  end

  def overlap(left_result, right_result)
    {
      url: field(left_result, :url), title: field(left_result, :title),
      domain: field(left_result, :domain), left_position: field(left_result, :position),
      right_position: field(right_result, :position)
    }
  end

  def indexed_results(results)
    Array(results).each_with_object({}) do |result, index|
      next unless result.is_a?(Hash)

      url = canonical_url(field(result, :url))
      index[url] ||= result if url
    end
  end

  def canonical_url(value)
    return unless value.is_a?(String)

    uri = URI.parse(value)
    return unless %w[http https].include?(uri.scheme) && uri.host && !uri.userinfo

    uri.host = uri.host.downcase.delete_prefix("www.")
    uri.fragment = nil
    uri.path = "/" if uri.path.empty?
    uri.to_s
  rescue URI::InvalidURIError
    nil
  end

  def domains(results)
    results.filter_map { |result| field(result, :domain) }.uniq.sort
  end

  def field(hash, key)
    hash[key.to_s] || hash[key]
  end
end
