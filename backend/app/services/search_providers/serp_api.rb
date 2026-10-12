# frozen_string_literal: true

require "json"
require "net/http"
require "openssl"
require "timeout"
require "uri"

module SearchProviders
  class SerpApi
    ENDPOINT = "https://serpapi.com/search.json"
    ENGINES = %w[google bing].freeze
    MAX_BODY_BYTES = 2 * 1024 * 1024
    MAX_RETRY_AFTER = 300
    MAX_REQUEST_SECONDS = 30

    # Transport injection allows deterministic tests with no paid API requests.
    def initialize(api_key: ENV.fetch("SERPAPI_API_KEY", nil), transport: nil)
      @api_key = api_key
      @transport = transport || method(:perform_request)
    end

    def call(query:, engine:)
      validate_configuration!(engine)
      uri = URI(ENDPOINT)
      uri.query = URI.encode_www_form(engine: engine, q: query, api_key: @api_key)
      response = Timeout.timeout(MAX_REQUEST_SECONDS) { request_with_connection_retry(uri) }
      parse_response(response)
    rescue Timeout::Error
      raise Error.new(code: "provider_timeout", message: "The search provider timed out.", http_status: 504), cause: nil
    rescue SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError
      raise Error.new(code: "provider_network_error", message: "The search provider could not be reached.",
                      http_status: 502), cause: nil
    end

    private

    def validate_configuration!(engine)
      if @api_key.nil? || @api_key.strip.empty?
        raise Error.new(code: "provider_not_configured", message: "The search provider is not configured.",
                        http_status: 503)
      end

      return if ENGINES.include?(engine)

      raise Error.new(code: "unsupported_engine", message: "Use the google or bing search engine.", http_status: 422)
    end

    def request_with_connection_retry(uri)
      attempts = 0
      begin
        attempts += 1
        @transport.call(uri)
      rescue SocketError, Errno::ECONNREFUSED
        # These failures happen before a connection is established. Do not retry
        # timeouts, HTTP errors, or dropped connections: a request may be billed.
        retry if attempts < 2
        raise
      end
    end

    def perform_request(uri)
      request = Net::HTTP::Get.new(uri.request_uri)
      request["Accept"] = "application/json"
      request["User-Agent"] = "SearchScope/1.0"
      configured_http(uri).start do |connection|
        connection.request(request) { |response| read_bounded_response(response) }
      end
    end

    def configured_http(uri)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_PEER
      http.open_timeout = 5
      http.read_timeout = 20
      http.write_timeout = 5
      http.max_retries = 0
      http
    end

    def read_bounded_response(response)
      body = +""
      response.read_body do |chunk|
        raise_malformed! if body.bytesize + chunk.bytesize > MAX_BODY_BYTES

        body << chunk
      end
      response.body = body
      response
    end

    def parse_response(response)
      status = response.code.to_i
      raise_http_error!(status, response) unless (200..299).cover?(status)

      data = decode_body(response.body)
      raise_payload_error!(data["error"]) if data["error"]
      {
        results: ResultNormalizer.call(organic_results(data)),
        metadata: normalize_metadata(data), provider: "serpapi"
      }
    end

    def decode_body(body)
      if body.nil? || body.strip.empty?
        raise Error.new(code: "provider_empty_response", message: "The search provider returned an empty response.",
                        http_status: 502)
      end

      raise_malformed! if body.bytesize > MAX_BODY_BYTES

      data = JSON.parse(body)
      raise_malformed! unless data.is_a?(Hash)
      data
    rescue JSON::ParserError
      raise_malformed!
    end

    def organic_results(data)
      results = data["organic_results"]
      # SerpApi omits organic_results for some valid searches with no matches.
      information = data["search_information"]
      count = information["total_results"] if information.is_a?(Hash)
      results = [] if results.nil? && count.is_a?(Integer) && count.zero?
      raise_malformed! unless results.is_a?(Array)

      results
    end

    def normalize_metadata(data)
      search_metadata = data["search_metadata"].is_a?(Hash) ? data["search_metadata"] : {}
      search_information = data["search_information"].is_a?(Hash) ? data["search_information"] : {}
      id = search_metadata["id"]
      count = search_information["total_results"]
      {
        provider_search_id: id.is_a?(String) ? id[0, 200] : nil,
        total_results: count.is_a?(Integer) && count >= 0 ? count : nil
      }
    end

    def raise_http_error!(status, response)
      case status
      when 401, 403
        raise_authentication!
      when 429
        retry_after = bounded_retry_after(response["Retry-After"])
        raise Error.new(code: "provider_rate_limited",
                        message: "The search provider rate limit was reached. Try again later.",
                        http_status: 429, retry_after: retry_after)
      else
        raise Error.new(code: "provider_upstream_error", message: "The search provider returned an error.",
                        http_status: 502)
      end
    end

    def bounded_retry_after(value)
      return unless value.to_s.match?(/\A\d{1,10}\z/)

      value.to_i.clamp(1, MAX_RETRY_AFTER)
    end

    def raise_payload_error!(message)
      case message.to_s.downcase
      when /api.?key|authentication|unauthorized/
        raise_authentication!
      when /rate.?limit|quota|run out of searches|out of searches/
        raise Error.new(code: "provider_rate_limited",
                        message: "The search provider rate limit was reached. Try again later.", http_status: 429)
      else
        raise Error.new(code: "provider_upstream_error",
                        message: "The search provider could not complete this search.", http_status: 502)
      end
    end

    def raise_authentication!
      raise Error.new(code: "provider_authentication_failed", message: "The search provider rejected its credentials.",
                      http_status: 502)
    end

    def raise_malformed!
      raise Error.new(code: "provider_malformed_response",
                      message: "The search provider returned an invalid response.", http_status: 502)
    end
  end
end
