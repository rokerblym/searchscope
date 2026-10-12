# frozen_string_literal: true

threads_count = Integer(ENV.fetch("RAILS_MAX_THREADS", 3))
threads threads_count, threads_count
port ENV.fetch("PORT", 3000)
environment ENV.fetch("RAILS_ENV", "development")
pidfile ENV.fetch("PIDFILE", "tmp/pids/server.pid")

# Also reject oversized uploads at the server, before Rails parses them.
http_content_length_limit 16 * 1024 if ENV["SERVE_FRONTEND"] == "true"
