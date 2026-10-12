# frozen_string_literal: true

require "rails_helper"

RSpec.describe SearchProviders::SerpApi do
  let(:test_key) { "test-only-not-a-real-api-key" }
  let(:provider) { described_class.new(api_key: test_key) }
  let(:request_stub) do
    stub_request(:get, described_class::ENDPOINT)
      .with(query: { engine: "google", q: "Ruby APIs", api_key: test_key })
  end
  let(:documented_response) do
    {
      organic_results: [
        { title: "Ruby", link: "https://www.ruby-lang.org/", position: 1, snippet: "Language reference" },
        { title: "JavaScript URL", link: "javascript:alert(1)", position: 2 },
        { title: "Credential URL", link: "https://user:password@example.test/" },
        { title: "Documentation", link: "https://docs.example.test/", position: "3" },
        { link: "https://missing-title.example.test/" },
        nil
      ],
      search_metadata: { id: "provider-search-id", raw_html_file: "https://private.example.test/" },
      search_information: { total_results: 1234 }
    }
  end

  def search
    provider.call(query: "Ruby APIs", engine: "google")
  end

  def expect_provider_error(code, status)
    expect { search }.to raise_error(SearchProviders::Error) do |error|
      expect(error).to have_attributes(code: code, http_status: status)
      expect(error.message).not_to include(test_key, "api_key=", "upstream-private-details")
    end
  end

  it "normalizes a documented response while discarding unsafe links and unnecessary provider fields" do
    request_stub.to_return(status: 200, body: documented_response.to_json)

    payload = search

    expect(payload[:provider]).to eq("serpapi")
    expect(payload[:results]).to eq([
                                      { title: "Ruby", url: "https://www.ruby-lang.org/", position: 1,
                                        snippet: "Language reference", domain: "ruby-lang.org" },
                                      { title: "Documentation", url: "https://docs.example.test/", position: nil,
                                        snippet: nil, domain: "docs.example.test" }
                                    ])
    expect(payload[:metadata]).to eq(provider_search_id: "provider-search-id", total_results: 1234)
    expect(request_stub).to have_been_requested.once
  end

  it "accepts a successful search with no results" do
    request_stub.to_return(status: 200, body: { search_information: { total_results: 0 } }.to_json)

    expect(search[:results]).to eq([])
  end

  it "rejects missing credentials before contacting SerpApi" do
    missing = described_class.new(api_key: " ")

    expect { missing.call(query: "Ruby", engine: "google") }
      .to raise_error(SearchProviders::Error) { |error| expect(error.code).to eq("provider_not_configured") }
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end

  it "rejects unsupported engines before contacting SerpApi" do
    expect { provider.call(query: "Ruby", engine: "unsupported") }
      .to raise_error(SearchProviders::Error) { |error| expect(error.http_status).to eq(422) }
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end

  [401, 403].each do |status|
    it "maps HTTP #{status} to a safe upstream credential error" do
      request_stub.to_return(status: status, body: "upstream-private-details #{test_key}")

      expect_provider_error("provider_authentication_failed", 502)
      expect(request_stub).to have_been_requested.once
    end
  end

  it "handles rate limits, bounds Retry-After and does not repeat a billable request" do
    request_stub.to_return(status: 429, body: "upstream-private-details", headers: { "Retry-After" => "9999" })

    expect { search }.to raise_error(SearchProviders::Error) do |error|
      expect(error.code).to eq("provider_rate_limited")
      expect(error.http_status).to eq(429)
      expect(error.retry_after).to eq(300)
    end
    expect(request_stub).to have_been_requested.once
  end

  it "ignores an invalid Retry-After value" do
    request_stub.to_return(status: 429, headers: { "Retry-After" => "not-a-duration" })

    expect { search }.to raise_error(SearchProviders::Error) { |error| expect(error.retry_after).to be_nil }
  end

  it "maps upstream failures without returning the provider response body" do
    request_stub.to_return(status: 503, body: "upstream-private-details #{test_key}")

    expect_provider_error("provider_upstream_error", 502)
    expect(request_stub).to have_been_requested.once
  end

  it "handles provider error payloads sent with HTTP 200" do
    request_stub.to_return(status: 200, body: { error: "Invalid API key: #{test_key}" }.to_json)

    expect_provider_error("provider_authentication_failed", 502)
  end

  it "handles exhausted quotas sent with HTTP 200" do
    request_stub.to_return(status: 200, body: { error: "Your account has run out of searches." }.to_json)

    expect_provider_error("provider_rate_limited", 429)
  end

  it "handles an empty provider response" do
    request_stub.to_return(status: 200, body: "  ")

    expect_provider_error("provider_empty_response", 502)
  end

  it "rejects oversized response bodies before attempting JSON parsing" do
    request_stub.to_return(status: 200, body: "x" * (described_class::MAX_BODY_BYTES + 1))
    allow(JSON).to receive(:parse).and_call_original

    expect_provider_error("provider_malformed_response", 502)
    expect(JSON).not_to have_received(:parse)
    expect(request_stub).to have_been_requested.once
  end

  ["not-json", "[]", "{}", '{"organic_results":{}}'].each do |body|
    it "rejects malformed provider data #{body.inspect}" do
      request_stub.to_return(status: 200, body: body)

      expect_provider_error("provider_malformed_response", 502)
    end
  end

  it "reports read timeouts without retrying a potentially billed request" do
    request_stub.to_raise(Net::ReadTimeout.new("upstream-private-details #{test_key}"))

    expect_provider_error("provider_timeout", 504)
    expect(request_stub).to have_been_requested.once
  end

  it "bounds the whole transport operation without retrying after its deadline" do
    attempts = 0
    transport = lambda do |_uri|
      attempts += 1
      sleep(0.05)
    end
    stub_const("SearchProviders::SerpApi::MAX_REQUEST_SECONDS", 0.01)
    timed_provider = described_class.new(api_key: test_key, transport: transport)

    expect { timed_provider.call(query: "Ruby", engine: "google") }.to raise_error(SearchProviders::Error) do |error|
      expect(error).to have_attributes(code: "provider_timeout", http_status: 504, cause: nil)
    end
    expect(attempts).to eq(1)
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end

  it "retries only a connection failure and succeeds on the second attempt" do
    request_stub.to_raise(SocketError.new("connection unavailable"))
                .then.to_return(status: 200, body: { organic_results: [] }.to_json)

    expect(search[:results]).to eq([])
    expect(request_stub).to have_been_requested.twice
  end

  it "caps connection retries and sanitizes network failure details" do
    request_stub.to_raise(SocketError.new("upstream-private-details #{test_key}"))

    expect { search }.to raise_error(SearchProviders::Error) do |error|
      expect(error).to have_attributes(code: "provider_network_error", http_status: 502, cause: nil)
      expect(error.full_message).not_to include(test_key, "upstream-private-details", "api_key=")
    end
    expect(request_stub).to have_been_requested.twice
  end

  it "does not retry TLS verification failures" do
    request_stub.to_raise(OpenSSL::SSL::SSLError.new("certificate verification failed"))

    expect_provider_error("provider_network_error", 502)
    expect(request_stub).to have_been_requested.once
  end
end
