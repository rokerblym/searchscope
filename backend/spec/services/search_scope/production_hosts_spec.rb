# frozen_string_literal: true

ENV["RAILS_ENV"] ||= "test"
require "spec_helper"
require_relative "../../../config/environment"

RSpec.describe SearchScope::ProductionHosts do
  it "prefers explicitly configured hosts over the Render platform hostname" do
    environment = { "ALLOWED_HOSTS" => " app.example.test, api.example.test ", "SERVE_FRONTEND" => "true",
                    "RENDER_EXTERNAL_HOSTNAME" => "searchscope.onrender.com" }

    expect(described_class.call(environment)).to eq(%w[app.example.test api.example.test])
  end

  it "uses only the exact platform-provided hostname when frontend hosting is enabled" do
    hosts = described_class.call("SERVE_FRONTEND" => "true", "RENDER_EXTERNAL_HOSTNAME" => "searchscope.onrender.com")

    expect(hosts).to eq(["searchscope.onrender.com"])
    authorization = ActionDispatch::HostAuthorization.new(->(_env) { [200, {}, ["ok"]] }, hosts)
    client = Rack::MockRequest.new(authorization)
    expect(client.get("/", "HTTP_HOST" => "searchscope.onrender.com").status).to eq(200)
    expect(client.get("/", "HTTP_HOST" => "evil.searchscope.onrender.com").status).to eq(403)
  end

  it "fails without configured hosts instead of allowing every public hostname" do
    expect { described_class.call("SERVE_FRONTEND" => "true") }.to raise_error(RuntimeError)
    expect do
      described_class.call("RENDER_EXTERNAL_HOSTNAME" => "searchscope.onrender.com")
    end.to raise_error(KeyError)
  end

  it "does not replace an explicitly empty allowed-host configuration with a fallback" do
    environment = { "ALLOWED_HOSTS" => " ", "SERVE_FRONTEND" => "true",
                    "RENDER_EXTERNAL_HOSTNAME" => "searchscope.onrender.com" }

    expect { described_class.call(environment) }.to raise_error(RuntimeError)
  end

  invalid_hosts = [
    ".onrender.com", "*.onrender.com", "https://searchscope.onrender.com", "searchscope.onrender.com,evil.test"
  ]
  invalid_hosts.each do |hostname|
    it "rejects a platform fallback containing a wildcard, URL, or host list: #{hostname}" do
      environment = { "SERVE_FRONTEND" => "true", "RENDER_EXTERNAL_HOSTNAME" => hostname }

      expect { described_class.call(environment) }.to raise_error(RuntimeError)
    end
  end
end
