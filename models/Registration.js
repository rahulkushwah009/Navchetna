const mongoose = require("mongoose");

const selectedEventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    coordinators: { type: String, default: "" },
    fee: { type: Number, required: true, default: 0 },
    participantType: { type: String, default: "Solo" },
    groupCount: { type: Number, default: 1 },
    teamName: { type: String, default: "" }
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    school: { type: String, required: true, trim: true },
    classCourse: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 4, max: 40 },
    teamSlot: { type: String, default: "", trim: true },
    category: { type: String, required: true },
    gender: { type: String, required: true },
    reference: { type: String, default: "", trim: true },
    eventName: { type: String, required: true }, // Accepts unlimited string length
    events: [selectedEventSchema],
    amount: { type: Number, required: true, min: 0 },
    secretCode: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "COMPLIMENTARY", "FAILED"],
      default: "PENDING",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);