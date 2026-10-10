require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: "uploads/" });

app.use(
  session({
    secret: process.env.SESSION_SECRET || "navchetna_staff_secret_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// ======================================
// Models
// ======================================
const Staff = require("./models/Staff");
const AssignedLead = require("./models/AssignedLead");

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
    fullName: { type: String, default: "", trim: true },
    mobile: { type: String, default: "", trim: true },
    school: { type: String, default: "", trim: true },
    classCourse: { type: String, default: "", trim: true },
    age: { type: Number, default: 18 },
    teamSlot: { type: String, default: "", trim: true },
    category: { type: String, default: "Senior" },
    gender: { type: String, default: "Other" },
    reference: { type: String, default: "" },
    eventName: { type: String, default: "" },
    events: [selectedEventSchema],
    amount: { type: Number, default: 0 },
    waivedAmount: { type: Number, default: 0 },
    secretCode: { type: String, default: "" },
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

const Registration =
  mongoose.models.Registration || mongoose.model("Registration", registrationSchema);

// Database Connection
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

// App Middlewares
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(methodOverride("_method"));

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

// Basic public routes (Registration routes removed)
app.get("/", (req, res) => res.render("homePage"));

// ======================================
// Staff Onboarding & Auth
// ======================================
app.get("/staff", requireAdmin, async (req, res) => {
  try {
    const staffList = await Staff.find({}).sort({ createdAt: -1 });
    res.render("staff", {
      staffList,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Error loading staff: " + err.message);
  }
});

app.post("/staff", requireAdmin, async (req, res) => {
  try {
    const { email, secretCode, role } = req.body;
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
      return res.redirect("/staff?error=" + encodeURIComponent("Email or Secret Code already exists."));
    }

    await Staff.create({
      email: cleanEmail,
      secretCode: cleanCode,
      role: normalizedRole,
    });

    res.redirect("/staff?success=" + encodeURIComponent(`${normalizedRole} account created successfully!`));
  } catch (err) {
    res.redirect("/staff?error=" + encodeURIComponent(err.message));
  }
});

app.post("/staff/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.redirect("/staff?success=" + encodeURIComponent("Staff access removed."));
  } catch (err) {
    res.redirect("/staff?error=" + encodeURIComponent(err.message));
  }
});

app.get("/login", (req, res) => {
  if (req.session && req.session.staff) {
    return res.redirect(req.session.staff.role === "ADMIN" ? "/dashboard" : "/coordinator/leads");
  }
  res.render("login", { error: req.query.error || null });
});

// LOGIN WITH EMAIL OR SECRET CODE
app.post("/login", async (req, res) => {
  try {
    const { email, secretCode } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanCode = secretCode ? secretCode.trim().toUpperCase() : "";

    if (!cleanEmail && !cleanCode) {
      return res.redirect("/login?error=" + encodeURIComponent("Please enter either your Email or Secret Code."));
    }

    // Build conditional query to match either or both
    const queryConditions = [];
    if (cleanEmail) queryConditions.push({ email: cleanEmail });
    if (cleanCode) queryConditions.push({ secretCode: cleanCode });

    const staff = await Staff.findOne({
      $or: queryConditions,
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
    };

    if (staff.role === "ADMIN") {
      return res.redirect("/dashboard");
    } else {
      return res.redirect("/coordinator/leads");
    }
  } catch (err) {
    return res.redirect("/login?error=" + encodeURIComponent("Login error: " + err.message));
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ======================================
// Streamlined Admin Dashboard (Excel Distributor)
// ======================================
app.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const activeStaff = await Staff.find({ role: "COORDINATOR", isActive: true })
      .sort({ email: 1 })
      .lean();

    const [totalLeads, leadStats] = await Promise.all([
      AssignedLead.countDocuments({}),
      AssignedLead.aggregate([
        {
          $group: {
            _id: "$assignedStaffEmail",
            total: { $sum: 1 },
            contacted: {
              $sum: {$cond: [{ $ne: ["$callStatus", "PENDING"] }, 1, 0] },
            },
            completed: {
              $sum: {$cond: [{ $eq: ["$callStatus", "COMPLETED"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    res.render("admin-upload-distribute", {
      staff: req.session.staff,
      activeStaff,
      totalLeads,
      leadStats,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res.status(500).send("Dashboard Error: " + err.message);
  }
});

// Helper: Safely pick clean values, fallback to alternatives, or provide a default
function cleanField(val, fallback = "-") {
  if (val === undefined || val === null) return fallback;
  const str = String(val).trim();
  if (str === "" || str.toLowerCase() === "nan" || str === "-" || str.toLowerCase() === "null") {
    return fallback;
  }
  return str;
}

// Upload CSV/Excel -> Auto-Resolves Missing/NaN/Empty Data -> Wipes Old Leads -> Assigns Evenly
app.post("/admin/upload-distribute", requireAdmin, upload.single("sheetFile"), async (req, res) => {
  if (!req.file) {
    return res.redirect("/dashboard?error=" + encodeURIComponent("Please select a valid CSV/Excel file."));
  }

  const filePath = req.file.path;
  const rows = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        const coordinators = await Staff.find({
          role: "COORDINATOR",
          isActive: true,
        }).sort({ email: 1 });

        if (coordinators.length === 0) {
          return res.redirect(
            "/dashboard?error=" + encodeURIComponent("No active coordinators found to distribute leads.")
          );
        }

        if (rows.length === 0) {
          return res.redirect("/dashboard?error=" + encodeURIComponent("The uploaded sheet is empty."));
        }

        // 1. Collect all ticket IDs to pre-fetch any missing information from database
        const ticketIds = rows
          .map((r) => cleanField(r["Ticket ID"] || r["TicketId"] || r["ticketId"] || r["Ticket"], ""))
          .filter(Boolean);

        const existingRegistrations = await Registration.find({ ticketId: { $in: ticketIds } }).lean();
        const regMap = new Map(existingRegistrations.map((r) => [r.ticketId, r]));

        // 2. WIPE ALL PREVIOUS LEADS FROM DATABASE
        const deleteResult = await AssignedLead.deleteMany({});
        console.log(`Purged ${deleteResult.deletedCount} old leads from database.`);

        // 3. EQUAL ROUND-ROBIN DISTRIBUTION WITH ROBUST FALLBACKS
        const batchId = `BATCH-${Date.now()}`;
        const leadDocs = [];

        rows.forEach((row, index) => {
          const assignedStaff = coordinators[index % coordinators.length];

          const ticketId = cleanField(row["Ticket ID"] || row["TicketId"] || row["ticketId"] || row["Ticket"], "-");
          const dbReg = regMap.get(ticketId) || {};

          const rawFullName = cleanField(row["Full Name"] || row["Name"] || row["fullName"], "");
          const rawOriginalName = cleanField(row["Original Name"] || row["originalName"], "");
          const finalName = rawFullName || rawOriginalName || dbReg.fullName || "Participant";

          const finalMobile = cleanField(
            row["Mobile"] || row["Phone"] || row["Contact"] || row["mobile"],
            dbReg.mobile || "-"
          );

          const finalSchool = cleanField(
            row["School / College"] || row["School"] || row["College"] || row["Institution"],
            dbReg.school || "-"
          );

          const finalEventName = cleanField(
            row["Event Name"] || row["Event"] || row["eventName"],
            dbReg.eventName || "General Event"
          );

          const finalCategory = cleanField(row["Category"] || row["category"], dbReg.category || "GENERAL");
          const finalTeamSlot = cleanField(row["Team / Slot"] || row["TeamSlot"] || row["Slot"], dbReg.teamSlot || "-");
          const finalToken = cleanField(row["Token Number"] || row["Token"] || row["tokenNumber"], "-");
          const finalStageStatus = cleanField(row["Stage Status"] || row["stageStatus"], "WAITING_BACKSTAGE");
          const finalPerformed = cleanField(row["Performed?"] || row["Performed"] || row["performed"], "NO");
          const finalCheckIn = cleanField(row["Check-in Time"] || row["CheckInTime"], "-");
          const finalMarkedBy = cleanField(row["Marked By"] || row["MarkedBy"], "-");

          leadDocs.push({
            sNo: cleanField(row["S.No"] || row["SNo"], `${index + 1}`),
            tokenNumber: finalToken,
            ticketId: ticketId,
            fullName: finalName,
            originalName: rawOriginalName || rawFullName || finalName,
            mobile: finalMobile,
            schoolCollege: finalSchool,
            eventName: finalEventName,
            category: finalCategory,
            teamSlot: finalTeamSlot,
            stageStatus: finalStageStatus,
            performed: finalPerformed,
            checkInTime: finalCheckIn,
            markedBy: finalMarkedBy,
            assignedStaffId: assignedStaff._id,
            assignedStaffEmail: assignedStaff.email,
            callStatus: "PENDING",
            staffNotes: "",
            batchId,
          });
        });

        await AssignedLead.insertMany(leadDocs);

        return res.redirect(
          "/dashboard?success=" +
            encodeURIComponent(
              `Purged ${deleteResult.deletedCount} old entries. Distributed ${rows.length} records evenly among ${coordinators.length} staff coordinators!`
            )
        );
      } catch (err) {
        console.error("Distribution Error:", err);
        return res.redirect("/dashboard?error=" + encodeURIComponent("Database Error: " + err.message));
      }
    })
    .on("error", (err) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.redirect("/dashboard?error=" + encodeURIComponent("CSV Parse Error: " + err.message));
    });
});

// Admin: Clear leads directly without uploading
app.post("/admin/clear-all-leads", requireAdmin, async (req, res) => {
  try {
    const deleted = await AssignedLead.deleteMany({});
    return res.redirect(
      "/dashboard?success=" + encodeURIComponent(`All ${deleted.deletedCount} assigned leads have been cleared.`)
    );
  } catch (err) {
    return res.redirect("/dashboard?error=" + encodeURIComponent(err.message));
  }
});

// ======================================
// Staff Coordinator Calling Sheet
// ======================================
app.get("/coordinator/leads", requireAuth, async (req, res) => {
  try {
    const staffId = req.session.staff.id;
    const leads = await AssignedLead.find({ assignedStaffId: staffId })
      .sort({ createdAt: 1 })
      .lean();

    res.render("coordinator-leads", {
      staff: req.session.staff,
      leads,
    });
  } catch (err) {
    res.status(500).send("Error loading calling sheet: " + err.message);
  }
});

app.post("/api/coordinator/update-lead-status", requireAuth, async (req, res) => {
  try {
    const { leadId, callStatus, staffNotes } = req.body;
    await AssignedLead.findOneAndUpdate(
      { _id: leadId, assignedStaffId: req.session.staff.id },
      { $set: { callStatus, staffNotes } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 & Startup
app.use((req, res) => res.status(404).render("404"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
