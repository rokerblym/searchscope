# frozen_string_literal: true

class User
  include Mongoid::Document
  include Mongoid::Timestamps
  include ActiveModel::SecurePassword

  field :email, type: String
  field :password_digest, type: String
  field :auth_version, type: Integer, default: 0
  has_secure_password
  has_many :search_requests, dependent: :destroy

  before_validation { self.email = email.to_s.strip.downcase }
  validates :email, presence: true, length: { maximum: 254 },
                    format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: true
  validates :password, length: { minimum: 10 }, if: -> { new_record? || password.present? }

  index({ email: 1 }, { unique: true })
end
