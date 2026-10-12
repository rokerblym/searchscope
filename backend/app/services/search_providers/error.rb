# frozen_string_literal: true

module SearchProviders
  # Messages are safe to return to clients. Never include upstream bodies or URLs
  # here: the SerpApi request URL contains the API key.
  class Error < StandardError
    attr_reader :code, :http_status, :retry_after

    def initialize(code:, message:, http_status:, retry_after: nil)
      @code = code
      @http_status = http_status
      @retry_after = retry_after
      super(message)
    end
  end
end
