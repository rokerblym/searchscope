# frozen_string_literal: true

ENV["RAILS_ENV"] ||= "test"
require "spec_helper"
require_relative "../../../config/environment"
require "tmpdir"

RSpec.describe SearchScope::FrontendHosting do
  def request(app, path = "/api/v1/searches", **)
    Rack::MockRequest.new(described_class.new(app)).get(path, **)
  end

  it "protects static index and asset responses while preserving their contents" do
    Dir.mktmpdir do |directory|
      File.write(File.join(directory, "index.html"), "<html>SearchScope</html>")
      Dir.mkdir(File.join(directory, "assets"))
      File.write(File.join(directory, "assets", "index-ab123456.js"), "console.log('SearchScope')")
      fallback = ->(_env) { [404, { "content-type" => "application/json" }, ["missing"]] }
      static = ActionDispatch::Static.new(fallback, directory)

      index = request(static, "/")
      asset = request(static, "/assets/index-ab123456.js")
      expect(index.status).to eq(200)
      expect(index.body).to eq("<html>SearchScope</html>")
      expect(index["cache-control"]).to eq("no-cache")
      expect(index["content-security-policy"]).to include("script-src 'self'", "frame-ancestors 'none'")
      expect(asset.body).to eq("console.log('SearchScope')")
      expect(asset["cache-control"]).to eq("public, max-age=31536000, immutable")
      expect(asset["x-content-type-options"]).to eq("nosniff")
    end
  end

  it "never masks missing API paths or missing assets with the frontend document" do
    fallback = ->(_env) { [404, { "content-type" => "application/json" }, ["missing"]] }

    missing_api = request(fallback, "/api/v1/missing")
    missing_asset = request(fallback, "/assets/missing.js")
    expect(missing_api.status).to eq(404)
    expect(missing_api["cache-control"]).to eq("no-store")
    expect(missing_asset.status).to eq(404)
    expect(missing_asset["cache-control"]).to eq("no-cache")
    expect(missing_asset["x-frame-options"]).to eq("DENY")
  end

  it "preserves API statuses and bodies and prohibits caching authenticated responses" do
    headers = Rack::Headers.new
    headers["content-type"] = "application/json"
    api = ->(_env) { [401, headers, ['{"error":"unauthorized"}']] }

    response = request(api, "/api/v1/session")

    expect(response.status).to eq(401)
    expect(response.body).to eq('{"error":"unauthorized"}')
    expect(response["cache-control"]).to eq("no-store")
    expect(response["referrer-policy"]).to eq("no-referrer")
    expect(response["permissions-policy"]).to include("camera=()")
  end

  it "rejects oversized declared bodies before invoking the application" do
    app = instance_spy(Proc)

    response = request(app, "CONTENT_LENGTH" => "16385")

    expect(response.status).to eq(413)
    expect(JSON.parse(response.body).dig("error", "code")).to eq("payload_too_large")
    expect(response["cache-control"]).to eq("no-store")
    expect(app).not_to have_received(:call)
  end

  it "rejects oversized bodies even when a length header is absent or understated" do
    app = instance_spy(Proc)
    input = "x" * 16_385

    [nil, "1"].each do |length|
      response = request(app, "CONTENT_LENGTH" => length, "rack.input" => StringIO.new(input),
                              "HTTP_TRANSFER_ENCODING" => "chunked")
      expect(response.status).to eq(413)
      expect(response["content-security-policy"]).to include("object-src 'none'")
    end
    expect(app).not_to have_received(:call)
  end

  it "rejects an oversized body even if its input arrives in short fragments" do
    app = instance_spy(Proc)
    input = StringIO.new("x" * 16_385)
    allow(input).to(receive(:read).and_wrap_original { |original, length| original.call([length, 257].min) })

    response = request(app, "CONTENT_LENGTH" => nil, "rack.input" => input)

    expect(response.status).to eq(413)
    expect(app).not_to have_received(:call)
  end

  it "returns no response body when rejecting an oversized HEAD request" do
    app = instance_spy(Proc)
    middleware = described_class.new(app)
    response = Rack::MockRequest.new(middleware).head("/api/v1/searches", "CONTENT_LENGTH" => "16385")

    expect(response.status).to eq(413)
    expect(response.body).to eq("")
    expect(response["x-frame-options"]).to eq("DENY")
    expect(app).not_to have_received(:call)
  end

  it "normalizes a length-less accepted body before downstream Rails JSON parsing" do
    body = JSON.generate(query: "Ruby APIs")
    parser = lambda do |env|
      value = ActionDispatch::Request.new(env).request_parameters.fetch("query")
      [200, { "content-type" => "application/json" }, [JSON.generate(query: value)]]
    end

    response = request(parser, "rack.input" => StringIO.new(body), "CONTENT_LENGTH" => nil,
                               "CONTENT_TYPE" => "application/json")

    expect(response.status).to eq(200)
    expect(JSON.parse(response.body)).to eq("query" => "Ruby APIs")
  end

  it "keeps unversioned files and HTML under the assets path revalidatable" do
    script = ->(_env) { [200, { "content-type" => "application/javascript" }, ["script"]] }
    html = ->(_env) { [200, { "content-type" => "text/html" }, ["document"]] }
    cached_html = ->(_env) { [304, {}, []] }

    expect(request(script, "/assets/unversioned.js")["cache-control"]).to eq("no-cache")
    expect(request(html, "/assets/index-ab123456.html")["cache-control"]).to eq("no-cache")
    expect(request(cached_html, "/assets/index-ab123456.html")["cache-control"]).to eq("no-cache")
  end

  it "accepts a body at the byte limit and preserves it for a downstream JSON parser" do
    body = JSON.generate(query: "é" * 8186)
    expect(body.bytesize).to eq(16_384)
    parser = lambda do |env|
      value = JSON.parse(env.fetch("rack.input").read).fetch("query")
      [200, { "content-type" => "application/json" }, [JSON.generate(characters: value.length)]]
    end

    response = request(parser, "rack.input" => StringIO.new(body), "CONTENT_LENGTH" => body.bytesize.to_s)

    expect(response.status).to eq(200)
    expect(JSON.parse(response.body)).to eq("characters" => 8186)
  end
end
