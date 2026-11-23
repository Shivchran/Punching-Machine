
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    purpose: {
      type: String,
      enum: ["login", "registration", "password_reset"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Automatically delete expired OTP records
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Faster OTP lookup
otpSchema.index({
  employee: 1,
  purpose: 1,
  verified: 1,
  createdAt: -1,
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;