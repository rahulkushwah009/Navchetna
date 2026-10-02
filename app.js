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
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// ======================================
// Master Events Data
// ======================================
const Staff = require("./models/Staff");
const EventTracking = require("./models/EventTracking");
const ActivityLog = require("./models/ActivityLog");

const EVENTS = [
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

// Unified events definition with all lookup keys, slug aliases & keywords
const EVENTS_CONFIG = [
  { 
    key: "esports", 
    eventId: "ev_1", 
    eventCode: "ESPORTS", 
    name: "E-Sports Championship", 
    prefix: "ESP",
    aliases: ["esports", "e-sports", "esport"] 
  },
  { 
    key: "esports Free Fire", 
    eventId: "ev_2", 
    eventCode: "FREEFIRE", 
    name: "E-Sports Free Fire Championship", 
    prefix: "FF",
    aliases: ["freefire", "free fire", "ff"] 
  },
  { 
    key: "esports PUBG", 
    eventId: "ev_3", 
    eventCode: "PUBG", 
    name: "E-Sports PUBG Championship", 
    prefix: "BG",
    aliases: ["pubg", "bgmi"] 
  },
  { 
    key: "rangotsav", 
    eventId: "ev_4", 
    eventCode: "DRAWING", 
    name: "Rangotsav : Drawing Competition", 
    prefix: "DR",
    aliases: ["rangotsav", "drawing", "painting"] 
  },
  { 
    key: "bharatbodh", 
    eventId: "ev_5", 
    eventCode: "QUIZ", 
    name: "Bharat Bodh : Quiz Competition", 
    prefix: "Q",
    aliases: ["bharatbodh", "bharat bodh", "quiz"] 
  },
  { 
    key: "techmanthan", 
    eventId: "ev_6", 
    eventCode: "HACKATHON", 
    name: "Tech Manthan Hackathon", 
    prefix: "TM",
    aliases: ["techmanthan", "tech manthan", "hackathon"] 
  },
  { 
    key: "yuvavani", 
    eventId: "ev_7", 
    eventCode: "OPENMIC", 
    name: "Yuva-Vani : Open Mic", 
    prefix: "OM",
    aliases: ["yuvavani", "yuva-vani", "open mic", "openmic"] 
  },
  { 
    key: "loknritya", 
    eventId: "ev_8", 
    eventCode: "DANCE", 
    name: "Loknritya : Dance Competition", 
    prefix: "D",
    aliases: ["loknritya", "loknritiya", "dance"] 
  },
  { 
    key: "rangebharat", 
    eventId: "ev_9", 
    eventCode: "FASHION", 
    name: "Rang-e-Bharat : Cultural Fashion Show", 
    prefix: "FS",
    aliases: ["rangebharat", "rang-e-bharat", "fashion", "cultural fashion"] 
  },
  { 
    key: "beyondframe", 
    eventId: "ev_10", 
    eventCode: "PHOTO", 
    name: "Beyond the Frame : Photography & Reel", 
    prefix: "PH",
    aliases: ["beyondframe", "beyond the frame", "photography", "reel"] 
  },
  { 
    key: "kalamkar", 
    eventId: "ev_11", 
    eventCode: "ESSAY", 
    name: "Kalamkar : Essay Competition", 
    prefix: "KL",
    aliases: ["kalamkar", "essay"] 
  },
  { 
    key: "dharmagatha", 
    eventId: "ev_12", 
    eventCode: "DHARMA", 
    name: "Dharmagatha : Ramayan - Mahabharat Gyan", 
    prefix: "DG",
    aliases: ["dharmagatha", "ramayan", "mahabharat"] 
  },
];

// Helper: Calculate Original Event Value
function calculateRegistrationOriginalAmount(reg, masterEvents) {
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
    waivedAmount: { type: Number, default: 0, min: 0 },
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

// Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret",
});

function generateTicketId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NYSM26-${randomNum}`;
}

// App Middleware
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(methodOverride("_method"));

app.get("/", (req, res) => res.render("homePage"));
app.get("/register", (req, res) => res.render("register"));
app.get("/success", (req, res) => res.render("success"));

// ======================================
// Public API Endpoints
// ======================================
app.post("/api/validate-secret-code", async (req, res) => {
  try {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ valid: false, error: "Code required." });

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

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const amountInPaise = Math.round(Number(amount) * 100);
    if (amountInPaise <= 0) {
      return res.status(400).json({ error: "Invalid registration amount." });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create order: " + err.message });
  }
});

app.post("/api/verify-payment", async (req, res) => {
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

    const existing = await Registration.findOne({ razorpayOrderId: razorpay_order_id });
    if (existing) return res.json({ status: "PAID", ticketId: existing.ticketId });

    const rawEvents = Array.isArray(participantData.events) ? participantData.events : [];
    const events = rawEvents.map((e) => ({
      id: String(e.id || ""),
      name: String(e.name || ""),
      coordinators: String(e.coordinators || ""),
      fee: Number(e.fee) || 0,
      participantType: String(e.participantType || "Solo"),
      groupCount: Number(e.groupCount) || 1,
      teamName: String(e.teamName || "").trim(),
    }));

    const reg = new Registration({
      ticketId: generateTicketId(),
      fullName: String(participantData.fullName || "").trim(),
      mobile: String(participantData.mobile || "").trim(),
      school: String(participantData.school || "").trim(),
      classCourse: String(participantData.classCourse || "").trim(),
      age: Number(participantData.age) || 18,
      teamSlot: String(participantData.teamSlot || "").trim(),
      category: String(participantData.category || "Senior"),
      gender: String(participantData.gender || "Male"),
      reference: String(participantData.reference || "").trim(),
      eventName:
        events.map((e) => e.name).join(", ") ||
        String(participantData.eventName || "General Pass"),
      events,
      amount: Number(participantData.amount) || 0,
      waivedAmount: 0,
      secretCode: String(participantData.secretCode || "").trim(),
      status: "PAID",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    await reg.save();
    return res.json({ status: "PAID", ticketId: reg.ticketId });
  } catch (err) {
    return res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

app.post("/api/record-complimentary", async (req, res) => {
  try {
    const {
      fullName,
      mobile,
      school,
      classCourse,
      age,
      teamSlot,
      category,
      gender,
      reference,
      events,
      eventName,
      secretCode,
    } = req.body;

    const validCode = await SecretCode.findOne({
      code: String(secretCode).trim().toUpperCase(),
      isActive: true,
    });

    if (!validCode) {
      return res.status(403).json({ error: "Unauthorized: Invalid or inactive secret code." });
    }

    const rawEvents = Array.isArray(events) ? events : [];
    const formattedEvents = rawEvents.map((e) => ({
      id: String(e.id || ""),
      name: String(e.name || ""),
      coordinators: String(e.coordinators || ""),
      fee: 0,
      participantType: String(e.participantType || "Solo"),
      groupCount: Number(e.groupCount) || 1,
      teamName: String(e.teamName || "").trim(),
    }));

    const reg = new Registration({
      ticketId: generateTicketId(),
      fullName: String(fullName || "").trim(),
      mobile: String(mobile || "").trim(),
      school: String(school || "").trim(),
      classCourse: String(classCourse || "").trim(),
      age: Number(age) || 18,
      teamSlot: String(teamSlot || "").trim(),
      category: String(category || "Senior"),
      gender: String(gender || "Male"),
      reference: String(reference || "").trim(),
      eventName:
        formattedEvents.map((e) => e.name).join(", ") ||
        String(eventName || "Complimentary Pass"),
      events: formattedEvents,
      amount: 0,
      waivedAmount: 0,
      secretCode: validCode.code,
      status: "COMPLIMENTARY",
    });

    reg.waivedAmount = calculateRegistrationOriginalAmount(reg, EVENTS);

    await reg.save();
    return res.json({ status: "COMPLIMENTARY", ticketId: reg.ticketId });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

app.get("/dance", async (req, res) => {
  res.render("dance", {
    pageTitle: "Navchetna Yuva Mahotsav - Event Rules & Schedule",
  });
});

// Night Event Registration Schema & Endpoints
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
    collegeIdNumber: { type: String, default: "", trim: true },
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

app.get("/NightEventRegistration", (req, res) => {
  res.render("djform");
});

function generateNightTicketId(event) {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const prefix = event === "dj" ? "DJ" : "BHJ";
  return `NYSM26-${prefix}-${randomNum}`;
}

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

// Authentication Middlewares
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

// Populate EventTracking from Registrations
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

// Staff Onboarding & Authentication Routes
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

// Admin Dashboard
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
      const evTrackings = trackings.filter((t) => {
        const id = (t.eventId || "").toLowerCase();
        const nm = (t.eventName || "").toLowerCase();
        return (
          id === ev.key.toLowerCase() ||
          id === ev.eventId.toLowerCase() ||
          id === ev.eventCode.toLowerCase() ||
          ev.aliases.some((a) => id.includes(a) || nm.includes(a))
        );
      });

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

// Distribution Routes
app.get("/distribution", requireAdmin, async (req, res) => {
  try {
    if (typeof ensureEventTrackingPopulated === "function") {
      await ensureEventTrackingPopulated();
    }

    const [staffList, trackings] = await Promise.all([
      Staff.find({ isActive: true }).sort({ email: 1 }).lean(),
      EventTracking.find({}, "eventId eventName category assignedStaff followupStatus isAssigned").lean(),
    ]);

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
      events: dynamicEvents,
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

app.post("/distribution/apply", requireAdmin, async (req, res) => {
  try {
    const { mode, eventId, categoryFilter, maxLimit, staffId, countToAssign } = req.body;
    const limit = Math.min(Math.max(parseInt(maxLimit, 10) || 40, 1), 40);

    const queryConditions = [
      {
        $or: [
          { isAssigned: false },
          { isAssigned: { $exists: false } },
          { "assignedStaff.staffId": null },
          { "assignedStaff.staffId": { $exists: false } },
          { "assignedStaff.targetStatus": "UNASSIGNED" },
        ],
      },
    ];

    if (eventId && eventId !== "ALL" && eventId.trim() !== "") {
      const trimmedEvent = eventId.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryConditions.push({
        $or: [
          { eventId: new RegExp(`^${trimmedEvent}$`, "i") },
          { eventName: new RegExp(`^${trimmedEvent}$`, "i") },
        ],
      });
    }

    if (categoryFilter && categoryFilter !== "ALL" && categoryFilter.trim() !== "") {
      const escapedCategory = categoryFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryConditions.push({
        category: new RegExp(`^${escapedCategory}$`, "i"),
      });
    }

    const baseQuery = { $and: queryConditions };

    const availableMatches = await EventTracking.countDocuments(baseQuery);
    if (availableMatches === 0) {
      return res.redirect(
        "/distribution?error=" +
          encodeURIComponent(
            `No unassigned contacts found matching Event: "${eventId || 'ALL'}" and Category: "${categoryFilter || 'ALL'}".`
          )
      );
    }

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
        "/distribution?success=" +
          encodeURIComponent(
            `Assigned ${ids.length} contacts (${categoryFilter || 'All Categories'}) directly to ${member.email}.`
          )
      );
    }

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

app.post("/distribution/reset", requireAdmin, async (req, res) => {
  try {
    const { scope, eventId, staffId } = req.body;

    const resetFields = {
      $set: {
        isAssigned: false,
        assignedStaff: {
          staffId: null,
          email: "",
          secretCode: "",
          targetStatus: "UNASSIGNED",
          assignedBy: "",
          assignedAt: null,
        },
      },
    };

    if (scope === "STAFF" && staffId) {
      await EventTracking.updateMany(
        { "assignedStaff.staffId": staffId, followupStatus: "PENDING" },
        resetFields
      );
      return res.redirect("/distribution?success=" + encodeURIComponent("Cleared pending assignments for the selected staff member."));
    }

    if (scope === "EVENT") {
      const filter = { followupStatus: "PENDING" };
      if (eventId && eventId !== "ALL") {
        filter.$or = [{ eventId: eventId }, { eventName: eventId }];
      }
      await EventTracking.updateMany(filter, resetFields);
      return res.redirect("/distribution?success=" + encodeURIComponent("Reset pending contact assignments successfully."));
    }

    return res.redirect("/distribution?error=" + encodeURIComponent("Invalid reset request parameters."));
  } catch (err) {
    return res.redirect("/distribution?error=" + encodeURIComponent(err.message));
  }
});

// ====================================================
// Master Desk / Corrections Engine
// ====================================================
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
      regFilter.category = new RegExp(`^${category.trim()}$`, "i");
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

    let masterData = allRegistrations.map((reg) => {
      const regId = String(reg._id);
      
      // Merge registered events with EventTracking records
      const trackings = trackingByRegId[regId] || [];
      
      let unifiedEvents = [];
      if (trackings.length > 0) {
        unifiedEvents = trackings;
      } else if (Array.isArray(reg.events) && reg.events.length > 0) {
        unifiedEvents = reg.events.map((e) => ({
          eventId: e.id,
          eventName: e.name,
          tokenNumber: "",
          entryStatus: "PENDING",
          followupStatus: "PENDING",
          totalCalls: 0,
          coordinatorNotes: "",
        }));
      } else if (reg.eventName) {
        unifiedEvents = [{
          eventId: reg.eventName,
          eventName: reg.eventName,
          tokenNumber: "",
          entryStatus: "PENDING",
          followupStatus: "PENDING",
          totalCalls: 0,
          coordinatorNotes: "",
        }];
      }

      const isPresent = unifiedEvents.some((ev) => ev.entryStatus === "PRESENT");

      const assignedStaffEmails = Array.from(
        new Set(unifiedEvents.filter((e) => e.assignedStaff?.email).map((e) => e.assignedStaff.email))
      );

      const assignedStaffIds = Array.from(
        new Set(
          unifiedEvents
            .filter((e) => e.assignedStaff?.staffId)
            .map((e) => String(e.assignedStaff.staffId))
        )
      );

      const isContacted = unifiedEvents.some(
        (e) => e.followupStatus && e.followupStatus !== "PENDING"
      );

      return {
        ...reg,
        events: unifiedEvents,
        isPresent,
        isContacted,
        assignedStaffEmails,
        assignedStaffIds,
      };
    });

    // 1. FILTER: Multi-key Event Filter (Fixes Open Mic, Hackathon, Dance, Drawing, etc.)
    if (eventId && eventId !== "ALL") {
      const matchedConfig = EVENTS_CONFIG.find(
        (c) =>
          c.key.toLowerCase() === eventId.toLowerCase() ||
          c.eventId.toLowerCase() === eventId.toLowerCase() ||
          c.eventCode.toLowerCase() === eventId.toLowerCase()
      );

      const queryTokens = matchedConfig
        ? [
            matchedConfig.key.toLowerCase(),
            matchedConfig.eventId.toLowerCase(),
            matchedConfig.eventCode.toLowerCase(),
            matchedConfig.name.toLowerCase(),
            ...matchedConfig.aliases.map((a) => a.toLowerCase()),
          ]
        : [eventId.toLowerCase()];

      masterData = masterData.filter((r) => {
        // Match against both embedded events array and fallback registration.eventName
        const inRegName = r.eventName
          ? queryTokens.some((tok) => r.eventName.toLowerCase().includes(tok))
          : false;

        const inEventsList = r.events.some((ev) => {
          const evId = (ev.eventId || "").toLowerCase();
          const evNm = (ev.eventName || "").toLowerCase();
          return queryTokens.some((tok) => evId.includes(tok) || evNm.includes(tok));
        });

        return inRegName || inEventsList;
      });
    }

    // 2. FILTER: Attendance / Desk Entry
    if (entryStatus && entryStatus !== "ALL") {
      if (entryStatus === "PRESENT") {
        masterData = masterData.filter((r) => r.isPresent);
      } else if (entryStatus === "PENDING") {
        masterData = masterData.filter((r) => !r.isPresent);
      }
    }

    // 3. FILTER: Assigned Staff Member
    if (staffId && staffId !== "ALL") {
      if (staffId === "UNASSIGNED") {
        masterData = masterData.filter((r) => r.assignedStaffIds.length === 0);
      } else {
        masterData = masterData.filter((r) =>
          r.assignedStaffIds.includes(String(staffId))
        );
      }
    }

    // 4. FILTER: Call Follow-up Response
    if (followupStatus && followupStatus !== "ALL") {
      if (followupStatus === "CONTACTED_ANY") {
        masterData = masterData.filter((r) => r.isContacted);
      } else {
        masterData = masterData.filter((r) =>
          r.events.some((e) => (e.followupStatus || "PENDING") === followupStatus)
        );
      }
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

    await EventTracking.deleteMany({ registrationId });

    return res.redirect(
      "/corrections?success=" + encodeURIComponent(`Ticket #${reg.ticketId} and associated records deleted permanently.`)
    );
  } catch (err) {
    return res.redirect("/corrections?error=" + encodeURIComponent(err.message));
  }
});

// Event Day Desk Routes
app.get("/desk", requireAuth, async (req, res) => {
  res.render("desk", {
    staff: req.session.staff,
    operatorTitle: req.session.staff.role === "ADMIN" ? "Super Admin" : "Desk Operator",
  });
});

app.get("/api/desk/search", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ success: true, participant: null });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const registration = await Registration.findOne({
      $or: [{ mobile: regex }, { ticketId: regex }, { teamSlot: regex }, { fullName: regex }],
    }).lean();

    if (!registration) return res.json({ success: true, participant: null });

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

    const trackings = await EventTracking.find({ registrationId: registration._id }).lean();

    // Map both trackingId and id so desk.ejs never gets undefined
    const formattedEvents = trackings.map((t) => ({
      ...t,
      id: t._id,
      trackingId: t._id,
      _id: t._id,
    }));

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
      events: formattedEvents,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/desk/mark-present", requireAuth, async (req, res) => {
  try {
    // Support all possible key names coming from desk.ejs
    const trackingId = req.body.trackingId || req.body.id || req.body._id || req.body.eventTrackingId;
    const rawToken = req.body.manualToken || req.body.token || req.body.tokenNumber || req.body.tokenVal || "";
    const tokenVal = String(rawToken).trim().toUpperCase();
    const operatorName = req.session?.staff?.email || "Volunteer Desk #1";

    if (!tokenVal) {
      return res.status(400).json({ success: false, message: "Token number is required to mark entry." });
    }

    // Flexible lookup: by ObjectId, or fallback to ticketId / registrationId
    let tracking = null;
    if (trackingId && mongoose.Types.ObjectId.isValid(trackingId)) {
      tracking = await EventTracking.findById(trackingId);
    }

    if (!tracking && (req.body.ticketId || req.body.registrationId)) {
      const query = {};
      if (req.body.registrationId) query.registrationId = req.body.registrationId;
      if (req.body.ticketId) query.ticketId = req.body.ticketId;
      if (req.body.eventId) query.eventId = req.body.eventId;
      tracking = await EventTracking.findOne(query);
    }

    if (!tracking) {
      return res.status(404).json({ success: false, message: "Tracking record not found." });
    }

    // Update using findByIdAndUpdate to bypass full-schema validation errors
    const updatedTracking = await EventTracking.findByIdAndUpdate(
      tracking._id,
      {
        $set: {
          tokenNumber: tokenVal,
          entryStatus: "PRESENT",
          entryMarkedAt: new Date(),
          entryMarkedBy: operatorName,
          stageStatus: tracking.stageStatus === "NOT_PRESENT" ? "WAITING_BACKSTAGE" : tracking.stageStatus,
        },
      },
      { new: true }
    );

    // Log check-in activity safely
    if (typeof ActivityLog !== "undefined" && ActivityLog) {
      try {
        const allowedTypes = ActivityLog.schema?.path("activityType")?.enumValues || [];
        const chosenType = allowedTypes.includes("DESK_CHECKIN")
          ? "DESK_CHECKIN"
          : allowedTypes[0] || "STAGE_STATUS_CHANGE";

        await ActivityLog.create({
          trackingId: updatedTracking._id,
          registrationId: updatedTracking.registrationId,
          ticketId: updatedTracking.ticketId,
          eventId: updatedTracking.eventId,
          performedBy: {
            memberId: req.session?.staff?.id ? String(req.session.staff.id) : "DESK",
            name: operatorName,
            role: req.session?.staff?.role || "DESK",
          },
          activityType: chosenType,
          remarks: `Manual Token ${tokenVal} assigned and marked present at desk`,
        });
      } catch (logErr) {
        console.warn("ActivityLog write skipped:", logErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Check-in successful",
      tokenNumber: updatedTracking.tokenNumber,
      tracking: updatedTracking,
    });
  } catch (err) {
    console.error("Desk Check-in Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


// Coordinator Dashboard Routes
app.get("/coordinator", requireAuth, async (req, res) => {
  try {
    await ensureEventTrackingPopulated();

    const staffMember = req.session.staff;
    const { category, stageStatus, entryStatus, followupStatus, search } = req.query;

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

    const regIds = trackings.map((t) => t.registrationId).filter(Boolean);
    const registrations = await Registration.find({ _id: { $in: regIds } }).lean();
    const regMap = {};
    registrations.forEach((r) => {
      regMap[String(r._id)] = r;
    });

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

    const totalAssigned = participantCards.length;
    const presentAtDesk = participantCards.filter((p) => p.entryStatus === "PRESENT").length;
    const backstageCount = participantCards.filter((p) => p.stageStatus === "WAITING_BACKSTAGE").length;
    const onStageCount = participantCards.filter((p) => p.stageStatus === "ON_STAGE").length;
    const completedCount = participantCards.filter((p) => p.stageStatus === "PERFORMANCE_DONE").length;

    const willComeCount = participantCards.filter((p) => p.followupStatus === "WILL_COME").length;
    const willNotComeCount = participantCards.filter((p) => p.followupStatus === "WILL_NOT_COME").length;
    const notPickedCount = participantCards.filter((p) => p.followupStatus === "CALL_NOT_PICKED").length;

    const eventName = staffMember.assignedEventId || "All Assigned Events";

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

// POST /api/coordinator/update-followup
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

// POST /api/coordinator/update-stage
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

app.get("/rules", requireAuth, async (req, res) => {
  res.render("rules", {
    pageTitle: "Navchetna Yuva Mahotsav - Event Rules & Schedule",
  });
});

/// done new 

// ======================================
// Event Stage Access Configuration
// ======================================
const EVENT_STAGE_PORTAL = [
  {
    eventId: "ev_8",
    eventCode: "DANCE",
    aliases: ["loknritya", "dance", "ev_8", "DANCE"],
    name: "Loknritya : Dance Competition",
    prefix: "D",
    secretCode: "DANCE@NYSM26",
  },
  {
    eventId: "ev_4",
    eventCode: "DRAWING",
    aliases: ["rangotsav", "drawing", "ev_4", "DRAWING"],
    name: "Rangotsav : Drawing Competition",
    prefix: "DR",
    secretCode: "DRAW@NYSM26",
  },
  {
    eventId: "ev_11",
    eventCode: "ESSAY",
    aliases: ["kalamkar", "essay", "ev_11", "ESSAY"],
    name: "Kalamkar : Essay Competition",
    prefix: "E",
    secretCode: "ESSAY@NYSM26",
  },
  {
    eventId: "ev_1",
    eventCode: "ESPORTS",
    aliases: ["esports", "ev_1", "ESPORTS"],
    name: "E-Sports Championship",
    prefix: "ESP",
    secretCode: "ESP@NYSM26",
  },
  {
    eventId: "ev_2",
    eventCode: "FREEFIRE",
    aliases: ["esports Free Fire", "freefire", "ev_2", "FREEFIRE"],
    name: "E-Sports Free Fire Championship",
    prefix: "FF",
    secretCode: "FF@NYSM26",
  },
  {
    eventId: "ev_3",
    eventCode: "PUBG",
    aliases: ["esports PUBG", "pubg", "ev_3", "PUBG"],
    name: "E-Sports PUBG Championship",
    prefix: "BG",
    secretCode: "PUBG@NYSM26",
  },
  {
    eventId: "ev_5",
    eventCode: "QUIZ",
    aliases: ["bharatbodh", "quiz", "ev_5", "QUIZ"],
    name: "Bharat Bodh : Quiz Competition",
    prefix: "Q",
    secretCode: "QUIZ@NYSM26",
  },
  {
    eventId: "ev_6",
    eventCode: "HACKATHON",
    aliases: ["techmanthan", "hackathon", "ev_6", "HACKATHON"],
    name: "Tech Manthan Hackathon",
    prefix: "TM",
    secretCode: "TECH@NYSM26",
  },
  {
    eventId: "ev_7",
    eventCode: "OPENMIC",
    aliases: ["yuvavani", "openmic", "ev_7", "OPENMIC"],
    name: "Yuva-Vani : Open Mic",
    prefix: "OM",
    secretCode: "MIC@NYSM26",
  },
  {
    eventId: "ev_9",
    eventCode: "FASHION",
    aliases: ["rangebharat", "fashion", "ev_9", "FASHION"],
    name: "Rang-e-Bharat : Cultural Fashion Show",
    prefix: "FS",
    secretCode: "FASHION@NYSM26",
  },
  {
    eventId: "ev_10",
    eventCode: "PHOTO",
    aliases: ["beyondframe", "photo", "ev_10", "PHOTO"],
    name: "Beyond the Frame : Photography & Reel",
    prefix: "PH",
    secretCode: "PHOTO@NYSM26",
  },
  {
    eventId: "ev_12",
    eventCode: "DHARMA",
    aliases: ["dharmagatha", "dharma", "ev_12", "DHARMA"],
    name: "Dharmagatha : Ramayan - Mahabharat Gyan Quiz",
    prefix: "DG",
    secretCode: "DHARMA@NYSM26",
  },
];

// ----------------------------------------------------
// Coordinator Stage Auth Middleware
// ----------------------------------------------------
function requireStageAuth(req, res, next) {
  if (!req.session || !req.session.stageEvent) {
    return res.redirect("/stage/login?error=" + encodeURIComponent("Please enter your event access code first."));
  }
  next();
}

// ----------------------------------------------------
// 1. Stage Login Routes
// ----------------------------------------------------
app.get("/stage/login", (req, res) => {
  if (req.session && req.session.stageEvent) {
    return res.redirect("/stage/dashboard");
  }
  res.render("stage-login", { error: req.query.error || null });
});
app.post("/stage/login", (req, res) => {
  const { secretCode } = req.body;
  if (!secretCode || !secretCode.trim()) {
    return res.redirect("/stage/login?error=" + encodeURIComponent("Secret code is required."));
  }

  const cleanCode = secretCode.trim().toUpperCase();
  const matchedEvent = EVENT_STAGE_PORTAL.find((e) => e.secretCode.toUpperCase() === cleanCode);

  if (!matchedEvent) {
    return res.redirect("/stage/login?error=" + encodeURIComponent("Invalid event access code."));
  }

  req.session.stageEvent = {
    eventId: matchedEvent.eventId,
    eventCode: matchedEvent.eventCode,
    name: matchedEvent.name,
    prefix: matchedEvent.prefix,
    aliases: matchedEvent.aliases || [matchedEvent.eventId, matchedEvent.eventCode],
  };

  res.redirect("/stage/dashboard");
});
app.get("/stage/logout", (req, res) => {
  delete req.session.stageEvent;
  res.redirect("/stage/login");
});

// ----------------------------------------------------
// 2. Stage Dashboard: View Present Participants & Tokens
// ----------------------------------------------------
app.get("/stage/dashboard", requireStageAuth, async (req, res) => {
  try {
    const activeEvent = req.session.stageEvent;
    const aliases = activeEvent.aliases || [activeEvent.eventId, activeEvent.eventCode];

    // Create a flexible name regex (handles English, Hindi, and partial names)
    const baseKeyword = activeEvent.eventCode.toLowerCase(); // e.g. "drawing" or "dance"
    const nameRegex = new RegExp(baseKeyword, "i");

    // Match by eventId aliases, exact name, or partial keyword match
    const trackings = await EventTracking.find({
      $and: [
        {
          $or: [
            { eventId: { $in: aliases } },
            { eventId: new RegExp(`^${activeEvent.eventId}$`, "i") },
            { eventId: new RegExp(`^${activeEvent.eventCode}$`, "i") },
            { eventName: new RegExp(activeEvent.name, "i") },
            { eventName: nameRegex },
          ],
        },
        { entryStatus: "PRESENT" },
      ],
    })
      .sort({ entryMarkedAt: 1, createdAt: 1 })
      .lean();

    const regIds = trackings.map((t) => t.registrationId).filter(Boolean);
    const registrations = await Registration.find({ _id: { $in: regIds } }).lean();
    const regMap = new Map(registrations.map((r) => [String(r._id), r]));

    const participants = trackings.map((t, idx) => {
      const reg = regMap.get(String(t.registrationId)) || {};
      const displayToken =
        t.tokenNumber && t.tokenNumber.trim() !== ""
          ? t.tokenNumber
          : `${activeEvent.prefix}${idx + 1}`;

      return {
        trackingId: t._id,
        ticketId: t.ticketId || reg.ticketId || "N/A",
        tokenNumber: displayToken,
        fullName: reg.fullName || "Participant",
        mobile: reg.mobile || "N/A",
        school: reg.school || "School / College Not Specified",
        category: t.category || reg.category || "OPEN",
        teamName: t.teamName || reg.teamSlot || "-",
        participantType: t.participantType || "Solo",
        stageStatus: t.stageStatus || "WAITING_BACKSTAGE",
        performanceStartedAt: t.performanceStartedAt,
        performanceDoneAt: t.performanceDoneAt,
        entryMarkedAt: t.entryMarkedAt,
      };
    });

    const waitingCount = participants.filter((p) => p.stageStatus === "WAITING_BACKSTAGE").length;
    const onStageCount = participants.filter((p) => p.stageStatus === "ON_STAGE").length;
    const performedCount = participants.filter((p) => p.stageStatus === "PERFORMANCE_DONE").length;

    res.render("stage-dashboard", {
      event: activeEvent,
      participants,
      stats: {
        totalPresent: participants.length,
        waitingCount,
        onStageCount,
        performedCount,
      },
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Stage Dashboard Error: " + err.message);
  }
});

// ----------------------------------------------------
// 3. Stage Action: Mark On Stage / Performed
// ----------------------------------------------------
app.post("/stage/update-status", requireStageAuth, async (req, res) => {
  try {
    const { trackingId, stageStatus } = req.body;
    const activeEvent = req.session.stageEvent;

    if (!trackingId || !mongoose.Types.ObjectId.isValid(trackingId)) {
      return res.redirect("/stage/dashboard?error=" + encodeURIComponent("Invalid tracking ID."));
    }

    const validStatuses = ["WAITING_BACKSTAGE", "ON_STAGE", "PERFORMANCE_DONE", "DISQUALIFIED"];
    if (!validStatuses.includes(stageStatus)) {
      return res.redirect("/stage/dashboard?error=" + encodeURIComponent("Invalid stage status."));
    }

    const updateDoc = { stageStatus };
    if (stageStatus === "ON_STAGE") {
      updateDoc.performanceStartedAt = new Date();
    } else if (stageStatus === "PERFORMANCE_DONE") {
      updateDoc.performanceDoneAt = new Date();
    }

    const updated = await EventTracking.findByIdAndUpdate(trackingId, { $set: updateDoc });

    if (!updated) {
      return res.redirect("/stage/dashboard?error=" + encodeURIComponent("Participant record not found."));
    }

    const msg = stageStatus === "PERFORMANCE_DONE"
      ? `Marked ${updated.ticketId} as Performed!`
      : `Updated status to ${stageStatus.replace(/_/g, " ")}`;

    return res.redirect("/stage/dashboard?success=" + encodeURIComponent(msg));
  } catch (err) {
    return res.redirect("/stage/dashboard?error=" + encodeURIComponent(err.message));
  }
});



// 404 Handler & Server Startup
app.use((req, res) => res.status(404).render("404"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
