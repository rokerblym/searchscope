# frozen_string_literal: true

require "uri"

module SearchProviders
  class ResultNormalizer
    MAX_RESULTS = 100
    MAX_TEXT_LENGTH = 2_000
    MAX_URL_LENGTH = 4_096

    def self.call(results)
      results.first(MAX_RESULTS).filter_map { |result| normalize_result(result) }
    end

    def self.normalize_result(result)
      return unless result.is_a?(Hash)

      url = safe_url(result["link"] || result["url"] || result[:url])
      title = text(result["title"] || result[:title])
      return unless url && title.present?

      {
        title: title, url: url, snippet: text(result["snippet"] || result[:snippet]),
        position: positive_position(result["position"] || result[:position]),
        domain: URI.parse(url).host.downcase.delete_prefix("www.")
      }
    end
    private_class_method :normalize_result

    def self.positive_position(value)
      value if value.is_a?(Integer) && value.positive?
    end
    private_class_method :positive_position

    def self.safe_url(value)
      return unless value.is_a?(String) && value.bytesize <= MAX_URL_LENGTH

      uri = URI.parse(value)
      return unless %w[http https].include?(uri.scheme) && uri.host && !uri.userinfo

      value
    rescue URI::InvalidURIError
      nil
    end

    def self.text(value)
      value[0, MAX_TEXT_LENGTH] if value.is_a?(String)
    end
    private_class_method :text
  end
end
