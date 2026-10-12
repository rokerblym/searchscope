# frozen_string_literal: true

# Atomic counters bound potential SerpApi spending across application processes.
class SearchBudget
  include Mongoid::Document

  field :key, type: String
  field :count, type: Integer, default: 0
  field :expires_at, type: Time

  index({ key: 1 }, { unique: true })
  index({ expires_at: 1 }, { expire_after_seconds: 0 })

  def self.reserve(key:, limit:)
    update = { "$inc" => { "count" => 1 },
               "$setOnInsert" => { "key" => key, "expires_at" => Time.current.utc.end_of_day + 1.day } }
    collection.find(key: key, count: { "$lt" => limit })
              .find_one_and_update(update, upsert: true, return_document: :after).present?
  rescue Mongo::Error::OperationFailure => e
    raise unless e.code == 11_000

    false # An existing counter has reached its unique-key reservation limit.
  end
end
