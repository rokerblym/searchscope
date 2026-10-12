# frozen_string_literal: true

formatter = lambda do |severity, timestamp, _name, message|
  "#{JSON.generate(timestamp: timestamp.utc.iso8601(3), level: severity.downcase, message: message.to_s)}\n"
end
formatter.extend(ActiveSupport::TaggedLogging::Formatter)
Rails.logger.formatter = formatter

# Driver debug output includes queries and document values. Keep it separate
# from Rails verbosity so raising application log levels cannot expose them.
database_logger = ActiveSupport::Logger.new($stdout)
database_logger.formatter = formatter
database_logger.level = Logger::WARN
Mongoid.logger = database_logger
Mongo::Logger.logger = database_logger
