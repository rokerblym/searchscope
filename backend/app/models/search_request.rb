# frozen_string_literal: true

class SearchRequest
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :user
  field :query, type: String
  field :normalized_query, type: String
  field :engine, type: String
  field :provider, type: String
  field :status, type: String, default: "pending"
  field :duration_ms, type: Float
  field :results, type: Array, default: []
  field :metadata, type: Hash, default: {}
  field :error_code, type: String
  field :error_message, type: String
  field :error_http_status, type: Integer
  field :retry_after, type: Integer
  field :expires_at, type: Time

  before_validation do
    self.query = query.to_s.strip
    self.normalized_query = query.downcase.gsub(/\s+/, " ")
  end

  validates :query, presence: true, length: { maximum: 200 }
  validates :normalized_query, presence: true
  validates :engine, inclusion: { in: %w[google bing] }
  validates :provider, inclusion: { in: %w[serpapi demo] }
  validates :status, inclusion: { in: %w[pending succeeded failed] }
  validates :duration_ms, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :expires_at, presence: true

  index({ user_id: 1, created_at: -1, _id: -1 })
  index({ user_id: 1, status: 1, engine: 1, normalized_query: 1 })
  index({ expires_at: 1 }, { expire_after_seconds: 0 })
end
