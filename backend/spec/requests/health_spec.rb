# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Health", type: :request do
  it "provides public process liveness without contacting the paid provider" do
    get "/api/v1/health"

    expect(response).to have_http_status(:ok)
    expect(json_body).to include("status" => "ok", "service" => "searchscope")
    expect(response.headers["Cache-Control"]).to include("no-store")
    expect(a_request(:any, /serpapi\.com/)).not_to have_been_made
  end
end
