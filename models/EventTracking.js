const mongoose = require("mongoose");

const eventTrackingSchema = new mongoose.Schema(
  {
    // Reference to original Registration document
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      // Index covered by compound unique index below
    },
    ticketId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    }, // e.g. "ev_8" or "DANCE"
    eventName: {
      type: String,
      required: true,
      trim: true,
    },

    // Category & Group Details
    category: {
      type: String,
      enum: ["JUNIOR", "SENIOR", "OPEN"],
      required: true,
      uppercase: true,
      index: true,
    },
    participantType: {
      type: String,
      enum: ["Solo", "Group"],
      default: "Solo",
    },
    teamName: {
      type: String,
      trim: true,
      default: "",
    },

    // Pre-printed / Assigned Token
    tokenNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true, // e.g. "D15", "FF12"
    },

    // Fast flag for distribution engine
    isAssigned: {
      type: Boolean,
      default: false,
    },

    // --- STAFF TARGET & ASSIGNMENT ---
    assignedStaff: {
      staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
      secretCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },
      targetBatchId: {
        type: String,
        trim: true,
        default: "",
      },
      targetDeadline: {
        type: Date,
        default: null,
      },
      targetStatus: {
        type: String,
        enum: ["UNASSIGNED", "IN_PROGRESS", "TARGET_ACHIEVED", "TARGET_OVERDUE"],
        default: "UNASSIGNED",
        index: true,
      },
      assignedBy: {
        type: String,
        default: "Admin",
      },
      assignedAt: {
        type: Date,
        default: null,
      },
    },

    // --- CALL REMARKS & FOLLOW-UP STATUS ---
    followupStatus: {
      type: String,
      enum: [
        "PENDING",
        "WILL_COME",        // 1. Will Come in Event
        "WILL_NOT_COME",    // 2. Will Not Come in Event
        "CALL_NOT_PICKED",  // 3. Call Not Picked
        "CONTACTED",
        "CONFIRMED",
        "INTERESTED",
        "CALL_BACK",
        "NOT_INTERESTED",
        "NO_RESPONSE",
        "WRONG_NUMBER",
      ],
      default: "PENDING",
      index: true,
    },
    lastRemarkUpdatedBy: {
      memberId: { type: String, default: "" },
      email: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
    },

    // Summary Counters (Auto-incremented on each call/chat action)
    totalCalls: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWhatsApp: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastContactedAt: {
      type: Date,
      default: null,
    },

    // --- EVENT DAY ENTRY DESK STATUS ---
    entryStatus: {
      type: String,
      enum: ["PENDING", "PRESENT", "ABSENT"],
      default: "PENDING",
      index: true,
    },
    entryMarkedAt: {
      type: Date,
      default: null,
    },
    entryMarkedBy: {
      type: String,
      default: "",
    },

    // --- STAGE PERFORMANCE STATUS ---
    stageStatus: {
      type: String,
      enum: [
        "NOT_PRESENT",
        "WAITING_BACKSTAGE",
        "ON_STAGE",
        "PERFORMANCE_DONE",
        "DISQUALIFIED",
      ],
      default: "NOT_PRESENT",
      index: true,
    },
    performanceStartedAt: {
      type: Date,
      default: null,
    },
    performanceDoneAt: {
      type: Date,
      default: null,
    },
    coordinatorNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// --- HOOKS ---
// Keep `isAssigned` and `targetStatus` strictly synchronized on document saves
eventTrackingSchema.pre("save", function (next) {
  if (this.assignedStaff && this.assignedStaff.staffId) {
    this.isAssigned = true;
    if (this.assignedStaff.targetStatus === "UNASSIGNED") {
      this.assignedStaff.targetStatus = "IN_PROGRESS";
    }
  } else {
    this.isAssigned = false;
    if (this.assignedStaff) {
      this.assignedStaff.targetStatus = "UNASSIGNED";
    }
  }
  next();
});

// --- COMPOUND INDEXES ---
// 1. Unique constraint: one tracking record per registration per event
eventTrackingSchema.index({ registrationId: 1, eventId: 1 }, { unique: true });

// 2. High-speed query for the distribution pool
eventTrackingSchema.index({ isAssigned: 1, eventId: 1, category: 1 });

// 3. Coordinator desk and staff targeted lookups
eventTrackingSchema.index({ "assignedStaff.staffId": 1, followupStatus: 1 });
eventTrackingSchema.index({ "assignedStaff.secretCode": 1, followupStatus: 1 });

// 4. Coordinator real-time stage dashboard queries & filters
eventTrackingSchema.index({ eventId: 1, stageStatus: 1, followupStatus: 1 });
eventTrackingSchema.index({ eventId: 1, entryStatus: 1 });
eventTrackingSchema.index({ eventId: 1, category: 1, followupStatus: 1 });

module.exports = mongoose.model("EventTracking", eventTrackingSchema);
