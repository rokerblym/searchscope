# frozen_string_literal: true

require "json"
require "stringio"

module SearchScope
  # Wrap the whole stack, including static files, when Rails hosts the frontend.
  class FrontendHosting
    MAX_BODY_BYTES = 16 * 1024
    SECURITY_HEADERS = {
      "x-content-type-options" => "nosniff",
      "x-frame-options" => "DENY",
      "referrer-policy" => "no-referrer",
      "permissions-policy" => "camera=(), microphone=(), geolocation=()",
      "content-security-policy" => "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " \
                                   "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " \
                                   "base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    }.freeze

    def initialize(app)
      @app = app
    end

    def call(env)
      response = bounded_input?(env) ? @app.call(env) : oversized_response(env)
      status, headers, body = response
      policy = SECURITY_HEADERS.merge("cache-control" => cache_control(env, status, headers))
      [status, headers.merge(policy), body]
    end

    private

    def bounded_input?(env)
      length = Integer(env.fetch("CONTENT_LENGTH", ""), exception: false)
      return false if length && length > MAX_BODY_BYTES

      input = env["rack.input"]
      return true unless input

      # A length header alone cannot bound chunked or missing-length requests.
      # Rack 3 inputs need not support rewind; give Rails a fresh bounded input.
      body = read_bounded_body(input)
      return false if body.bytesize > MAX_BODY_BYTES

      env["rack.input"] = StringIO.new(body)
      env["CONTENT_LENGTH"] = body.bytesize.to_s
      true
    end

    def read_bounded_body(input)
      body = +""
      while body.bytesize <= MAX_BODY_BYTES
        chunk = input.read(MAX_BODY_BYTES + 1 - body.bytesize)
        break if chunk.nil? || chunk.bytesize.zero?

        body << chunk
      end
      body
    end

    def oversized_response(env)
      body = JSON.generate(error: { code: "payload_too_large", message: "Request body exceeds the 16 KiB limit." })
      response_body = env["REQUEST_METHOD"] == "HEAD" ? [] : [body]
      [413, { "content-type" => "application/json", "content-length" => body.bytesize.to_s }, response_body]
    end

    def cache_control(env, status, headers)
      path = env.fetch("PATH_INFO", "")
      return "no-store" if path == "/api" || path.start_with?("/api/")

      asset = path.match?(%r{\A/assets/[^/]+-[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9]+\z})
      html = headers["content-type"].to_s.start_with?("text/html") || path.match?(/\.(?:html?|xhtml)\z/i)
      return "public, max-age=31536000, immutable" if asset && !html && ((200..299).cover?(status) || status == 304)

      "no-cache"
    end
  end
end
