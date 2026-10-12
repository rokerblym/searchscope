# frozen_string_literal: true

module RequestHelpers
  TEST_PASSWORD = "a-test-password-123"

  def json_body
    JSON.parse(response.body)
  end

  def session_token
    get "/api/v1/session"
    expect(response).to have_http_status(:ok)
    @csrf_token = json_body.fetch("csrf_token")
  end

  def json_write(method, path, params = {})
    session_token unless @csrf_token
    public_send(method, path, params: params, as: :json, headers: { "X-CSRF-Token" => @csrf_token })
    token = json_body["csrf_token"] unless response.body.empty?
    @csrf_token = token if token
  end

  def sign_in(email: "eldar@example.test")
    user = User.create!(email: email, password: TEST_PASSWORD)
    json_write(:post, "/api/v1/auth/login", { email: email, password: TEST_PASSWORD })
    expect(response).to have_http_status(:ok)
    user
  end

  def persist_search(user:, query: "Ruby APIs", results: [], **attributes)
    SearchRequest.create!(
      {
        user: user, query: query,
        normalized_query: query.downcase.strip.gsub(/\s+/, " "),
        engine: "google", provider: "demo", status: "succeeded",
        duration_ms: 15.0, results: results,
        metadata: { demo: true, total_results: results.length },
        expires_at: 30.days.from_now
      }.merge(attributes)
    )
  end
end
