const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    secretCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // Guarantees case-insensitive matches (e.g., 'ADMIN101', 'DANCE001')
      index: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "COORDINATOR"],
      required: true,
      default: "COORDINATOR",
    },
    // Required only if role is COORDINATOR
    assignedEventId: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staff", staffSchema);
