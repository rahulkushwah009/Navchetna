require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

app.use(
  session({
    secret: "navchetna_staff_secret_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day session
  })
);
// ======================================
// Master Events Data
// ======================================
const Staff = require("./models/Staff");
// const Registration = require("./models/Registration");
const EventTracking = require("./models/EventTracking");
const ActivityLog = require("./models/ActivityLog");
const EVENTS = [
  // Legacy alias preserved so historical registrations calculate accurately
  {
    id: "esports",
    name: "E-Sports Championship",
    isEsports: true,
    solo: { junior: 50, senior: 50 },
    duo: { junior: 100, senior: 100 },
    group: { junior: 150, senior: 150 },
    squad: { junior: 200, senior: 200 },
  },
  {
    id: "esports Free Fire",
    name: "E-Sports Free Fire Championship",
    isEsports: true,
    solo: { junior: 50, senior: 50 },
    duo: { junior: 100, senior: 100 },
    group: { junior: 150, senior: 150 },
    squad: { junior: 200, senior: 200 },
  },
  {
    id: "esports PUBG",
    name: "E-Sports PUBG Championship",
    isEsports: true,
    solo: { junior: 50, senior: 50 },
    duo: { junior: 100, senior: 100 },
    group: { junior: 150, senior: 150 },
    squad: { junior: 200, senior: 200 },
  },
  {
    id: "rangotsav",
    name: "Rangotsav : Drawing Competition",
    junior: 20,
    senior: 50,
  },
  {
    id: "bharatbodh",
    name: "Bharat Bodh : Quiz Competition",
    junior: 20,
    senior: 50,
  },
  {
    id: "techmanthan",
    name: "Tech Manthan Hackathon",
    junior: 99,
    senior: 99,
  },
  {
    id: "yuvavani",
    name: "Yuva-Vani : Open Mic",
    junior: 49,
    senior: 99,
  },
  {
    id: "loknritya",
    name: "Loknritya : Dance Competition",
    dance: true,
    solo: { junior: 49, senior: 99 },
    group: { junior: 20, senior: 50 },
  },
  {
    id: "rangebharat",
    name: "Rang-e-Bharat : Cultural Fashion Show",
    junior: 49,
    senior: 99,
  },
  {
    id: "beyondframe",
    name: "Beyond the Frame : Photography & Reel Competition",
    junior: 99,
    senior: 99,
  },
  {
    id: "kalamkar",
    name: "Kalamkar : Essay Competition",
    junior: 20,
    senior: 50,
  },
  {
    id: "dharmagatha",
    name: "Dharmagatha : Ramayan - Mahabharat Gyan Quiz",
    junior: 20,
    senior: 50,
  },
];

const eventNameMap = {
  "esports Free Fire": "E-Sports Free Fire Championship",
  "esports PUBG": "E-Sports PUBG Championship",
  esports: "E-Sports Championship",
  rangotsav: "Rangotsav (Drawing)",
  bharatbodh: "Bharat Bodh (Quiz)",
  techmanthan: "Tech Manthan Hackathon",
  yuvavani: "Yuva-Vani (Open Mic)",
  loknritya: "Loknritya (Dance)",
  rangebharat: "Rang-e-Bharat (Fashion)",
  beyondframe: "Beyond the Frame (Photo/Reel)",
  kalamkar: "Kalamkar (Essay)",
  dharmagatha: "Dharmagatha (Quiz)",
};

// ======================================
// Helper: Calculate Original Event Value
// ======================================
function calculateRegistrationOriginalAmount(reg, masterEvents) {
  // If explicitly edited and saved via admin, prefer saved waivedAmount
  if (reg.waivedAmount !== undefined && reg.waivedAmount !== null && Number(reg.waivedAmount) > 0) {
    return Number(reg.waivedAmount);
  }

  const cat = (reg.category || "Senior").toLowerCase().includes("junior")
    ? "junior"
    : "senior";

  let totalEstimated = 0;
  const eventsToEvaluate = Array.isArray(reg.events) && reg.events.length > 0
    ? reg.events
    : [];

  // Fallback for single-event legacy records without an array
  if (eventsToEvaluate.length === 0 && reg.eventName) {
    const matched = masterEvents.find(
      (m) =>
        m.name.toLowerCase() === reg.eventName.toLowerCase() ||
        m.id.toLowerCase() === reg.eventName.toLowerCase() ||
        (reg.eventName.toLowerCase().includes("esport") && m.id === "esports")
    );

    if (matched) {
      if (matched.junior && matched.senior) return matched[cat] || 0;
      if (matched.solo) return matched.solo[cat] || 0;
    }
  }

  for (const item of eventsToEvaluate) {
    const rawId = (item.id || "").toLowerCase();
    const rawName = (item.name || "").toLowerCase();

    // Match exact ID, exact Name, or fallback legacy esports patterns
    let master = masterEvents.find(
      (m) => m.id.toLowerCase() === rawId || m.name.toLowerCase() === rawName
    );

    if (!master && (rawId.includes("esport") || rawName.includes("esport"))) {
      master = masterEvents.find((m) => m.id === "esports");
    }

    if (!master) {
      totalEstimated += Number(item.fee) || 0;
      continue;
    }

    const type = (item.participantType || "Solo").toLowerCase();

    if (master.isEsports) {
      if (type === "solo" && master.solo) totalEstimated += master.solo[cat] || 50;
      else if (type === "duo" && master.duo) totalEstimated += master.duo[cat] || 100;
      else if (type === "group" && master.group) totalEstimated += master.group[cat] || 150;
      else if (type === "squad" && master.squad) totalEstimated += master.squad[cat] || 200;
      else totalEstimated += master.solo ? master.solo[cat] : 50;
    } else if (master.dance) {
      if (type === "solo" && master.solo) totalEstimated += master.solo[cat] || 99;
      else if (type === "group" && master.group) {
        const count = Number(item.groupCount) || 1;
        totalEstimated += (master.group[cat] || 50) * (count > 1 ? count : 1);
      } else {
        totalEstimated += master.solo ? master.solo[cat] : 99;
      }
    } else {
      totalEstimated += master[cat] || 50;
    }
  }

  return totalEstimated;
}

// ======================================
// Mongoose Schemas & Models
// ======================================
const selectedEventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    coordinators: { type: String, default: "" },
    fee: { type: Number, required: true, default: 0 },
    participantType: { type: String, default: "Solo" },
    groupCount: { type: Number, default: 1 },
    teamName: { type: String, default: "" },
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
    eventName: { type: String, required: true },
    events: [selectedEventSchema],
    amount: { type: Number, required: true, min: 0 },
    waivedAmount: { type: Number, default: 0, min: 0 }, // Admin editable waived value
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

const secretCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    label: { type: String, default: "Complimentary Pass" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Registration =
  mongoose.models.Registration || mongoose.model("Registration", registrationSchema);
const SecretCode =
  mongoose.models.SecretCode || mongoose.model("SecretCode", secretCodeSchema);

// ======================================
// Database Connection
// ======================================
mongoose.set("strictQuery", true);
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
connectDB();

// ======================================
// Razorpay Client
// ======================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret",
});

function generateTicketId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NYSM26-${randomNum}`;
}

// ======================================
// Query Builder with Range & E-Sports Support
// ======================================
function buildRegistrationQuery(query) {
  const conditions = [];

  // 1. Keyword search
  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    conditions.push({
      $or: [
        { ticketId: { $regex: s,$options: "i" } },
        { fullName: { $regex: s,$options: "i" } },
        { mobile: { $regex: s,$options: "i" } },
        { school: { $regex: s,$options: "i" } },
        { reference: { $regex: s,$options: "i" } },
        { teamSlot: { $regex: s,$options: "i" } },
        { "events.teamName": { $regex: s,$options: "i" } },
      ],
    });
  }

  // 2. Event ID Filter (matches modern & legacy)
  if (query.eventId && query.eventId.trim()) {
    const eId = query.eventId.trim();
    conditions.push({
      $or: [
        { eventId: eId },
        { "events.id": eId },
        { "events._id": eId },
      ],
    });
  }

  // 3. Dedicated Esports Game Filter
  if (query.esportsGame && query.esportsGame.trim()) {
    const gameId = query.esportsGame.trim();
    if (gameId === "esports") {
      conditions.push({
        "events.id": { $in: ["esports", "esports Free Fire", "esports PUBG"] },
      });
    } else {
      conditions.push({
        "events.id": gameId,
      });
    }
  }

  // 4. Esports Participation Mode
  if (query.esportsMode && query.esportsMode.trim()) {
    conditions.push({
      "events.participantType": query.esportsMode.trim(),
    });
  }

  // 5. Secret Code Filter
  if (query.secretCode && query.secretCode.trim()) {
    conditions.push({
      secretCode: { $regex: query.secretCode.trim(),$options: "i" },
    });
  }

  // 6. Reference Name Filter
  if (query.reference && query.reference.trim()) {
    conditions.push({
      reference: { $regex: query.reference.trim(),$options: "i" },
    });
  }

  // 7. Slot Range (Numeric and Regex fallback)
  const fromNum = query.slotFrom && !isNaN(Number(query.slotFrom)) ? Number(query.slotFrom) : null;
  const toNum = query.slotTo && !isNaN(Number(query.slotTo)) ? Number(query.slotTo) : null;

  if (fromNum !== null || toNum !== null) {
    const exprConditions = [
      { $ne: ["$teamSlot", ""] },
      { $ne: ["$teamSlot", null] },
    ];
    if (fromNum !== null) {
      exprConditions.push({ $gte: [{ $toInt: "$teamSlot" }, fromNum] });
    }
    if (toNum !== null) {
      exprConditions.push({ $lte: [{ $toInt: "$teamSlot" }, toNum] });
    }
    conditions.push({ $expr: {$and: exprConditions } });
  } else if (query.teamSlot && query.teamSlot.trim() !== "") {
    conditions.push({
      teamSlot: { $regex: query.teamSlot.trim(),$options: "i" },
    });
  }

  // 8. Payment Status
  if (query.status && query.status.trim()) {
    conditions.push({ status: query.status.trim() });
  }

  // 9. Category Filter
  if (query.category && query.category.trim()) {
    conditions.push({
      category: { $regex: `^${query.category.trim()}$`, $options: "i" },
    });
  }

  // 10. Date Range (createdAt)
  if (query.startDate || query.endDate) {
    const dateCond = {};
    if (query.startDate) {
      dateCond.$gte = new Date(`${query.startDate}T00:00:00.000Z`);
    }
    if (query.endDate) {
      const end = new Date(`${query.endDate}T23:59:59.999Z`);
      dateCond.$lte = end;
    }
    conditions.push({ createdAt: dateCond });
  }

  return conditions.length > 0 ? { $and: conditions } : {};
}

// ======================================
// App Middleware
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

const nightEventRegistrationSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    event: { type: String, enum: ["bhajan", "dj"], required: true },
    eventLabel: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    college: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    collegeIdNumber: { type: String, default: "", trim: true }, // Text ID for DJ Night
    hasMember2: { type: Boolean, default: false },
    member2: {
      name: { type: String, default: "", trim: true },
      mobile: { type: String, default: "", trim: true },
    },
    amount: { type: Number, required: true, min: 0 },
    secretCode: { type: String, default: "", trim: true, uppercase: true },
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

const NightEventRegistration =
  mongoose.models.NightEventRegistration ||
  mongoose.model("NightEventRegistration", nightEventRegistrationSchema);

// 1. GET: Render the DJ / Bhajan page
app.get("/NightEventRegistration", (req, res) => {
  res.render("djform");
});

// Helper for Night Event ticket IDs
function generateNightTicketId(event) {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const prefix = event === "dj" ? "DJ" : "BHJ";
  return `NYSM26-${prefix}-${randomNum}`;
}

// 2. POST: Verify Razorpay Payment and Save Night Event Registration
app.post("/api/dj/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      participantData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment tokens." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    const existing = await NightEventRegistration.findOne({ razorpayOrderId: razorpay_order_id });
    if (existing) {
      return res.json({
        status: existing.status,
        ticketId: existing.ticketId,
        name: existing.name,
        mobile: existing.mobile,
        college: existing.college,
        amount: existing.amount,
        event: existing.event,
        eventLabel: existing.eventLabel,
      });
    }

    const event = participantData.event === "dj" ? "dj" : "bhajan";
    const hasMember2 = Boolean(participantData.hasMember2);
    const amount = event === "dj" ? (hasMember2 ? 500 : 300) : 99;
    const ticketId = generateNightTicketId(event);
    const eventLabel = event === "dj" ? "DJ Night" : "Bhajan Clubbing";

    const reg = new NightEventRegistration({
      ticketId,
      event,
      eventLabel,
      name: String(participantData.name || "").trim(),
      mobile: String(participantData.mobile || "").trim(),
      email: String(participantData.email || "").trim(),
      college: String(participantData.college || "").trim(),
      course: String(participantData.course || "").trim(),
      collegeIdNumber: event === "dj" ? String(participantData.collegeIdNumber || "").trim() : "",
      hasMember2,
      member2: {
        name: hasMember2 ? String(participantData.name2 || "").trim() : "",
        mobile: hasMember2 ? String(participantData.mobile2 || "").trim() : "",
      },
      amount,
      status: "PAID",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    await reg.save();

    return res.json({
      status: "PAID",
      ticketId: reg.ticketId,
      name: reg.name,
      mobile: reg.mobile,
      college: reg.college,
      amount: reg.amount,
      event: reg.event,
      eventLabel: reg.eventLabel,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ error: "Payment verification failed: " + err.message });
  }
});

// 3. POST: Record Complimentary Entry for Night Event
app.post("/api/dj/record-complimentary", async (req, res) => {
  try {
    const {
      event,
      name,
      mobile,
      email,
      college,
      course,
      collegeIdNumber,
      hasMember2,
      name2,
      mobile2,
      secretCode,
    } = req.body;

    const validCode = await SecretCode.findOne({
      code: String(secretCode).trim().toUpperCase(),
      isActive: true,
    });

    if (!validCode) {
      return res.status(403).json({ error: "Invalid or inactive secret code." });
    }

    const selectedEvent = event === "dj" ? "dj" : "bhajan";
    const ticketId = generateNightTicketId(selectedEvent);
    const eventLabel = selectedEvent === "dj" ? "DJ Night" : "Bhajan Clubbing";

    const reg = new NightEventRegistration({
      ticketId,
      event: selectedEvent,
      eventLabel,
      name: String(name || "").trim(),
      mobile: String(mobile || "").trim(),
      email: String(email || "").trim(),
      college: String(college || "").trim(),
      course: String(course || "").trim(),
      collegeIdNumber: selectedEvent === "dj" ? String(collegeIdNumber || "").trim() : "",
      hasMember2: Boolean(hasMember2),
      member2: {
        name: hasMember2 ? String(name2 || "").trim() : "",
        mobile: hasMember2 ? String(mobile2 || "").trim() : "",
      },
      amount: 0,
      secretCode: validCode.code,
      status: "COMPLIMENTARY",
    });

    await reg.save();

    return res.json({
      status: "COMPLIMENTARY",
      ticketId: reg.ticketId,
      name: reg.name,
      mobile: reg.mobile,
      college: reg.college,
      amount: 0,
      event: reg.event,
      eventLabel: reg.eventLabel,
    });
  } catch (err) {
    console.error("Complimentary registration error:", err);
    return res.status(500).json({ error: "Complimentary registration failed: " + err.message });
  }
});

// NEW CODE 
const EVENT_MAP = {
  ev_1: "E-Sports Championship",
  ev_2: "E-Sports Free Fire",
  ev_3: "E-Sports PUBG",
  ev_4: "Rangotsav Drawing",
  ev_5: "Bharat Bodh Quiz",
  ev_6: "Tech Manthan Hackathon",
  ev_7: "Yuva-Vani Open Mic",
  ev_8: "Loknritiya Dance",
  ev_9: "Cultural Fashion Show",
  ev_10: "Beyond the Frame Photography",
  ev_11: "Kalamkar Essay",
  ev_12: "Dharmagatha",
};

const EVENTS_CONFIG = [
  { eventId: "ev_1", eventCode: "ESPORTS", name: "E-Sports Championship", prefix: "ESP" },
  { eventId: "ev_2", eventCode: "FREEFIRE", name: "E-Sports Free Fire Championship", prefix: "FF" },
  { eventId: "ev_3", eventCode: "PUBG", name: "E-Sports PUBG Championship", prefix: "BG" },
  { eventId: "ev_4", eventCode: "DRAWING", name: "Rangotsav : Drawing Competition", prefix: "DR" },
  { eventId: "ev_5", eventCode: "QUIZ", name: "Bharat Bodh : Quiz Competition", prefix: "Q" },
  { eventId: "ev_6", eventCode: "HACKATHON", name: "Tech Manthan Hackathon", prefix: "TM" },
  { eventId: "ev_7", eventCode: "OPENMIC", name: "Yuva-Vani : Open Mic", prefix: "OM" },
  { eventId: "ev_8", eventCode: "DANCE", name: "Loknritiya : Dance Competition", prefix: "D" },
  { eventId: "ev_9", eventCode: "FASHION", name: "Rang-e-Bharat : Cultural Fashion Show", prefix: "FS" },
  { eventId: "ev_10", eventCode: "PHOTO", name: "Beyond the Frame : Photography & Reel", prefix: "PH" },
  { eventId: "ev_11", eventCode: "ESSAY", name: "Kalamkar : Essay Competition", prefix: "KL" },
  { eventId: "ev_12", eventCode: "DHARMA", name: "Dharmagatha : Ramayan - Mahabharat Gyan", prefix: "DG" },
];

const EVENT_PREFIXES = {
  ev_1: "ESP",
  ESPORTS: "ESP",
  ev_2: "FF",
  FREEFIRE: "FF",
  ev_3: "BG",
  PUBG: "BG",
  ev_4: "DR",
  DRAWING: "DR",
  ev_5: "Q",
  QUIZ: "Q",
  ev_6: "TM",
  HACKATHON: "TM",
  ev_7: "OM",
  OPENMIC: "OM",
  ev_8: "D",
  DANCE: "D",
  ev_9: "FS",
  FASHION: "FS",
  ev_10: "PH",
  PHOTO: "PH",
  ev_11: "KL",
  ESSAY: "KL",
  ev_12: "DG",
  DHARMA: "DG",
};

// ----------------------------------------------------
// Authentication Middlewares
// ----------------------------------------------------
function requireAuth(req, res, next) {
  if (!req.session || !req.session.staff) {
    return res.redirect("/login?error=" + encodeURIComponent("Please log in first."));
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.staff || req.session.staff.role !== "ADMIN") {
    return res.redirect("/login?error=" + encodeURIComponent("Admin login required."));
  }
  next();
}

// ----------------------------------------------------
// Helper: Populate EventTracking from Registrations
// ----------------------------------------------------
async function ensureEventTrackingPopulated() {
  const registrations = await Registration.find({
    status: { $in: ["PAID", "COMPLIMENTARY", "PENDING"] },
  }).lean();

  const operations = [];

  for (const reg of registrations) {
    if (Array.isArray(reg.events) && reg.events.length > 0) {
      for (const ev of reg.events) {
        operations.push({
          updateOne: {
            filter: { registrationId: reg._id, eventId: ev.id },
            update: {
              $setOnInsert: {
                ticketId: reg.ticketId,
                eventName: ev.name,
                category: reg.category ? reg.category.toUpperCase() : "OPEN",
                participantType: ev.participantType || "Solo",
                teamName: ev.teamName || reg.teamSlot || "",
                followupStatus: "PENDING",
                entryStatus: "PENDING",
                stageStatus: "NOT_PRESENT",
              },
            },
            upsert: true,
          },
        });
      }
    }
  }

  if (operations.length > 0) {
    await EventTracking.bulkWrite(operations, { ordered: false });
  }
}
app.get("/login", (req, res) => {
  if (req.session && req.session.staff) {
    return res.redirect(req.session.staff.role === "ADMIN" ? "/dashboard" : "/coordinator");
  }
  res.render("login", { error: req.query.error || null });
});

app.post("/login", async (req, res) => {
  try {
    const { email, secretCode } = req.body;

    if (!email || !secretCode) {
      return res.redirect("/login?error=" + encodeURIComponent("Both Email and Secret Code are required."));
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = secretCode.trim().toUpperCase();

    const staff = await Staff.findOne({
      email: cleanEmail,
      secretCode: cleanCode,
      isActive: true,
    });

    if (!staff) {
      return res.redirect("/login?error=" + encodeURIComponent("Invalid Email or Secret Code."));
    }

    staff.lastLoginAt = new Date();
    await staff.save();

    req.session.staff = {
      id: staff._id,
      email: staff.email,
      role: staff.role,
      assignedEventId: staff.assignedEventId,
    };

    if (staff.role === "ADMIN") {
      return res.redirect("/dashboard");
    } else {
      return res.redirect("/coordinator");
    }
  } catch (err) {
    return res.redirect("/login?error=" + encodeURIComponent("Server error during login: " + err.message));
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ----------------------------------------------------
// Admin Dashboard
// ----------------------------------------------------
app.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    await ensureEventTrackingPopulated();

    const [registrations, trackings, callLogsCount, waLogsCount] = await Promise.all([
      Registration.find({}),
      EventTracking.find({}),
      ActivityLog ? ActivityLog.countDocuments({ activityType: "CALL" }) : Promise.resolve(0),
      ActivityLog ? ActivityLog.countDocuments({ activityType: "WHATSAPP" }) : Promise.resolve(0),
    ]);

    const totalReg = registrations.length;
    const presentCount = trackings.filter((t) => t.entryStatus === "PRESENT").length;
    const tokensIssued = trackings.filter((t) => t.tokenNumber && t.tokenNumber.trim() !== "").length;
    const performancesDone = trackings.filter((t) => t.stageStatus === "PERFORMANCE_DONE").length;
    const presentPct = trackings.length > 0 ? Math.round((presentCount / trackings.length) * 100) : 0;

    const assignedCount = trackings.filter((t) => t.assignedStaff && t.assignedStaff.staffId).length;
    const contactedCount = trackings.filter((t) => t.followupStatus !== "PENDING").length;
    const pendingFollowups = trackings.filter((t) => t.followupStatus === "PENDING").length;
    const followupCoveragePct = assignedCount > 0 ? Math.round((contactedCount / assignedCount) * 100) : 0;

    const juniorCount = registrations.filter((r) => (r.category || "").toUpperCase() === "JUNIOR").length;
    const seniorCount = registrations.filter((r) => (r.category || "").toUpperCase() === "SENIOR").length;
    const paidCount = registrations.filter((r) => (r.amount || 0) > 0 && r.status === "PAID").length;

    const eventStats = EVENTS_CONFIG.map((ev) => {
      const evTrackings = trackings.filter((t) => t.eventId === ev.eventId || t.eventId === ev.eventCode);
      return {
        ...ev,
        total: evTrackings.length,
        junior: evTrackings.filter((t) => (t.category || "").toUpperCase() === "JUNIOR").length,
        senior: evTrackings.filter((t) => (t.category || "").toUpperCase() === "SENIOR").length,
        tokens: evTrackings.filter((t) => t.tokenNumber && t.tokenNumber.trim() !== "").length,
        present: evTrackings.filter((t) => t.entryStatus === "PRESENT").length,
        done: evTrackings.filter((t) => t.stageStatus === "PERFORMANCE_DONE").length,
      };
    });

    res.render("Admindashboard", {
      staff: req.session.staff,
      kpis: {
        totalReg,
        presentCount,
        presentPct,
        tokensIssued,
        performancesDone,
        callsMade: callLogsCount,
        whatsappSent: waLogsCount,
        followupCoveragePct,
        assignedCount,
        contactedCount,
        pendingFollowups,
        juniorCount,
        seniorCount,
        paidCount,
        pendingCorrections: 0,
      },
      eventStats,
    });
  } catch (err) {
    res.status(500).send("Dashboard Error: " + err.message);
  }
});

// ----------------------------------------------------
// Contact Distribution Engine
// GET: Distribution Dashboard
app.get("/distribution", requireAdmin, async (req, res) => {
  try {
    if (typeof ensureEventTrackingPopulated === "function") {
      await ensureEventTrackingPopulated();
    }

    const [staffList, trackings] = await Promise.all([
      Staff.find({ isActive: true }).sort({ email: 1 }).lean(),
      EventTracking.find({}, "eventId eventName category assignedStaff followupStatus isAssigned").lean(),
    ]);

    // Build the dynamic events list directly from existing tracking documents
    const eventMap = new Map();
    trackings.forEach((t) => {
      if (t.eventId && !eventMap.has(t.eventId)) {
        eventMap.set(t.eventId, {
          eventId: t.eventId,
          name: t.eventName || t.eventId,
        });
      }
    });
    const dynamicEvents = Array.from(eventMap.values());

    // Workload mapping
    const staffWorkloadMap = {};
    for (const s of staffList) {
      const assigned = trackings.filter(
        (t) => t.assignedStaff && String(t.assignedStaff.staffId) === String(s._id)
      );
      const contacted = assigned.filter((t) => t.followupStatus && t.followupStatus !== "PENDING").length;

      staffWorkloadMap[String(s._id)] = {
        count: assigned.length,
        contacted,
        remainingCapacity: Math.max(0, 40 - assigned.length),
      };
    }

    res.render("distribution", {
      staff: req.session.staff,
      events: dynamicEvents, // Passes real database event IDs
      staffList,
      trackings,
      staffWorkloadMap,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Distribution Error: " + err.message);
  }
});

// POST: Apply Distribution
app.post("/distribution/apply", requireAdmin, async (req, res) => {
  try {
    const { mode, eventId, categoryFilter, maxLimit, staffId, countToAssign } = req.body;
    const limit = Math.min(Math.max(parseInt(maxLimit, 10) || 40, 1), 40);

    // Flexible unassigned criteria
    const baseQuery = {
      $or: [
        { isAssigned: false },
        { "assignedStaff.staffId": null },
        { "assignedStaff.staffId": { $exists: false } },
        { "assignedStaff.targetStatus": "UNASSIGNED" },
      ],
    };

    // Match eventId or eventName flexibly
    if (eventId && eventId !== "ALL" && eventId.trim() !== "") {
      const trimmedEvent = eventId.trim();
      baseQuery.$and = [
        {
          $or: [
            { eventId: new RegExp(`^${trimmedEvent}$`, "i") },
            { eventName: new RegExp(`^${trimmedEvent}$`, "i") },
          ],
        },
      ];
    }

    if (categoryFilter && categoryFilter !== "ALL" && categoryFilter.trim() !== "") {
      baseQuery.category = new RegExp(`^${categoryFilter.trim()}$`, "i");
    }

    const availableMatches = await EventTracking.countDocuments(baseQuery);
    if (availableMatches === 0) {
      return res.redirect(
        "/distribution?error=" +
          encodeURIComponent(`No unassigned contacts found for selection "${eventId}".`)
      );
    }

    // -----------------------------------------------------------
    // MODE 1: DIRECT ALLOCATION
    // -----------------------------------------------------------
    if (mode === "DIRECT") {
      if (!staffId || !mongoose.Types.ObjectId.isValid(staffId.trim())) {
        return res.redirect("/distribution?error=" + encodeURIComponent("Please select a valid staff member."));
      }

      const member = await Staff.findById(staffId.trim());
      if (!member) {
        return res.redirect("/distribution?error=" + encodeURIComponent("Staff member not found."));
      }

      const currentLoad = await EventTracking.countDocuments({ "assignedStaff.staffId": member._id });
      const capacityLeft = Math.max(0, limit - currentLoad);

      if (capacityLeft <= 0) {
        return res.redirect(
          "/distribution?error=" +
            encodeURIComponent(`${member.email} has reached the maximum workload limit (${limit}).`)
        );
      }

      const requested = parseInt(countToAssign, 10);
      const assignQty = !isNaN(requested) && requested > 0 ? Math.min(requested, capacityLeft) : capacityLeft;

      const unassignedList = await EventTracking.find(baseQuery).limit(assignQty).select("_id");
      const ids = unassignedList.map((doc) => doc._id);

      await EventTracking.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            isAssigned: true,
            "assignedStaff.staffId": member._id,
            "assignedStaff.email": member.email,
            "assignedStaff.secretCode": member.secretCode,
            "assignedStaff.targetStatus": "IN_PROGRESS",
            "assignedStaff.assignedBy": req.session.staff?.email || "Admin",
            "assignedStaff.assignedAt": new Date(),
          },
        }
      );

      return res.redirect(
        "/distribution?success=" + encodeURIComponent(`Assigned ${ids.length} contacts directly to ${member.email}.`)
      );
    }

    // -----------------------------------------------------------
    // MODE 2: AUTO EVEN DISTRIBUTION
    // -----------------------------------------------------------
    const staffFilter = { isActive: true };
    if (eventId && eventId !== "ALL" && eventId.trim() !== "") {
      staffFilter.$or = [
        { assignedEventId: new RegExp(`^${eventId.trim()}$`, "i") },
        { role: "ADMIN" },
      ];
    }

    const eligibleStaff = await Staff.find(staffFilter);
    if (eligibleStaff.length === 0) {
      return res.redirect(
        "/distribution?error=" +
          encodeURIComponent("No active staff coordinators found assigned to this event.")
      );
    }

    const unassignedPool = await EventTracking.find(baseQuery).select("_id");
    const staffLoads = {};
    for (const s of eligibleStaff) {
      staffLoads[s._id.toString()] = await EventTracking.countDocuments({ "assignedStaff.staffId": s._id });
    }

    const bulkOps = [];
    let poolIndex = 0;
    let distributed = true;

    while (poolIndex < unassignedPool.length && distributed) {
      distributed = false;
      eligibleStaff.sort((a, b) => staffLoads[a._id.toString()] - staffLoads[b._id.toString()]);

      for (const s of eligibleStaff) {
        if (poolIndex >= unassignedPool.length) break;
        const sId = s._id.toString();

        if (staffLoads[sId] < limit) {
          bulkOps.push({
            updateOne: {
              filter: { _id: unassignedPool[poolIndex]._id },
              update: {
                $set: {
                  isAssigned: true,
                  "assignedStaff.staffId": s._id,
                  "assignedStaff.email": s.email,
                  "assignedStaff.secretCode": s.secretCode,
                  "assignedStaff.targetStatus": "IN_PROGRESS",
                  "assignedStaff.assignedBy": req.session.staff?.email || "Admin",
                  "assignedStaff.assignedAt": new Date(),
                },
              },
            },
          });
          staffLoads[sId]++;
          poolIndex++;
          distributed = true;
        }
      }
    }

    if (bulkOps.length > 0) {
      await EventTracking.bulkWrite(bulkOps, { ordered: false });
    }

    return res.redirect(
      "/distribution?success=" +
        encodeURIComponent(`Distributed ${bulkOps.length} contacts evenly among staff!`)
    );
  } catch (err) {
    return res.redirect("/distribution?error=" + encodeURIComponent(err.message));
  }
});
// ----------------------------------------------------
// Master Desk / Corrections Engine (Fixed & Enhanced)
// ----------------------------------------------------
app.get("/corrections", requireAdmin, async (req, res) => {
  try {
    await ensureEventTrackingPopulated();

    const { search, eventId, category, entryStatus, followupStatus, staffId } = req.query;

    const regFilter = {};
    if (search && search.trim() !== "") {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      regFilter.$or = [
        { ticketId: regex },
        { fullName: regex },
        { mobile: regex },
        { teamSlot: regex },
        { school: regex },
      ];
    }

    if (category && category !== "ALL") {
      regFilter.category = category.toUpperCase();
    }

    const [allRegistrations, allTrackings, staffList] = await Promise.all([
      Registration.find(regFilter).sort({ createdAt: -1 }).lean(),
      EventTracking.find({}).lean(),
      Staff.find({ isActive: true }).sort({ email: 1 }).lean(),
    ]);

    // Group trackings by registrationId
    const trackingByRegId = {};
    allTrackings.forEach((t) => {
      const regId = String(t.registrationId);
      if (!trackingByRegId[regId]) trackingByRegId[regId] = [];
      trackingByRegId[regId].push(t);
    });

    // Merge registration rows with tracking and staff details
    let masterData = allRegistrations.map((reg) => {
      const regId = String(reg._id);
      const events = trackingByRegId[regId] || [];

      // Check if participant is marked present in at least one event
      const isPresent = events.some((ev) => ev.entryStatus === "PRESENT");
      
      // Determine overall follow-up status
      const assignedStaffEmails = Array.from(
        new Set(events.filter((e) => e.assignedStaff?.email).map((e) => e.assignedStaff.email))
      );
      const assignedStaffIds = Array.from(
        new Set(events.filter((e) => e.assignedStaff?.staffId).map((e) => String(e.assignedStaff.staffId)))
      );

      const isContacted = events.some((e) => e.followupStatus && e.followupStatus !== "PENDING");

      return {
        ...reg,
        events,
        isPresent,
        isContacted,
        assignedStaffEmails,
        assignedStaffIds,
      };
    });

    // Apply tracking-level secondary filters
    if (eventId && eventId !== "ALL") {
      masterData = masterData.filter((r) => r.events.some((ev) => ev.eventId === eventId));
    }
    if (entryStatus && entryStatus !== "ALL") {
      if (entryStatus === "PRESENT") {
        masterData = masterData.filter((r) => r.isPresent);
      } else if (entryStatus === "PENDING") {
        masterData = masterData.filter((r) => !r.isPresent);
      }
    }
    if (followupStatus && followupStatus !== "ALL") {
      if (followupStatus === "CONTACTED") {
        masterData = masterData.filter((r) => r.isContacted);
      } else if (followupStatus === "PENDING") {
        masterData = masterData.filter((r) => !r.isContacted);
      }
    }
    if (staffId && staffId !== "ALL") {
      masterData = masterData.filter((r) => r.assignedStaffIds.includes(String(staffId)));
    }

    res.render("corrections", {
      staff: req.session.staff,
      tickets: masterData,
      events: EVENTS_CONFIG,
      staffList,
      filters: {
        search: search || "",
        eventId: eventId || "ALL",
        category: category || "ALL",
        entryStatus: entryStatus || "ALL",
        followupStatus: followupStatus || "ALL",
        staffId: staffId || "ALL",
      },
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Master Desk Error: " + err.message);
  }
});

// Update Ticket / Participant Details
app.post("/corrections/update", requireAdmin, async (req, res) => {
  try {
    const { registrationId, fullName, mobile, school, classCourse, category, teamSlot, status, amount } = req.body;

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.redirect("/corrections?error=" + encodeURIComponent("Invalid Ticket Record ID."));
    }

    const reg = await Registration.findById(registrationId);
    if (!reg) {
      return res.redirect("/corrections?error=" + encodeURIComponent("Ticket not found."));
    }

    reg.fullName = fullName ? fullName.trim() : reg.fullName;
    reg.mobile = mobile ? mobile.trim() : reg.mobile;
    reg.school = school ? school.trim() : reg.school;
    reg.classCourse = classCourse ? classCourse.trim() : reg.classCourse;
    reg.category = category ? category.trim().toUpperCase() : reg.category;
    reg.teamSlot = teamSlot ? teamSlot.trim() : reg.teamSlot;
    if (status) reg.status = status.toUpperCase();
    if (amount !== undefined && amount !== "") reg.amount = Number(amount);

    await reg.save();

    // Propagate changes to EventTracking records
    await EventTracking.updateMany(
      { registrationId: reg._id },
      {
        $set: {
          category: reg.category,
          teamName: reg.teamSlot || "",
        },
      }
    );

    return res.redirect("/corrections?success=" + encodeURIComponent(`Ticket #${reg.ticketId} updated successfully!`));
  } catch (err) {
    return res.redirect("/corrections?error=" + encodeURIComponent(err.message));
  }
});

// Delete Ticket & Associated Tracking
app.post("/corrections/delete", requireAdmin, async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.redirect("/corrections?error=" + encodeURIComponent("Invalid Registration ID."));
    }

    const reg = await Registration.findByIdAndDelete(registrationId);
    if (!reg) {
      return res.redirect("/corrections?error=" + encodeURIComponent("Registration not found or already deleted."));
    }

    // Clean up all related event trackings
    await EventTracking.deleteMany({ registrationId });

    return res.redirect(
      "/corrections?success=" + encodeURIComponent(`Ticket #${reg.ticketId} and associated records deleted permanently.`)
    );
  } catch (err) {
    return res.redirect("/corrections?error=" + encodeURIComponent(err.message));
  }
});

// ----------------------------------------------------
// Event Day Desk Routes (Manual Token Entry Enabled)
// ----------------------------------------------------
app.get("/desk", requireAuth, async (req, res) => {
  res.render("desk", {
    staff: req.session.staff,
    operatorTitle: req.session.staff.role === "ADMIN" ? "Super Admin" : "Desk Operator",
  });
});

app.get("/api/desk/search", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.json({ success: true, participant: null });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const registration = await Registration.findOne({
      $or: [
        { mobile: regex },
        { ticketId: regex },
        { teamSlot: regex },
        { fullName: regex },
      ],
    }).lean();

    if (!registration) {
      return res.json({ success: true, participant: null });
    }

    if (Array.isArray(registration.events) && registration.events.length > 0) {
      for (const ev of registration.events) {
        await EventTracking.updateOne(
          { registrationId: registration._id, eventId: ev.id },
          {
            $setOnInsert: {
              ticketId: registration.ticketId,
              eventName: ev.name,
              category: registration.category ? registration.category.toUpperCase() : "OPEN",
              participantType: ev.participantType || "Solo",
              teamName: ev.teamName || registration.teamSlot || "",
              followupStatus: "PENDING",
              entryStatus: "PENDING",
              stageStatus: "NOT_PRESENT",
            },
          },
          { upsert: true }
        );
      }
    }

    const trackings = await EventTracking.find({
      registrationId: registration._id,
    }).lean();

    return res.json({
      success: true,
      participant: {
        id: registration._id,
        fullName: registration.fullName,
        mobile: registration.mobile,
        school: registration.school,
        classCourse: registration.classCourse,
        category: registration.category,
        teamSlot: registration.teamSlot || "N/A",
        ticketId: registration.ticketId,
        amount: registration.amount,
        status: registration.status,
      },
      events: trackings,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/desk/mark-present", requireAuth, async (req, res) => {
  try {
    const { trackingId, manualToken } = req.body;
    const operatorName = req.session?.staff?.email || "Volunteer Desk #1";

    if (!trackingId || !mongoose.Types.ObjectId.isValid(trackingId)) {
      return res.status(400).json({ success: false, message: "Invalid tracking ID provided." });
    }

    const tracking = await EventTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({ success: false, message: "Tracking record not found." });
    }

    const tokenVal = (manualToken || "").trim().toUpperCase();
    if (!tokenVal) {
      return res.status(400).json({ success: false, message: "Token number is required to mark entry." });
    }

    tracking.tokenNumber = tokenVal;
    tracking.entryStatus = "PRESENT";
    tracking.entryMarkedAt = new Date();
    tracking.entryMarkedBy = operatorName;

    if (tracking.stageStatus === "NOT_PRESENT") {
      tracking.stageStatus = "WAITING_BACKSTAGE";
    }

    await tracking.save();

    if (ActivityLog) {
      try {
        await ActivityLog.create({
          trackingId: tracking._id,
          registrationId: tracking.registrationId,
          ticketId: tracking.ticketId,
          eventId: tracking.eventId,
          performedBy: {
            memberId: req.session?.staff?.id ? String(req.session.staff.id) : "DESK",
            name: operatorName,
            role: req.session?.staff?.role || "DESK",
          },
          activityType: "DESK_CHECKIN",
          remarks: `Manual Token ${tracking.tokenNumber} assigned and marked present at desk`,
        });
      } catch (logErr) {
        console.warn("ActivityLog write skipped:", logErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Check-in successful",
      tokenNumber: tracking.tokenNumber,
      tracking,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Now come to staff panales


// ----------------------------------------------------
// Event Coordinator Dashboard Routes
// ----------------------------------------------------
// GET /coordinator - Dashboard render with complete filters & metrics
app.get("/coordinator", requireAuth, async (req, res) => {
  try {
    await ensureEventTrackingPopulated();

    const staffMember = req.session.staff;
    const { category, stageStatus, entryStatus, followupStatus, search } = req.query;

    // Filter trackings assigned to this coordinator or their assigned event
    let trackingFilter = {};
    if (staffMember.role !== "ADMIN") {
      trackingFilter.$or = [
        { "assignedStaff.staffId": staffMember.id },
        { eventId: staffMember.assignedEventId },
      ];
    } else if (staffMember.assignedEventId) {
      trackingFilter.eventId = staffMember.assignedEventId;
    }

    if (category && category !== "ALL") {
      trackingFilter.category = category.toUpperCase();
    }
    if (stageStatus && stageStatus !== "ALL") {
      trackingFilter.stageStatus = stageStatus;
    }
    if (entryStatus && entryStatus !== "ALL") {
      trackingFilter.entryStatus = entryStatus;
    }
    if (followupStatus && followupStatus !== "ALL") {
      trackingFilter.followupStatus = followupStatus;
    }

    let trackings = await EventTracking.find(trackingFilter).lean();

    // Fetch related registration records to display complete participant demographic details
    const regIds = trackings.map((t) => t.registrationId).filter(Boolean);
    const registrations = await Registration.find({ _id: { $in: regIds } }).lean();
    const regMap = {};
    registrations.forEach((r) => {
      regMap[String(r._id)] = r;
    });

    // Merge participant data with tracking record
    let participantCards = trackings.map((t) => {
      const reg = regMap[String(t.registrationId)] || {};
      return {
        trackingId: t._id,
        registrationId: t.registrationId,
        eventId: t.eventId,
        eventName: t.eventName,
        ticketId: t.ticketId || reg.ticketId,
        fullName: reg.fullName || "Participant",
        mobile: reg.mobile || "N/A",
        school: reg.school || "School/College Not Specified",
        classCourse: reg.classCourse || "N/A",
        category: t.category || reg.category || "OPEN",
        teamSlot: t.teamName || reg.teamSlot || "N/A",
        tokenNumber: t.tokenNumber || "",
        entryStatus: t.entryStatus || "PENDING",
        stageStatus: t.stageStatus || "NOT_PRESENT",
        followupStatus: t.followupStatus || "PENDING",
        totalCalls: t.totalCalls || 0,
        coordinatorNotes: t.coordinatorNotes || "",
        lastRemarkUpdatedBy: t.lastRemarkUpdatedBy || null,
        assignedStaffEmail: t.assignedStaff?.email || "Unassigned",
      };
    });

    // Handle free-text search (Name, Mobile, Ticket, Token, Slot)
    if (search && search.trim() !== "") {
      const query = search.trim().toLowerCase();
      participantCards = participantCards.filter((p) => {
        return (
          p.fullName.toLowerCase().includes(query) ||
          p.mobile.includes(query) ||
          (p.ticketId && p.ticketId.toLowerCase().includes(query)) ||
          (p.tokenNumber && p.tokenNumber.toLowerCase().includes(query)) ||
          (p.teamSlot && p.teamSlot.toLowerCase().includes(query))
        );
      });
    }

    // Stage metrics
    const totalAssigned = participantCards.length;
    const presentAtDesk = participantCards.filter((p) => p.entryStatus === "PRESENT").length;
    const backstageCount = participantCards.filter((p) => p.stageStatus === "WAITING_BACKSTAGE").length;
    const onStageCount = participantCards.filter((p) => p.stageStatus === "ON_STAGE").length;
    const completedCount = participantCards.filter((p) => p.stageStatus === "PERFORMANCE_DONE").length;

    // Follow-up & remark metrics
    const willComeCount = participantCards.filter((p) => p.followupStatus === "WILL_COME").length;
    const willNotComeCount = participantCards.filter((p) => p.followupStatus === "WILL_NOT_COME").length;
    const notPickedCount = participantCards.filter((p) => p.followupStatus === "CALL_NOT_PICKED").length;

    // Resolve assigned event title
    const eventName = staffMember.assignedEventId
      ? (typeof EVENT_MAP !== "undefined" && EVENT_MAP[staffMember.assignedEventId]) || staffMember.assignedEventId
      : "All Assigned Events";

    res.render("coordinator", {
      staff: staffMember,
      eventName,
      participantCards,
      stats: {
        totalAssigned,
        presentAtDesk,
        backstageCount,
        onStageCount,
        completedCount,
        willComeCount,
        willNotComeCount,
        notPickedCount,
      },
      filters: {
        search: search || "",
        category: category || "ALL",
        stageStatus: stageStatus || "ALL",
        entryStatus: entryStatus || "ALL",
        followupStatus: followupStatus || "ALL",
      },
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Coordinator Dashboard Error: " + err.message);
  }
});

// POST /api/coordinator/update-followup - Handles Call/WhatsApp updates and Remarks
app.post("/api/coordinator/update-followup", requireAuth, async (req, res) => {
  try {
    const { trackingId, followupStatus, actionType, coordinatorNotes } = req.body;
    const staffMember = req.session?.staff;

    if (!trackingId || !mongoose.Types.ObjectId.isValid(trackingId)) {
      return res.status(400).json({ success: false, message: "Invalid tracking ID." });
    }

    const validStatuses = [
      "WILL_COME",
      "WILL_NOT_COME",
      "CALL_NOT_PICKED",
      "CONTACTED",
      "CONFIRMED",
      "INTERESTED",
      "CALL_BACK",
      "NOT_INTERESTED",
      "NO_RESPONSE",
      "WRONG_NUMBER",
      "PENDING",
    ];

    if (followupStatus && !validStatuses.includes(followupStatus)) {
      return res.status(400).json({ success: false, message: "Invalid follow-up status." });
    }

    const updateFields = {
      lastContactedAt: new Date(),
    };

    if (followupStatus) {
      updateFields.followupStatus = followupStatus;
      updateFields.lastRemarkUpdatedBy = {
        memberId: String(staffMember?.id || "COORDINATOR"),
        email: staffMember?.email || "Unknown Coordinator",
        updatedAt: new Date(),
      };
    }

    if (coordinatorNotes !== undefined) {
      updateFields.coordinatorNotes = coordinatorNotes;
    }

    const incFields = {};
    if (actionType === "CALLED" || followupStatus === "CALL_NOT_PICKED") {
      incFields.totalCalls = 1;
    }
    if (actionType === "WHATSAPP") {
      incFields.totalWhatsApp = 1;
    }

    // returnDocument: 'after' fixes the Mongoose deprecation warning
    const tracking = await EventTracking.findByIdAndUpdate(
      trackingId,
      {
        $set: updateFields,
        ...(Object.keys(incFields).length > 0 ? { $inc: incFields } : {}),
      },
      { returnDocument: "after" }
    );

    if (!tracking) {
      return res.status(404).json({ success: false, message: "Tracking record not found." });
    }

    // Activity Log handling
    if (typeof ActivityLog !== "undefined" && ActivityLog) {
      try {
        const allowedTypes = ActivityLog.schema?.path("activityType")?.enumValues || [];
        const chosenActivityType = allowedTypes.includes("COORDINATOR_REMARK")
          ? "COORDINATOR_REMARK"
          : (allowedTypes[0] || "STAGE_STATUS_CHANGE");

        await ActivityLog.create({
          trackingId: tracking._id,
          registrationId: tracking.registrationId,
          ticketId: tracking.ticketId,
          eventId: tracking.eventId,
          performedBy: {
            memberId: String(staffMember?.id || "COORDINATOR"),
            name: staffMember?.email || "Event Coordinator",
            role: staffMember?.role || "COORDINATOR",
          },
          activityType: chosenActivityType,
          remarks: `Follow-up updated to: ${followupStatus || actionType || "CONTACTED"}`,
        });
      } catch (logErr) {
        console.warn("ActivityLog write skipped:", logErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Remark updated successfully.",
      followupStatus: tracking.followupStatus,
      totalCalls: tracking.totalCalls,
      totalWhatsApp: tracking.totalWhatsApp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/coordinator/update-stage - Stage queue flow
app.post("/api/coordinator/update-stage", requireAuth, async (req, res) => {
  try {
    const { trackingId, stageStatus, remarks } = req.body;
    const staffMember = req.session?.staff;

    if (!trackingId || !mongoose.Types.ObjectId.isValid(trackingId)) {
      return res.status(400).json({ success: false, message: "Invalid tracking ID." });
    }

    const validStatuses = ["NOT_PRESENT", "WAITING_BACKSTAGE", "ON_STAGE", "PERFORMANCE_DONE", "DISQUALIFIED"];
    if (!validStatuses.includes(stageStatus)) {
      return res.status(400).json({ success: false, message: "Invalid stage status." });
    }

    const tracking = await EventTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({ success: false, message: "Tracking record not found." });
    }

    tracking.stageStatus = stageStatus;
    if (stageStatus === "ON_STAGE" && !tracking.performanceStartedAt) {
      tracking.performanceStartedAt = new Date();
    }
    if (stageStatus === "PERFORMANCE_DONE") {
      tracking.performanceDoneAt = new Date();
    }
    await tracking.save();

    if (typeof ActivityLog !== "undefined" && ActivityLog) {
      try {
        const allowedTypes = ActivityLog.schema?.path("activityType")?.enumValues || [];
        const chosenActivityType = allowedTypes.includes("STAGE_STATUS_CHANGE")
          ? "STAGE_STATUS_CHANGE"
          : (allowedTypes[0] || "STAGE_STATUS_CHANGE");

        await ActivityLog.create({
          trackingId: tracking._id,
          registrationId: tracking.registrationId,
          ticketId: tracking.ticketId,
          eventId: tracking.eventId,
          performedBy: {
            memberId: String(staffMember?.id || "COORDINATOR"),
            name: staffMember?.email || "Event Coordinator",
            role: staffMember?.role || "COORDINATOR",
          },
          activityType: chosenActivityType,
          remarks: remarks || `Participant moved to ${stageStatus}`,
        });
      } catch (logErr) {
        console.warn("ActivityLog write skipped:", logErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Stage status updated to ${stageStatus}`,
      stageStatus: tracking.stageStatus,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/rules',requireAuth , async (req, res) => {
  res.render('rules', {
    pageTitle: 'Navchetna Yuva Mahotsav - Event Rules & Schedule'
  });
});


// ======================================
// 404 Handler & Server Start
// ======================================
app.use((req, res) => res.status(404).render("404"));

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
