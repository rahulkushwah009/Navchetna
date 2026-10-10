const mongoose = require("mongoose");

const assignedLeadSchema = new mongoose.Schema(
  {
    sNo: { type: String, default: "-" },
    tokenNumber: { type: String, default: "-" },
    ticketId: { type: String, default: "-", index: true },
    fullName: { type: String, default: "-" },
    originalName: { type: String, default: "-" },
    mobile: { type: String, default: "-" },
    schoolCollege: { type: String, default: "-" },
    eventName: { type: String, default: "Event" },
    category: { type: String, default: "GENERAL" },
    teamSlot: { type: String, default: "-" },
    stageStatus: { type: String, default: "WAITING_BACKSTAGE" },
    performed: { type: String, default: "NO" },
    checkInTime: { type: String, default: "-" },
    markedBy: { type: String, default: "-" },

    // Staff Allocation Data
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    assignedStaffEmail: { type: String, required: true },
    callStatus: {
      type: String,
      enum: ["PENDING", "CALLED", "WILL_COME", "NOT_REACHABLE", "COMPLETED"],
      default: "PENDING",
    },
    staffNotes: { type: String, default: "" },
    batchId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AssignedLead ||
  mongoose.model("AssignedLead", assignedLeadSchema);
