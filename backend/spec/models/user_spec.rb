# frozen_string_literal: true

require "rails_helper"

RSpec.describe User, type: :model do
  let(:password) { "secure-test-password" }

  it "normalizes email and stores a password hash rather than plaintext" do
    user = described_class.create!(email: "  ELDAR@Example.test  ", password: password)

    expect(user.reload.email).to eq("eldar@example.test")
    expect(user.password_digest).not_to include(password)
    expect(user.authenticate(password)).to eq(user)
    expect(user.authenticate("incorrect-password")).to be(false)
  end

  it "rejects case-insensitive duplicate email addresses" do
    described_class.create!(email: "eldar@example.test", password: password)
    duplicate = described_class.new(email: "ELDAR@EXAMPLE.TEST", password: password)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:email]).not_to be_empty
  end

  it "rejects invalid emails and short passwords" do
    user = described_class.new(email: "not-an-email", password: "short")

    expect(user).not_to be_valid
    expect(user.errors[:email]).not_to be_empty
    expect(user.errors[:password]).not_to be_empty
  end

  it "rejects passwords longer than bcrypt's 72-byte limit" do
    user = described_class.new(email: "eldar@example.test", password: "é" * 37)

    expect(user).not_to be_valid
    expect(user.errors[:password]).not_to be_empty
  end
end
