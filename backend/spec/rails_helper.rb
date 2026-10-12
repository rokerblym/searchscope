# frozen_string_literal: true

ENV["RAILS_ENV"] ||= "test"
abort "Refusing to run application specs outside RAILS_ENV=test" unless ENV["RAILS_ENV"] == "test"

require "spec_helper"
require_relative "../config/environment"
require "rspec/rails"
require "webmock/rspec"
require_relative "support/request_helpers"
require_relative "support/budget_helpers"

WebMock.disable_net_connect!(allow_localhost: true)

RSpec.configure do |config|
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
  config.include RequestHelpers, type: :request
  config.include BudgetHelpers

  config.before(:suite) do
    database_name = Mongoid.default_client.database.name
    unless Rails.env.test? && database_name.end_with?("_test")
      abort "Refusing database cleanup: use a MongoDB database whose name ends in _test"
    end
    Mongoid.default_client.database.command(ping: 1)
    User.create_indexes
    SearchRequest.create_indexes
    SearchBudget.create_indexes
  end

  config.around do |example|
    previous_provider = ENV.fetch("SEARCH_PROVIDER", nil)
    ENV["SEARCH_PROVIDER"] = "demo"
    example.run
  ensure
    previous_provider.nil? ? ENV.delete("SEARCH_PROVIDER") : ENV["SEARCH_PROVIDER"] = previous_provider
  end

  config.before do
    # Never drop a database. Cleanup is deliberately restricted to the
    # application collections in a verified test database.
    unless Rails.env.test? && Mongoid.default_client.database.name.end_with?("_test")
      abort "Refusing to delete records outside the test database"
    end
    SearchRequest.delete_all
    SearchBudget.delete_all
    User.delete_all
    Rack::Attack.cache.store.clear if defined?(Rack::Attack)
  end
end
