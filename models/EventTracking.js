const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    trackingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventTracking",
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      index: true,
    },
    ticketId: { type: String, required: true },
    eventId: { type: String, required: true },

    // Performed by
    performedBy: {
      memberId: { type: String, default: "SYSTEM" },
      name: { type: String, required: true },
      role: {
        type: String,
        enum: ["ADMIN", "MEMBER", "DESK", "COORDINATOR", "SYSTEM"],
        default: "MEMBER",
      },
    },

    // Activity Type
    activityType: {
      type: String,
      enum: ["CALL", "WHATSAPP", "DESK_CHECKIN", "STAGE_UPDATE", "REMARK"],
      required: true,
      index: true,
    },

    // Outcome for Calls
    callOutcome: {
      type: String,
      enum: [
        "ANSWERED",
        "NOT_ANSWERED",
        "BUSY",
        "SWITCHED_OFF",
        "CALL_BACK",
        "WRONG_NUMBER",
        "N/A",
      ],
      default: "N/A",
    },

    // Outcome for WhatsApp
    whatsappStatus: {
      type: String,
      enum: ["SENT", "DELIVERED", "FAILED", "N/A"],
      default: "N/A",
    },

    remarks: { type: String, trim: true, default: "" },
    callAttemptNumber: { type: Number, default: 1 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable chronological log
  }
);

// Helpful index to quickly query daily follow-ups
activityLogSchema.index({ createdAt: -1, activityType: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
