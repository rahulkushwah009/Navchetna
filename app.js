require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const Registration = require("./models/Registration");
const SecretCode = require("./models/SecretCode");
const Hackathon = require("./models/Hackathon");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// MongoDB Connection
// ======================================
mongoose.set("strictQuery", true);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Atlas Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}
connectDB();

// ======================================
// Razorpay Instance
// ======================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ======================================
// Ticket ID Generators
// ======================================
function generateTicketId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NYSM26-${randomNum}`;
}

function generateHackathonTicketId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `TM26-${randomNum}`;
}

// ======================================
// Middlewares (Extended Limits for Multi-Event Payloads)
// ======================================
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(methodOverride("_method"));

// ======================================
// Page Routes
// ======================================
app.get("/", (req, res) => res.render("homePage"));
// app.get("/hackathon", (req, res) => res.render("hackathon"));
app.get("/register", (req, res) => res.render("register"));
app.get("/success", (req, res) => res.render("success"));
// app.get("/hackaton-register", (req, res) => res.render("Hregister"));

// ======================================
// Shared & General API Routes
// ======================================

// 1. Validate Secret Code
app.post("/api/validate-secret-code", async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (!secretCode) {
      return res.status(400).json({ valid: false, error: "Code is required" });
    }

    const foundCode = await SecretCode.findOne({
      code: String(secretCode).trim().toUpperCase(),
      isActive: true,
    });

    if (!foundCode) {
      return res.status(404).json({ valid: false, message: "Invalid or inactive secret code." });
    }

    return res.json({
      valid: true,
      message: "Secret code applied successfully!",
      label: foundCode.label || "Complimentary",
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: "Validation server error." });
  }
});

// 2. Create Razorpay Order
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const amountInPaise = Math.round(Number(amount) * 100);

    if (amountInPaise <= 0) {
      return res.status(400).json({ error: "Invalid registration amount." });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: "Failed to create order: " + err.message });
  }
});

// ======================================
// Mahotsav Multi-Event Registration Routes
// ======================================

// 3. Verify Payment & Save Registration
app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      participantData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment verification tokens." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    const existing = await Registration.findOne({ razorpayOrderId: razorpay_order_id });
    if (existing) {
      return res.json({ status: "PAID", ticketId: existing.ticketId });
    }

    const ticketId = generateTicketId();
    const rawEvents = Array.isArray(participantData.events) ? participantData.events : [];
    
    // Normalize and sanitize event objects
    const events = rawEvents.map(e => ({
      id: String(e.id || ""),
      name: String(e.name || ""),
      coordinators: String(e.coordinators || ""),
      fee: Number(e.fee) || 0,
      participantType: String(e.participantType || "Solo"),
      groupCount: Number(e.groupCount) || 1,
      teamName: String(e.teamName || "").trim()
    }));

    const eventNameCombined = events.map(e => {
      if (e.participantType === "Group" && e.teamName) {
        return `${e.name} (Squad: ${e.teamName}, ${e.groupCount}P)`;
      }
      return e.name;
    }).join(", ") || String(participantData.eventName || "Mahotsav Pass");

    const reg = new Registration({
      ticketId,
      fullName: String(participantData.fullName || "").trim(),
      mobile: String(participantData.mobile || "").trim(),
      school: String(participantData.school || "").trim(),
      classCourse: String(participantData.classCourse || "").trim(),
      age: Number(participantData.age) || 18,
      teamSlot: String(participantData.teamSlot || "").trim(),
      category: String(participantData.category || "Senior"),
      gender: String(participantData.gender || "Male"),
      reference: String(participantData.reference || "").trim(),
      eventName: eventNameCombined,
      events: events,
      amount: Number(participantData.amount) || 0,
      status: "PAID",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    await reg.save();

    return res.json({ status: "PAID", ticketId: reg.ticketId });
  } catch (err) {
    console.error("Error verifying payment:", err);
    return res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

// 4. Record Complimentary Registration
app.post("/api/record-complimentary", async (req, res) => {
  try {
    const {
      fullName, mobile, school, classCourse, age, teamSlot,
      category, gender, reference, events, eventName,
      secretCode,
    } = req.body;

    const validCode = await SecretCode.findOne({
      code: String(secretCode).trim().toUpperCase(),
      isActive: true,
    });

    if (!validCode) {
      return res.status(403).json({ error: "Unauthorized: Invalid or expired secret code." });
    }

    const ticketId = generateTicketId();
    const rawEvents = Array.isArray(events) ? events : [];
    
    const formattedEvents = rawEvents.map(e => ({
      id: String(e.id || ""),
      name: String(e.name || ""),
      coordinators: String(e.coordinators || ""),
      fee: 0,
      participantType: String(e.participantType || "Solo"),
      groupCount: Number(e.groupCount) || 1,
      teamName: String(e.teamName || "").trim()
    }));

    const eventNameCombined = formattedEvents.map(e => {
      if (e.participantType === "Group" && e.teamName) {
        return `${e.name} (Squad: ${e.teamName}, ${e.groupCount}P)`;
      }
      return e.name;
    }).join(", ") || String(eventName || "Complimentary Pass");

    const reg = new Registration({
      ticketId,
      fullName: String(fullName || "").trim(),
      mobile: String(mobile || "").trim(),
      school: String(school || "").trim(),
      classCourse: String(classCourse || "").trim(),
      age: Number(age) || 18,
      teamSlot: String(teamSlot || "").trim(),
      category: String(category || "Senior"),
      gender: String(gender || "Male"),
      reference: String(reference || "").trim(),
      eventName: eventNameCombined,
      events: formattedEvents,
      amount: 0,
      secretCode: validCode.code,
      status: "COMPLIMENTARY",
    });

    await reg.save();

    return res.json({ status: "COMPLIMENTARY", ticketId: reg.ticketId });
  } catch (err) {
    console.error("Error saving complimentary registration:", err);
    return res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// 5. Check Order Status
app.get("/api/check-status", async (req, res) => {
  try {
    const { orderId } = req.query;
    const reg = await Registration.findOne({ razorpayOrderId: orderId });

    if (!reg) {
      return res.status(404).json({ error: "Order or payment record not found." });
    }

    return res.json({ status: reg.status, ticketId: reg.ticketId });
  } catch (err) {
    return res.status(500).json({ error: "Status check failed." });
  }
});

// ======================================
// Tech Manthan Hackathon API Routes
// ======================================

// 6. Verify Hackathon Payment
app.post("/api/verify-hackathon-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      hackathonData,
    } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    const existing = await Hackathon.findOne({ razorpayOrderId: razorpay_order_id });
    if (existing) {
      return res.json({ status: "PAID", ticketId: existing.ticketId });
    }

    const ticketId = generateHackathonTicketId();

    const hackathonDoc = new Hackathon({
      ticketId,
      teamName: hackathonData.teamName,
      teamSize: Number(hackathonData.teamSize),
      leader: hackathonData.leader,
      members: hackathonData.members,
      amount: Number(hackathonData.amount),
      status: "PAID",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    await hackathonDoc.save();

    return res.json({ status: "PAID", ticketId: hackathonDoc.ticketId });
  } catch (err) {
    console.error("Error verifying hackathon payment:", err);
    return res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

// 7. Record Complimentary Hackathon Registration
app.post("/api/record-hackathon-complimentary", async (req, res) => {
  try {
    const { teamName, teamSize, leader, members, secretCode } = req.body;

    const validCode = await SecretCode.findOne({
      code: String(secretCode).trim().toUpperCase(),
      isActive: true,
    });

    if (!validCode) {
      return res.status(403).json({ error: "Unauthorized: Invalid or expired secret code." });
    }

    const ticketId = generateHackathonTicketId();

    const hackathonDoc = new Hackathon({
      ticketId,
      teamName,
      teamSize: Number(teamSize),
      leader,
      members,
      amount: 0,
      secretCode: validCode.code,
      status: "COMPLIMENTARY",
    });

    await hackathonDoc.save();

    return res.json({ status: "COMPLIMENTARY", ticketId: hackathonDoc.ticketId });
  } catch (err) {
    console.error("Error saving complimentary hackathon registration:", err);
    return res.status(500).json({ error: "Hackathon registration failed: " + err.message });
  }
});

// ======================================
// 404 Handler & Server Start
// ======================================
app.use((req, res) => res.status(404).render("404"));

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));