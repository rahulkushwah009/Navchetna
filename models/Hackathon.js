const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  college: { type: String, required: true, trim: true },
});

const hackathonSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    teamName: { type: String, required: true, trim: true },
    teamSize: { type: Number, required: true, enum: [3, 4, 5] },
    leader: {
      name: { type: String, required: true, trim: true },
      degree: { type: String, required: true, trim: true },
      college: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      social: { type: String, default: "", trim: true },
    },
    members: [memberSchema],
    amount: { type: Number, required: true },
    secretCode: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PAID", "COMPLIMENTARY", "FAILED"],
      default: "PAID",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);