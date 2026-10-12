# frozen_string_literal: true

class SearchAnalytics
  MAX_RECENT_ERRORS = 10

  # Scope must already be restricted to the authenticated user's live records.
  # MongoDB performs counts/aggregation; history is never loaded in full.
  def self.call(scope:)
    total = scope.count
    successful = scope.where(status: "succeeded").count
    failed = scope.where(status: "failed").count
    average = scope.where(:duration_ms.ne => nil).avg(:duration_ms)

    {
      total_searches: total,
      successful_searches: successful,
      failed_searches: failed,
      success_rate: percentage(successful, successful + failed),
      error_rate: percentage(failed, successful + failed),
      average_duration_ms: average&.round(2),
      top_domains: aggregate_domains(scope),
      provider_usage: aggregate_providers(scope),
      recent_errors: scope.where(status: "failed").order_by(created_at: :desc).limit(MAX_RECENT_ERRORS).map do |record|
        SearchSerializer.call(record)
      end
    }
  end

  def self.percentage(count, total)
    total.zero? ? nil : (count.to_f / total * 100).round(2)
  end

  def self.aggregate_domains(scope)
    pipeline = [
      { "$match" => scope.selector.merge("status" => "succeeded") },
      { "$unwind" => "$results" },
      { "$match" => { "results.domain" => { "$type" => "string", "$ne" => "" } } },
      { "$group" => { "_id" => "$results.domain", "count" => { "$sum" => 1 } } },
      { "$sort" => { "count" => -1, "_id" => 1 } },
      { "$limit" => 10 }
    ]
    scope.klass.collection.aggregate(pipeline).map { |row| { domain: row["_id"], count: row["count"] } }
  end

  def self.aggregate_providers(scope)
    pipeline = [
      { "$match" => scope.selector },
      { "$group" => { "_id" => "$provider", "count" => { "$sum" => 1 } } },
      { "$sort" => { "count" => -1, "_id" => 1 } }
    ]
    scope.klass.collection.aggregate(pipeline).map { |row| { provider: row["_id"], count: row["count"] } }
  end

  private_class_method :percentage, :aggregate_domains, :aggregate_providers
end
