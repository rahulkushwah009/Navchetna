const mongoose = require("mongoose");

const secretCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  label: {
    type: String, // e.g., "Sponsor Ticket", "VIP Guest", "Volunteer Staff"
    default: "General Waived Entry",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SecretCode", secretCodeSchema);