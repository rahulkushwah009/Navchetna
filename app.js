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
    secret: process.env.SESSION_SECRET || "navchetna_staff_secret_key_2026",
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
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

const participantCorrectionSchema = new mongoose.Schema(
  {
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    originalName: { type: String, default: "", trim: true },
    correctedName: { type: String, required: true, trim: true },
    correctedBy: { type: String, default: "Desk Operator" },
  },
  { timestamps: true }
);
const ParticipantCorrection =
  mongoose.models.ParticipantCorrection ||
  mongoose.model("ParticipantCorrection", participantCorrectionSchema);

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
// Event Configurations & Sequential Prefix
// ======================================
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
  esports: "ESP",
  ev_2: "FF",
  FREEFIRE: "FF",
  "esports Free Fire": "FF",
  freefire: "FF",
  ev_3: "BG",
  PUBG: "BG",
  "esports PUBG": "BG",
  pubg: "BG",
  ev_4: "DR",
  DRAWING: "DR",
  rangotsav: "DR",
  drawing: "DR",
  ev_5: "Q",
  QUIZ: "Q",
  bharatbodh: "Q",
  quiz: "Q",
  ev_6: "TM",
  HACKATHON: "TM",
  techmanthan: "TM",
  hackathon: "TM",
  ev_7: "OM",
  OPENMIC: "OM",
  yuvavani: "OM",
  openmic: "OM",
  ev_8: "D",
  DANCE: "D",
  loknritya: "D",
  dance: "D",
  ev_9: "FS",
  FASHION: "FS",
  rangebharat: "FS",
  fashion: "FS",
  ev_10: "PH",
  PHOTO: "PH",
  beyondframe: "PH",
  photo: "PH",
  ev_11: "KL",
  ESSAY: "KL",
  kalamkar: "KL",
  essay: "KL",
  ev_12: "DG",
  DHARMA: "DG",
  dharmagatha: "DG",
  dharma: "DG",
};

async function getNextEventToken(rawEventId, eventName) {
  let matchedKey = (rawEventId || "").trim();
  let prefix = EVENT_PREFIXES[matchedKey];

  if (!prefix && eventName) {
    const lowerName = eventName.toLowerCase();
    for (const [key, val] of Object.entries(EVENT_PREFIXES)) {
      if (lowerName.includes(key.toLowerCase())) {
        prefix = val;
        matchedKey = key;
        break;
      }
    }
  }

  if (!prefix) {
    prefix = "TK";
    matchedKey = "GENERIC";
  }

  const counterKey = `token_${prefix.toUpperCase()}`;
  const counterDoc = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  return `${prefix}-${counterDoc.seq}`;
}

// ======================================
// Query Builder with Range & E-Sports Support
// ======================================
function buildRegistrationQuery(query) {
  const conditions = [];

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    conditions.push({
      $or: [
        { ticketId: { $regex: s, $options: "i" } },
        { fullName: { $regex: s, $options: "i" } },
        { mobile: { $regex: s, $options: "i" } },
        { school: { $regex: s, $options: "i" } },
        { reference: { $regex: s, $options: "i" } },
        { teamSlot: { $regex: s, $options: "i" } },
        { "events.teamName": { $regex: s, $options: "i" } },
      ],
    });
  }

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

  if (query.esportsMode && query.esportsMode.trim()) {
    conditions.push({
      "events.participantType": query.esportsMode.trim(),
    });
  }

  if (query.secretCode && query.secretCode.trim()) {
    conditions.push({
      secretCode: { $regex: query.secretCode.trim(), $options: "i" },
    });
  }

  if (query.reference && query.reference.trim()) {
    conditions.push({
      reference: { $regex: query.reference.trim(), $options: "i" },
    });
  }

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
    conditions.push({ $expr: { $and: exprConditions } });
  } else if (query.teamSlot && query.teamSlot.trim() !== "") {
    conditions.push({
      teamSlot: { $regex: query.teamSlot.trim(), $options: "i" },
    });
  }

  if (query.status && query.status.trim()) {
    conditions.push({ status: query.status.trim() });
  }

  if (query.category && query.category.trim()) {
    conditions.push({
      category: { $regex: `^${query.category.trim()}$`, $options: "i" },
    });
  }

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
// Authentication Middlewares
// ======================================
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

// ======================================
// Page & Admin Routes
// ======================================
app.get("/", (req, res) => res.render("homePage"));
app.get("/register", (req, res) => res.render("register"));
app.get("/success", (req, res) => res.render("success"));

// --- Admin: Secret Code Management ---
app.get("/AdminCode", async (req, res) => {
  try {
    const codes = await SecretCode.find().sort({ createdAt: -1 });
    res.render("admin-secret-code", { codes, message: null });
  } catch (error) {
    res.render("admin-secret-code", {
      codes: [],
      message: { type: "error", text: "Failed to load secret codes." },
    });
  }
});

app.post("/admin/secret-codes", async (req, res) => {
  try {
    const { code, label } = req.body;
    if (!code || !code.trim()) {
      return res.render("admin-secret-code", {
        codes: await SecretCode.find().sort({ createdAt: -1 }),
        message: { type: "error", text: "Secret code is required." },
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await SecretCode.findOne({ code: cleanCode });
    if (existing) {
      return res.render("admin-secret-code", {
        codes: await SecretCode.find().sort({ createdAt: -1 }),
        message: { type: "error", text: "This secret code already exists." },
      });
    }

    await new SecretCode({
      code: cleanCode,
      label: label && label.trim() ? label.trim() : "General Member",
      isActive: true,
    }).save();

    res.redirect("/AdminCode");
  } catch (error) {
    res.redirect("/AdminCode");
  }
});

// --- Admin: Dashboard Aggregate View ---
app.get("/admin/dashboard", async (req, res) => {
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

// --- Admin: Delete Registration Record ---
app.delete("/admin/registrations/:id", async (req, res) => {
  try {
    await Registration.findByIdAndDelete(req.params.id);
    await ParticipantCorrection.deleteMany({ registrationId: req.params.id });
    res.redirect("/admin/registrations");
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).send("Error deleting record: " + error.message);
  }
});

// --- Admin: Filterable Registrations Detail Table Page ---
app.get("/admin/registrations", async (req, res) => {
  try {
    const mongoQuery = buildRegistrationQuery(req.query);
    const rawRegistrations = await Registration.find(mongoQuery)
      .sort({ createdAt: -1 })
      .lean();

    let totalAmount = 0;
    let totalCompWaived = 0;
    let paidCount = 0;
    let compCount = 0;

    const registrations = rawRegistrations.map((r) => {
      const originalValue = typeof calculateRegistrationOriginalAmount === "function"
        ? calculateRegistrationOriginalAmount(r, EVENTS)
        : Number(r.waivedAmount || r.amount || 0);

      if (r.status === "PAID") {
        paidCount++;
        totalAmount += Number(r.amount) || 0;
      } else if (r.status === "COMPLIMENTARY") {
        compCount++;
        totalCompWaived += originalValue;
      }

      return {
        ...r,
        computedCompAmount: originalValue,
      };
    });

    res.render("registrations", {
      registrations,
      eventsList: EVENTS,
      filters: {
        startDate: req.query.startDate || "",
        endDate: req.query.endDate || "",
        eventId: req.query.eventId || "",
        esportsGame: req.query.esportsGame || "",
        esportsMode: req.query.esportsMode || "",
        secretCode: req.query.secretCode || "",
        reference: req.query.reference || "",
        slotFrom: req.query.slotFrom || "",
        slotTo: req.query.slotTo || "",
        teamSlot: req.query.teamSlot || "",
        status: req.query.status || "",
        category: req.query.category ? req.query.category.trim() : "",
        search: req.query.search || "",
      },
      summary: {
        totalCount: registrations.length,
        totalAmount,
        totalCompWaived,
        paidCount,
        compCount,
      },
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).send("Error loading registrations");
  }
});

// --- Admin: Render Edit Form Page ---
app.get("/admin/registrations/:id/edit", async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).send("Registration record not found.");
    }
    res.render("edit-registration", { registration });
  } catch (error) {
    console.error("Error fetching registration for edit:", error);
    res.status(500).send("Server Error: " + error.message);
  }
});

// --- Admin: Update Registration Record ---
app.put("/admin/registrations/:id", async (req, res) => {
  try {
    const {
      fullName,
      mobile,
      gender,
      age,
      school,
      classCourse,
      category,
      eventName,
      teamSlot,
      reference,
      secretCode,
      amount,
      waivedAmount,
      status,
    } = req.body;

    await Registration.findByIdAndUpdate(
      req.params.id,
      {
        fullName: fullName ? fullName.trim() : "",
        mobile: mobile ? mobile.trim() : "",
        gender,
        age: Number(age) || 18,
        school: school ? school.trim() : "",
        classCourse: classCourse ? classCourse.trim() : "",
        category,
        eventName: eventName ? eventName.trim() : "",
        teamSlot: teamSlot ? teamSlot.trim() : "",
        reference: reference ? reference.trim() : "",
        secretCode: secretCode ? secretCode.trim().toUpperCase() : "",
        amount: Number(amount) || 0,
        waivedAmount: Number(waivedAmount) || 0,
        status,
      },
      { runValidators: true, returnDocument: "after" }
    );

    res.redirect("/admin/registrations");
  } catch (error) {
    console.error("Error updating registration:", error);
    res.status(500).send("Error updating record: " + error.message);
  }
});

// --- Admin: Export Registrations (CSV) ---
app.get("/admin/registrations/export/excel", async (req, res) => {
  try {
    const mongoQuery = buildRegistrationQuery(req.query);
    const rawRegistrations = await Registration.find(mongoQuery)
      .sort({ createdAt: -1 })
      .lean();

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const cleanStr = String(str).replace(/\r\n|\r|\n/g, " ").replace(/"/g, '""').trim();
      return `"${cleanStr}"`;
    };

    const headers = [
      "S.No",
      "Ticket ID",
      "Transaction ID",
      "Full Name",
      "Mobile",
      "Gender",
      "Age",
      "School / Institution",
      "Class / Course",
      "Category",
      "Selected Events",
      "Team Slot",
      "Reference",
      "Secret Code",
      "Status",
      "Paid Amount (INR)",
      "Waived Value (INR)",
      "Registration Date",
    ];

    const rows = rawRegistrations.map((r, idx) => {
      const originalValue = calculateRegistrationOriginalAmount(r, EVENTS);

      let eventDetails = "-";
      if (r.events && r.events.length > 0) {
        eventDetails = r.events
          .map((e) => {
            const name = eventNameMap[e.id] || e.name || "Event";
            const team = e.teamName ? ` (Team: ${e.teamName.trim()})` : "";
            const type = e.participantType === "Group" ? `Grp: ${e.groupCount}` : (e.participantType || "Solo");
            return `${name} [${type}]${team}`;
          })
          .join(" | ");
      } else if (r.eventName) {
        eventDetails = r.eventName;
      }

      return [
        idx + 1,
        escapeCsv(r.ticketId),
        escapeCsv(r.razorpayPaymentId || "-"),
        escapeCsv(r.fullName),
        escapeCsv(r.mobile),
        escapeCsv(r.gender),
        r.age || "-",
        escapeCsv(r.school),
        escapeCsv(r.classCourse),
        escapeCsv(r.category),
        escapeCsv(eventDetails),
        escapeCsv(r.teamSlot || "-"),
        escapeCsv(r.reference || "-"),
        escapeCsv(r.secretCode || "-"),
        escapeCsv(r.status || "PENDING"),
        r.status === "COMPLIMENTARY" ? 0 : Number(r.amount || 0),
        r.status === "COMPLIMENTARY" ? originalValue : (Number(r.waivedAmount) || 0),
        escapeCsv(
          new Date(r.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        ),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Event_Registrations_${Date.now()}.csv`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).send("Error exporting file: " + error.message);
  }
});

// --- Admin: Members Master Table & Filter Breakdown ---
app.get("/admin/total", async (req, res) => {
  try {
    const { secretCode } = req.query;
    const queryCode = secretCode ? String(secretCode).trim().toUpperCase() : "";

    const allSecretCodes = await SecretCode.find().sort({ createdAt: -1 }).lean();
    const allCompRegistrations = await Registration.find({ status: "COMPLIMENTARY" }).lean();

    const compRegsWithAmount = allCompRegistrations.map((reg) => {
      const waivedVal = calculateRegistrationOriginalAmount(reg, EVENTS);
      return {
        ...reg,
        waivedVal,
      };
    });

    const secretCodesMasterSummary = allSecretCodes.map((codeItem) => {
      const matchedRegs = compRegsWithAmount.filter(
        (r) => (r.secretCode || "").trim().toUpperCase() === codeItem.code.toUpperCase()
      );

      const totalRegistrations = matchedRegs.length;
      const totalWaivedAmount = matchedRegs.reduce((sum, r) => sum + r.waivedVal, 0);

      return {
        code: codeItem.code,
        label: codeItem.label || "General Member",
        isActive: codeItem.isActive,
        totalRegistrations,
        totalWaivedAmount,
      };
    });

    let matchedCode = null;
    let registrations = [];
    let totalWaivedAmount = 0;

    if (queryCode) {
      matchedCode = allSecretCodes.find((c) => c.code.toUpperCase() === queryCode) || null;

      registrations = compRegsWithAmount.filter(
        (r) => (r.secretCode || "").trim().toUpperCase() === queryCode
      );

      registrations.forEach((reg) => {
        totalWaivedAmount += reg.waivedVal;
      });
    }

    res.render("total", {
      searchCode: queryCode,
      matchedCode,
      allSecretCodes,
      secretCodesMasterSummary,
      registrations,
      totalWaivedAmount,
      totalRegistrations: registrations.length,
    });
  } catch (error) {
    console.error("Error calculating member totals:", error);
    res.status(500).send("Error calculating member totals: " + error.message);
  }
});

// --- Admin: Export Master Summary Table to Excel (CSV) ---
app.get("/admin/total/export/excel", async (req, res) => {
  try {
    const allSecretCodes = await SecretCode.find().sort({ createdAt: -1 }).lean();
    const allCompRegistrations = await Registration.find({ status: "COMPLIMENTARY" }).lean();

    const compRegsWithAmount = allCompRegistrations.map((reg) => ({
      ...reg,
      waivedVal: calculateRegistrationOriginalAmount(reg, EVENTS),
    }));

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const cleanStr = String(str).replace(/\r\n|\r|\n/g, " ").replace(/"/g, '""').trim();
      return `"${cleanStr}"`;
    };

    const headers = [
      "S.No",
      "Member Name",
      "Status",
      "Total Registrations",
      "Total Waived Amount (INR)",
    ];

    const rows = allSecretCodes.map((item, idx) => {
      const matched = compRegsWithAmount.filter(
        (r) => (r.secretCode || "").trim().toUpperCase() === item.code.toUpperCase()
      );
      const totalRegs = matched.length;
      const totalWaived = matched.reduce((sum, r) => sum + r.waivedVal, 0);

      return [
        idx + 1,
        escapeCsv(item.label || "General Member"),
        item.isActive ? "ACTIVE" : "INACTIVE",
        totalRegs,
        totalWaived,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Members_Registration_Summary_${Date.now()}.csv`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).send("Error exporting file: " + error.message);
  }
});

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

// ======================================
// Night Event Registration Endpoints
// ======================================
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
      event,
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

function buildNightQuery(query) {
  const filter = {};

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    filter.$or = [
      { ticketId: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } },
      { mobile: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { college: { $regex: s, $options: "i" } },
      { "member2.name": { $regex: s, $options: "i" } },
      { "member2.mobile": { $regex: s, $options: "i" } },
    ];
  }

  if (query.event && query.event.trim()) {
    filter.event = query.event.trim();
  }

  if (query.status && query.status.trim()) {
    filter.status = query.status.trim();
  }

  if (query.secretCode && query.secretCode.trim()) {
    filter.secretCode = { $regex: query.secretCode.trim(), $options: "i" };
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(`${query.startDate}T00:00:00.000Z`);
    if (query.endDate) filter.createdAt.$lte = new Date(`${query.endDate}T23:59:59.999Z`);
  }

  return filter;
}

app.get("/admin/night-registrations", async (req, res) => {
  try {
    const filter = buildNightQuery(req.query);
    const registrations = await NightEventRegistration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    let totalRevenue = 0;
    let paidCount = 0;
    let compCount = 0;
    let djCount = 0;
    let bhajanCount = 0;

    registrations.forEach((r) => {
      if (r.status === "PAID") {
        paidCount++;
        totalRevenue += Number(r.amount || 0);
      } else if (r.status === "COMPLIMENTARY") {
        compCount++;
      }

      if (r.event === "dj") djCount++;
      if (r.event === "bhajan") bhajanCount++;
    });

    res.render("admin-night-registrations", {
      registrations,
      filters: {
        search: req.query.search || "",
        event: req.query.event || "",
        status: req.query.status || "",
        secretCode: req.query.secretCode || "",
        startDate: req.query.startDate || "",
        endDate: req.query.endDate || "",
      },
      summary: {
        totalCount: registrations.length,
        totalRevenue,
        paidCount,
        compCount,
        djCount,
        bhajanCount,
      },
    });
  } catch (error) {
    console.error("Error fetching night event registrations:", error);
    res.status(500).send("Error loading night event registrations: " + error.message);
  }
});

app.get("/admin/night-registrations/:id/edit", async (req, res) => {
  try {
    const registration = await NightEventRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).send("Registration record not found.");
    }
    res.render("edit-night-registration", { registration });
  } catch (error) {
    console.error("Error fetching registration for edit:", error);
    res.status(500).send("Server Error: " + error.message);
  }
});

app.put("/admin/night-registrations/:id", async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      college,
      course,
      collegeIdNumber,
      event,
      hasMember2,
      name2,
      mobile2,
      amount,
      secretCode,
      status,
    } = req.body;

    const isMember2 = hasMember2 === "true" || hasMember2 === "on" || hasMember2 === true;
    const selectedEvent = event === "dj" ? "dj" : "bhajan";
    const eventLabel = selectedEvent === "dj" ? "DJ Night" : "Bhajan Clubbing";

    await NightEventRegistration.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? name.trim() : "",
        mobile: mobile ? mobile.trim() : "",
        email: email ? email.trim().toLowerCase() : "",
        college: college ? college.trim() : "",
        course: course ? course.trim() : "",
        collegeIdNumber: selectedEvent === "dj" && collegeIdNumber ? collegeIdNumber.trim() : "",
        event: selectedEvent,
        eventLabel,
        hasMember2: isMember2,
        member2: {
          name: isMember2 && name2 ? name2.trim() : "",
          mobile: isMember2 && mobile2 ? mobile2.trim() : "",
        },
        amount: Number(amount) || 0,
        secretCode: secretCode ? secretCode.trim().toUpperCase() : "",
        status,
      },
      { runValidators: true, returnDocument: "after" }
    );

    res.redirect("/admin/night-registrations");
  } catch (error) {
    console.error("Error updating night registration:", error);
    res.status(500).send("Error updating record: " + error.message);
  }
});

app.delete("/admin/night-registrations/:id", async (req, res) => {
  try {
    await NightEventRegistration.findByIdAndDelete(req.params.id);
    res.redirect("/admin/night-registrations");
  } catch (error) {
    console.error("Error deleting night registration:", error);
    res.status(500).send("Error deleting record: " + error.message);
  }
});

// ----------------------------------------------------
// Staff Onboarding & Authentication Routes
// ----------------------------------------------------
app.get("/staff", requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role && ["ADMIN", "COORDINATOR"].includes(role.toUpperCase())) {
      filter.role = role.toUpperCase();
    }

    const staffList = await Staff.find(filter).sort({ createdAt: -1 });

    res.render("staff", {
      staffList,
      eventMap: EVENT_MAP,
      selectedRole: role || "",
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching staff records: " + err.message);
  }
});

app.post("/staff", requireAdmin, async (req, res) => {
  try {
    const { email, secretCode, role, assignedEventId } = req.body;

    if (!email || !secretCode || !role) {
      return res.redirect("/staff?error=" + encodeURIComponent("All required fields must be filled."));
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = secretCode.trim().toUpperCase();
    const normalizedRole = role.toUpperCase();

    const existing = await Staff.findOne({
      $or: [{ email: cleanEmail }, { secretCode: cleanCode }],
    });

    if (existing) {
      const field = existing.email === cleanEmail ? "Email" : "Secret Code";
      return res.redirect("/staff?error=" + encodeURIComponent(`${field} is already in use. Must be unique.`));
    }

    await Staff.create({
      email: cleanEmail,
      secretCode: cleanCode,
      role: normalizedRole,
      assignedEventId: normalizedRole === "COORDINATOR" ? assignedEventId : null,
    });

    res.redirect("/staff?success=" + encodeURIComponent(`${normalizedRole} account created successfully!`));
  } catch (err) {
    res.redirect("/staff?error=" + encodeURIComponent(err.message));
  }
});

app.post("/staff/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.redirect("/staff?success=" + encodeURIComponent("Staff access removed successfully."));
  } catch (err) {
    res.redirect("/staff?error=" + encodeURIComponent(err.message));
  }
});

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
// ----------------------------------------------------
app.get("/distribution", requireAdmin, async (req, res) => {
  try {
    await ensureEventTrackingPopulated();

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

    const baseQuery = {
      $or: [
        { isAssigned: false },
        { "assignedStaff.staffId": null },
        { "assignedStaff.staffId": { $exists: false } },
        { "assignedStaff.targetStatus": "UNASSIGNED" },
      ],
    };

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
// Master Desk / Corrections Engine
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

    const trackingByRegId = {};
    allTrackings.forEach((t) => {
      const regId = String(t.registrationId);
      if (!trackingByRegId[regId]) trackingByRegId[regId] = [];
      trackingByRegId[regId].push(t);
    });

    let masterData = allRegistrations.map((reg) => {
      const regId = String(reg._id);
      const events = trackingByRegId[regId] || [];

      const isPresent = events.some((ev) => ev.entryStatus === "PRESENT");
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
    await ParticipantCorrection.deleteMany({ registrationId });

    return res.redirect(
      "/corrections?success=" + encodeURIComponent(`Ticket #${reg.ticketId} and associated records deleted permanently.`)
    );
  } catch (err) {
    return res.redirect("/corrections?error=" + encodeURIComponent(err.message));
  }
});

// ======================================
// Event Day Desk Routes (Auto Sequential Tokens & Mark All)
// ======================================
app.get("/desk", requireAuth, async (req, res) => {
  res.render("desk", {
    staff: req.session.staff,
    operatorTitle: req.session.staff.role === "ADMIN" ? "Super Admin" : "Desk Operator",
  });
});

// Search participant by Ticket ID, Phone, Slot, or Name (Supports Multiple Participants and Filters)
app.get("/api/desk/search", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const eventFilter = (req.query.eventId || "").trim();
    const categoryFilter = (req.query.category || "").trim();
    const statusFilter = (req.query.status || "").trim();

    if (!q) return res.json({ success: true, participant: null, participants: [] });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const matchedCorrections = await ParticipantCorrection.find({ correctedName: regex }).lean();
    const correctionRegIds = matchedCorrections.map((c) => c.registrationId);

    const baseOr = [
      { mobile: regex },
      { ticketId: regex },
      { teamSlot: regex },
      { fullName: regex },
    ];
    if (correctionRegIds.length > 0) {
      baseOr.push({ _id: { $in: correctionRegIds } });
    }

    const mongoFilter = { $or: baseOr };

    if (categoryFilter) {
      mongoFilter.category = new RegExp(`^${categoryFilter}$`, "i");
    }
    if (statusFilter) {
      mongoFilter.status = statusFilter.toUpperCase();
    }
    if (eventFilter) {
      mongoFilter.$and = mongoFilter.$and || [];
      mongoFilter.$and.push({
        $or: [
          { eventId: eventFilter },
          { "events.id": eventFilter },
          { eventName: new RegExp(eventFilter, "i") },
        ],
      });
    }

    const registrations = await Registration.find(mongoFilter).sort({ createdAt: -1 }).limit(50).lean();

    if (!registrations || registrations.length === 0) {
      return res.json({ success: true, participant: null, participants: [] });
    }

    const regIds = registrations.map((r) => r._id);

    // Ensure all enrolled events have EventTracking documents initialized
    const trackingOps = [];
    for (const r of registrations) {
      if (Array.isArray(r.events) && r.events.length > 0) {
        for (const ev of r.events) {
          trackingOps.push({
            updateOne: {
              filter: { registrationId: r._id, eventId: ev.id },
              update: {
                $setOnInsert: {
                  ticketId: r.ticketId,
                  eventName: ev.name,
                  category: r.category ? r.category.toUpperCase() : "OPEN",
                  participantType: ev.participantType || "Solo",
                  teamName: ev.teamName || r.teamSlot || "",
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
    if (trackingOps.length > 0) {
      await EventTracking.bulkWrite(trackingOps, { ordered: false });
    }

    const [allTrackings, allCorrections] = await Promise.all([
      EventTracking.find({ registrationId: { $in: regIds } }).lean(),
      ParticipantCorrection.find({ registrationId: { $in: regIds } }).lean(),
    ]);

    const trackingMap = {};
    allTrackings.forEach((t) => {
      const key = String(t.registrationId);
      if (!trackingMap[key]) trackingMap[key] = [];
      trackingMap[key].push({
        ...t,
        id: t._id,
        trackingId: t._id,
        _id: t._id,
      });
    });

    const correctionMap = {};
    allCorrections.forEach((c) => {
      correctionMap[String(c.registrationId)] = c.correctedName;
    });

    const participantsList = registrations.map((registration) => {
      const regIdStr = String(registration._id);
      const formattedEvents = trackingMap[regIdStr] || [];
      const correctedName = correctionMap[regIdStr] || "";

      return {
        participant: {
          id: registration._id,
          fullName: registration.fullName,
          correctedName: correctedName,
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
      };
    });

    return res.json({
      success: true,
      participant: participantsList[0].participant,
      events: participantsList[0].events,
      participants: participantsList,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update or Clear Corrected Name via ParticipantCorrection
app.post("/api/desk/update-name", requireAuth, async (req, res) => {
  try {
    const { registrationId, ticketId, correctedName } = req.body;
    const operatorName = req.session?.staff?.email || "Desk Operator";

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({ success: false, message: "Valid registration ID required." });
    }

    const cleanName = (correctedName || "").trim();
    const reg = await Registration.findById(registrationId);

    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found." });
    }

    if (cleanName) {
      await ParticipantCorrection.findOneAndUpdate(
        { registrationId: reg._id },
        {
          $set: {
            ticketId: reg.ticketId,
            registrationId: reg._id,
            originalName: reg.fullName,
            correctedName: cleanName,
            correctedBy: operatorName,
          },
        },
        { returnDocument: "after", upsert: true }
      );
    } else {
      await ParticipantCorrection.deleteOne({ registrationId: reg._id });
    }

    return res.json({
      success: true,
      message: cleanName ? `Name updated to: ${cleanName}` : "Reset to original name.",
      correctedName: cleanName,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Mark Single Event Present with Automated Sequential Token
app.post("/api/desk/mark-present", requireAuth, async (req, res) => {
  try {
    const trackingId = req.body.trackingId || req.body.id || req.body._id;
    const optionalCorrectedName = (req.body.correctedName || "").trim();
    const operatorName = req.session?.staff?.email || "Desk Operator";

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

    let tokenVal = tracking.tokenNumber;
    if (!tokenVal || tokenVal.trim() === "") {
      tokenVal = await getNextEventToken(tracking.eventId, tracking.eventName);
    }

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
      { returnDocument: "after" }
    );

    if (optionalCorrectedName) {
      const reg = await Registration.findById(tracking.registrationId);
      if (reg) {
        await ParticipantCorrection.findOneAndUpdate(
          { registrationId: reg._id },
          {
            $set: {
              ticketId: reg.ticketId,
              registrationId: reg._id,
              originalName: reg.fullName,
              correctedName: optionalCorrectedName,
              correctedBy: operatorName,
            },
          },
          { returnDocument: "after", upsert: true }
        );
      }
    }

    if (typeof ActivityLog !== "undefined" && ActivityLog) {
      try {
        const allowedTypes = ActivityLog.schema?.path("activityType")?.enumValues || [];
        const chosenType = allowedTypes.includes("DESK_CHECKIN")
          ? "DESK_CHECKIN"
          : (allowedTypes[0] || "STAGE_STATUS_CHANGE");

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
          remarks: `Auto Token ${tokenVal} assigned and marked present at desk`,
        });
      } catch (logErr) {
        console.warn("ActivityLog write skipped:", logErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Check-in successful",
      tokenNumber: updatedTracking.tokenNumber,
      correctedName: optionalCorrectedName,
      tracking: updatedTracking,
    });
  } catch (err) {
    console.error("Desk Check-in Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Mark All Events Present in 1-Click
app.post("/api/desk/mark-all-present", requireAuth, async (req, res) => {
  try {
    const { registrationId, correctedName } = req.body;
    const optionalCorrectedName = (correctedName || "").trim();
    const operatorName = req.session?.staff?.email || "Desk Operator";

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({ success: false, message: "Valid registration ID required." });
    }

    const pendingTrackings = await EventTracking.find({
      registrationId,
      entryStatus: { $ne: "PRESENT" },
    });

    if (!pendingTrackings || pendingTrackings.length === 0) {
      return res.json({ success: true, message: "All events are already marked present.", tokens: [] });
    }

    const issuedTokens = [];

    for (const tracking of pendingTrackings) {
      let tokenVal = tracking.tokenNumber;
      if (!tokenVal || tokenVal.trim() === "") {
        tokenVal = await getNextEventToken(tracking.eventId, tracking.eventName);
      }

      await EventTracking.findByIdAndUpdate(
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
        { returnDocument: "after" }
      );

      issuedTokens.push({ eventName: tracking.eventName, token: tokenVal });
    }

    if (optionalCorrectedName) {
      const reg = await Registration.findById(registrationId);
      if (reg) {
        await ParticipantCorrection.findOneAndUpdate(
          { registrationId: reg._id },
          {
            $set: {
              ticketId: reg.ticketId,
              registrationId: reg._id,
              originalName: reg.fullName,
              correctedName: optionalCorrectedName,
              correctedBy: operatorName,
            },
          },
          { returnDocument: "after", upsert: true }
        );
      }
    }

    return res.json({
      success: true,
      message: "All events checked in successfully!",
      tokens: issuedTokens,
      correctedName: optionalCorrectedName,
    });
  } catch (err) {
    console.error("Mark All Present Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Event Coordinator Dashboard Routes (Renders desk.ejs)
// ----------------------------------------------------
app.get("/coordinator", requireAuth, (req, res) => {
  res.render("desk", {
    staff: req.session.staff,
    operatorTitle: req.session.staff.role === "ADMIN" ? "Super Admin" : "Event Coordinator Desk",
  });
});

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

app.get('/rules', requireAuth, async (req, res) => {
  res.render('rules', {
    pageTitle: 'Navchetna Yuva Mahotsav - Event Rules & Schedule'
  });
});

app.get('/dance', async (req, res) => {
  res.render('dance', {
    pageTitle: 'Navchetna Yuva Mahotsav - Event Rules & Schedule'
  });
});

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

function requireStageAuth(req, res, next) {
  if (!req.session || !req.session.stageEvent) {
    return res.redirect("/stage/login?error=" + encodeURIComponent("Please enter your event access code first."));
  }
  next();
}

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

app.get("/stage/dashboard", requireStageAuth, async (req, res) => {
  try {
    const activeEvent = req.session.stageEvent;
    const aliases = activeEvent.aliases || [activeEvent.eventId, activeEvent.eventCode];
    const baseKeyword = activeEvent.eventCode.toLowerCase();
    const nameRegex = new RegExp(baseKeyword, "i");

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
    const [registrations, corrections] = await Promise.all([
      Registration.find({ _id: { $in: regIds } }).lean(),
      ParticipantCorrection.find({ registrationId: { $in: regIds } }).lean(),
    ]);

    const regMap = new Map(registrations.map((r) => [String(r._id), r]));
    const correctionMap = new Map(corrections.map((c) => [String(c.registrationId), c.correctedName]));

    const participants = trackings.map((t, idx) => {
      const reg = regMap.get(String(t.registrationId)) || {};
      const displayToken =
        t.tokenNumber && t.tokenNumber.trim() !== ""
          ? t.tokenNumber
          : `${activeEvent.prefix}${idx + 1}`;

      const activeName = correctionMap.get(String(t.registrationId)) || reg.fullName || "Participant";

      return {
        trackingId: t._id,
        ticketId: t.ticketId || reg.ticketId || "N/A",
        tokenNumber: displayToken,
        fullName: activeName,
        registeredName: reg.fullName || "",
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

app.post("/stage/update-status", requireStageAuth, async (req, res) => {
  try {
    const { trackingId, stageStatus } = req.body;

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

    const updated = await EventTracking.findByIdAndUpdate(
      trackingId,
      { $set: updateDoc },
      { returnDocument: "after" }
    );

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

// ======================================
// 404 Handler & Server Startup
// ======================================
app.use((req, res) => res.status(404).render("404"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
