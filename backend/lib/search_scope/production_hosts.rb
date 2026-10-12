# frozen_string_literal: true

module SearchScope
  class ProductionHosts
    def self.call(env)
      explicit_hosts = env["ALLOWED_HOSTS"]
      if explicit_hosts.nil? && env["SERVE_FRONTEND"] == "true"
        hostname = env["RENDER_EXTERNAL_HOSTNAME"]
        raise "Set ALLOWED_HOSTS or a valid RENDER_EXTERNAL_HOSTNAME" unless valid_hostname?(hostname)

        return [hostname]
      end

      hosts = env.fetch("ALLOWED_HOSTS").split(",").map(&:strip).reject(&:empty?)
      raise "ALLOWED_HOSTS must contain a hostname" if hosts.empty?

      hosts
    end

    def self.valid_hostname?(hostname)
      return false unless hostname.is_a?(String) && hostname.bytesize <= 253

      labels = hostname.split(".", -1)
      labels.length > 1 && labels.all? { |label| label.match?(/\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/i) }
    end
    private_class_method :valid_hostname?
  end
end
