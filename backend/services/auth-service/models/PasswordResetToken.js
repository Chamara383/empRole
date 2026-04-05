const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: Date.now,
      expires: 3600, // Token expires in 1 hour (3600 seconds)
    },
    used: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries

passwordResetTokenSchema.index({ userId: 1 });

// Static method to generate reset token
passwordResetTokenSchema.statics.generateToken = function (userId) {
  const token = crypto.randomBytes(32).toString("hex");
  return this.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  });
};

// Static method to verify token
passwordResetTokenSchema.statics.verifyToken = async function (token) {
  const resetToken = await this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  }).populate("userId");

  return resetToken;
};

// Method to mark token as used
passwordResetTokenSchema.methods.markAsUsed = function () {
  this.used = true;
  return this.save();
};

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
