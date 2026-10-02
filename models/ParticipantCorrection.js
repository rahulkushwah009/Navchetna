<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Event Day Entry Desk | Navchetna 2026</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <!-- Inter Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'] },
          colors: {
            brand: { 800: '#1e3a8a', 900: '#0f172a' }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', sans-serif; }
    .tap-active:active { transform: scale(0.98); }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn { animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  </style>
</head>

<body class="bg-slate-100 text-slate-800 min-h-screen flex flex-col antialiased">

  <!-- ================= TOP HEADER ================= -->
  <header class="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
      
      <!-- Brand Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950 font-black">
          <i class="fa-solid fa-fire text-lg"></i>
        </div>
        <div>
          <div class="text-[10px] tracking-widest uppercase font-bold text-orange-400">Gurukul Dream Foundation</div>
          <h1 class="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
            Navchetna 2026
            <span class="hidden sm:inline-block text-[11px] font-normal text-slate-400">| Yuva Shakti Mahotsav</span>
          </h1>
        </div>
      </div>

      <!-- Quick Role Info / Logout -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="font-bold text-slate-200"><%= staff.role === 'ADMIN' ? 'Super Admin' : 'Desk Operator' %></span>
          <span class="text-slate-400 hidden sm:inline">(<%= staff.email %>)</span>
        </div>
        <a href="/logout" class="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition" title="Logout">
          <i class="fa-solid fa-key"></i>
        </a>
      </div>
    </div>

    <!-- Top Quick Bar with Search Trigger -->
    <div class="bg-slate-950 px-4 py-2 border-t border-slate-800/80">
      <div class="max-w-7xl mx-auto flex items-center gap-2">
        <div class="relative flex-1">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input 
            type="text" 
            id="topSearchInput" 
            onkeydown="if(event.key === 'Enter') triggerTopSearch()"
            placeholder="Search: Type phone, ticket, slot, or name and press Enter..."
            class="w-full bg-slate-900 text-white placeholder-slate-400 pl-9 pr-8 py-2 rounded-xl text-xs md:text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            autocomplete="off"
          >
        </div>
        <button onclick="triggerTopSearch()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-900/30 tap-active transition">
          <i class="fa-solid fa-magnifying-glass"></i> Search
        </button>
      </div>
    </div>

    <!-- ================= NAVBAR ================= -->
    <nav class="bg-slate-950 border-t border-slate-800/80 px-4 overflow-x-auto">
      <div class="max-w-7xl mx-auto flex items-center space-x-1 text-xs font-semibold whitespace-nowrap">
        <a href="/dashboard" class="px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
          <i class="fa-solid fa-chart-pie"></i> Admin Overview
        </a>
        <a href="/desk" class="px-4 py-3 border-b-2 border-blue-500 text-blue-400 flex items-center gap-2">
          <i class="fa-solid fa-id-card"></i> Event Day Desk
        </a>
        <a href="/distribution" class="px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
          <i class="fa-solid fa-network-wired"></i> Contact Distribution
        </a>
        <a href="/corrections" class="px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
          <i class="fa-solid fa-clipboard-check"></i> Master Desk
        </a>
      </div>
    </nav>
  </header>

  <!-- ================= MAIN DESK CONTAINER ================= -->
  <main class="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 space-y-4">

    <!-- High Speed Desk Search Banner -->
    <div class="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800 uppercase tracking-wider">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Auto-Token Speed Desk
          </div>
          <h2 class="text-xl font-extrabold tracking-tight mt-1 text-white">Event Day Entry Desk</h2>
          <p class="text-xs text-slate-400">Search by complete mobile number, slot, or ticket code. Correct name option available on the spot.</p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-xs text-slate-400">Desk Operator:</span>
          <span class="text-xs font-bold bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-200">
            <%= staff.email %>
          </span>
        </div>
      </div>

      <!-- Main Search Box (Triggered on Enter or Button Click) -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i class="fa-solid fa-bolt text-amber-400 text-base"></i>
          </div>
          <input 
            type="text" 
            id="deskSearchInput" 
            onkeydown="if(event.key === 'Enter') triggerSearch()"
            placeholder="Enter Mobile (e.g. 9826...), Slot (6914), Ticket (NYSM26-...), or Name..." 
            class="w-full bg-slate-800 text-white text-base sm:text-lg font-medium pl-12 pr-10 py-3.5 rounded-xl border-2 border-emerald-500/80 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition placeholder-slate-400"
            autocomplete="off"
            autofocus
          >
          <button 
            id="clearDeskSearchBtn" 
            onclick="clearDeskSearch()" 
            class="hidden absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white"
          >
            <i class="fa-solid fa-circle-xmark text-lg"></i>
          </button>
        </div>
        <button 
          onclick="triggerSearch()" 
          class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl text-sm sm:text-base font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-900/40 tap-active transition"
        >
          <i class="fa-solid fa-magnifying-glass"></i> Search
        </button>
      </div>

    </div>

    <!-- Ready for Next Participant State (Empty) -->
    <div id="deskEmptyState" class="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
      <div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-3">
        <i class="fa-solid fa-qrcode"></i>
      </div>
      <h3 class="text-sm font-bold text-slate-700">Ready for Next Participant</h3>
      <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
        Type full participant phone number or ticket ID above and click <strong>Search</strong>.
      </p>
    </div>

    <!-- Verified Participant Card -->
    <div id="deskActiveCard" class="hidden bg-white rounded-2xl border-2 border-blue-600 shadow-xl overflow-hidden animate-fadeIn">
      
      <!-- Top Dark Card Header -->
      <div class="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">VERIFIED PARTICIPANT</span>
          
          <div class="flex items-center gap-2 flex-wrap mt-0.5">
            <h3 id="cardParticipantName" class="text-lg sm:text-xl font-black text-white">Participant</h3>
            <span id="registeredOriginalBadge" class="hidden text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Reg: <span id="cardOriginalName"></span>
            </span>
          </div>

          <div class="text-xs text-slate-300 font-mono flex items-center gap-2 mt-1">
            <span>📱 <span id="cardMobile"></span></span>
            <span>|</span>
            <span>Slot: <strong id="cardSlot" class="text-white"></strong></span>
            <span>|</span>
            <span>Ticket: <strong id="cardTicket" class="text-white"></strong></span>
          </div>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button 
            id="markAllPresentBtn"
            onclick="markAllEventsPresent()" 
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md tap-active transition"
          >
            <i class="fa-solid fa-bolt"></i> Check-in All Events
          </button>
          <a href="/corrections" class="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
            <i class="fa-solid fa-pen-to-square"></i> Full Corrections
          </a>
        </div>
      </div>

      <!-- Quick Name Correction Bar (Stored in separate ParticipantCorrection schema) -->
      <div class="bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-user-pen text-amber-600"></i>
          <span class="font-bold text-amber-900">Name Correction (Optional):</span>
          <span class="text-amber-700 text-[11px]">If participant's registered name is wrong, write the correct name here:</span>
        </div>
        <div class="flex items-center gap-1.5">
          <input 
            type="text" 
            id="correctedNameInput" 
            placeholder="Type correct name..." 
            class="bg-white border border-amber-300 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 w-48 sm:w-60"
          >
          <button 
            onclick="saveCorrectedNameOnly()"
            class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0"
          >
            Save Name
          </button>
        </div>
      </div>

      <!-- Metadata Demographic Strip -->
      <div class="p-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">School / College</span>
            <strong id="cardSchool" class="text-slate-800 truncate block">School Not Specified</strong>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Class / Course</span>
            <strong id="cardClass" class="text-slate-800 block">Course Not Specified</strong>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Payment Status</span>
            <span id="cardPayment" class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[11px] mt-0.5">
              PAID
            </span>
          </div>
        </div>

        <!-- Enrolled Events Strip -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Enrolled Events &amp; Auto Token Assignment</h4>
            <span class="text-[11px] text-slate-500">Auto token format: 1 to 2000 per event</span>
          </div>
          <div id="enrolledEventsContainer" class="space-y-2">
            <!-- Dynamically injected event items -->
          </div>
        </div>
      </div>

    </div>

    <!-- Success Feedback Overlay Card (Fast Mode) -->
    <div id="deskSuccessState" class="hidden bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 text-center animate-fadeIn">
      <div class="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30 mb-3">
        <i class="fa-solid fa-check"></i>
      </div>
      <div class="text-xs font-bold text-emerald-800 uppercase tracking-widest">Entry Marked Successfully</div>
      <h3 id="successName" class="text-xl font-black text-slate-900 mt-1">Participant</h3>
      
      <div id="successTokensList" class="mt-3 flex flex-wrap items-center justify-center gap-2">
        <!-- Tokens rendered here -->
      </div>
      
      <p class="text-xs text-emerald-700 mt-3">Participant is confirmed Present. Live status synced with Stage Coordinator.</p>
      <div class="mt-5">
        <button onclick="resetDeskForNext()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md tap-active transition">
          Next Entry (Press Enter / Space) →
        </button>
      </div>
    </div>

  </main>

  <!-- Client-side Logic -->
  <script>
    let currentParticipant = null;
    let currentEvents = [];

    function triggerTopSearch() {
      const topVal = document.getElementById("topSearchInput").value;
      document.getElementById("deskSearchInput").value = topVal;
      triggerSearch();
    }

    function focusMainSearch() {
      const mainInput = document.getElementById("deskSearchInput");
      mainInput.focus();
      mainInput.select();
    }

    function clearDeskSearch() {
      document.getElementById("deskSearchInput").value = "";
      document.getElementById("topSearchInput").value = "";
      document.getElementById("clearDeskSearchBtn").classList.add("hidden");
      resetToEmptyState();
      focusMainSearch();
    }

    function resetToEmptyState() {
      document.getElementById("deskActiveCard").classList.add("hidden");
      document.getElementById("deskSuccessState").classList.add("hidden");
      document.getElementById("deskEmptyState").classList.remove("hidden");
      currentParticipant = null;
      currentEvents = [];
    }

    function resetDeskForNext() {
      clearDeskSearch();
    }

    async function triggerSearch() {
      const query = document.getElementById("deskSearchInput").value.trim();
      const clearBtn = document.getElementById("clearDeskSearchBtn");

      if (!query) {
        clearBtn.classList.add("hidden");
        resetToEmptyState();
        return;
      }
      clearBtn.classList.remove("hidden");

      try {
        const res = await fetch(`/api/desk/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!data.success || !data.participant) {
          alert("No participant found matching: " + query);
          resetToEmptyState();
          return;
        }

        renderParticipantCard(data.participant, data.events || []);
      } catch (err) {
        console.error("Search error:", err);
        alert("Search request failed.");
      }
    }

    function renderParticipantCard(participant, events) {
      currentParticipant = participant;
      currentEvents = events;

      document.getElementById("deskEmptyState").classList.add("hidden");
      document.getElementById("deskSuccessState").classList.add("hidden");
      document.getElementById("deskActiveCard").classList.remove("hidden");

      // Display corrected name if present from ParticipantCorrection
      const hasCorrection = participant.correctedName && participant.correctedName.trim() !== "";
      const activeDisplayName = hasCorrection ? participant.correctedName : participant.fullName;

      document.getElementById("cardParticipantName").textContent = activeDisplayName;
      
      const origBadge = document.getElementById("registeredOriginalBadge");
      if (hasCorrection && participant.correctedName !== participant.fullName) {
        origBadge.classList.remove("hidden");
        document.getElementById("cardOriginalName").textContent = participant.fullName;
      } else {
        origBadge.classList.add("hidden");
      }

      document.getElementById("correctedNameInput").value = participant.correctedName || "";

      document.getElementById("cardMobile").textContent = participant.mobile;
      document.getElementById("cardSlot").textContent = participant.teamSlot;
      document.getElementById("cardTicket").textContent = participant.ticketId;
      document.getElementById("cardSchool").textContent = participant.school || "School Not Specified";
      document.getElementById("cardClass").textContent = participant.classCourse || "N/A";
      document.getElementById("cardPayment").textContent = `₹${participant.amount} ${participant.status}`;

      const eventsContainer = document.getElementById("enrolledEventsContainer");
      eventsContainer.innerHTML = "";

      if (events.length === 0) {
        eventsContainer.innerHTML = `<div class="p-3 text-xs text-slate-400 bg-slate-50 rounded-xl">No enrolled events found for this registration.</div>`;
        return;
      }

      events.forEach((ev) => {
        const isPresent = ev.entryStatus === "PRESENT";
        const tokenDisplay = ev.tokenNumber && ev.tokenNumber.trim() !== "" ? ev.tokenNumber : "Not Issued";

        const item = document.createElement("div");
        item.className = "p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3";

        item.innerHTML = `
          <div>
            <div class="font-extrabold text-slate-900 text-xs sm:text-sm">${ev.eventName}</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Category: <strong>${ev.category}</strong></span>
              <span>•</span>
              <span class="font-mono font-bold ${isPresent ? 'text-emerald-700' : 'text-amber-700'}">
                Status: ${isPresent ? "PRESENT" : "PENDING ENTRY"}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            ${isPresent ? `
              <div class="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300">
                <i class="fa-solid fa-check text-emerald-700"></i>
                <span class="text-xs font-mono font-black">TOKEN: ${tokenDisplay}</span>
              </div>
              <span class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <i class="fa-solid fa-circle-check"></i> Present
              </span>
            ` : `
              <button 
                onclick="markPresent('${ev._id}', '${ev.eventName}')"
                class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-md tap-active transition"
              >
                <i class="fa-solid fa-check"></i> Generate Token &amp; Mark Present
              </button>
            `}
          </div>
        `;

        eventsContainer.appendChild(item);
      });
    }

    async function saveCorrectedNameOnly() {
      if (!currentParticipant || !currentParticipant.id) return;
      const correctedName = document.getElementById("correctedNameInput").value.trim();

      try {
        const res = await fetch("/api/desk/update-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            registrationId: currentParticipant.id, 
            ticketId: currentParticipant.ticketId, 
            correctedName 
          }),
        });

        const data = await res.json();
        if (data.success) {
          currentParticipant.correctedName = data.correctedName;
          const activeName = data.correctedName || currentParticipant.fullName;
          document.getElementById("cardParticipantName").textContent = activeName;
          
          const origBadge = document.getElementById("registeredOriginalBadge");
          if (data.correctedName && data.correctedName !== currentParticipant.fullName) {
            origBadge.classList.remove("hidden");
            document.getElementById("cardOriginalName").textContent = currentParticipant.fullName;
          } else {
            origBadge.classList.add("hidden");
          }

          alert(data.message);
        } else {
          alert(data.message || "Failed to save corrected name.");
        }
      } catch (err) {
        alert("Server error saving corrected name.");
      }
    }

    async function markPresent(trackingId, eventName) {
      const correctedName = document.getElementById("correctedNameInput").value.trim();

      try {
        const res = await fetch("/api/desk/mark-present", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            trackingId, 
            correctedName,
            registrationId: currentParticipant?.id,
            ticketId: currentParticipant?.ticketId 
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.message || "Failed to mark present");
          return;
        }

        const activeName = data.correctedName || (currentParticipant ? currentParticipant.fullName : "Participant");
        showSuccessScreen([{ eventName, token: data.tokenNumber }], activeName);
      } catch (err) {
        alert("Server error marking present.");
      }
    }

    async function markAllEventsPresent() {
      if (!currentParticipant || !currentParticipant.id) return;
      const correctedName = document.getElementById("correctedNameInput").value.trim();

      try {
        const res = await fetch("/api/desk/mark-all-present", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            registrationId: currentParticipant.id, 
            ticketId: currentParticipant.ticketId, 
            correctedName 
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.message || "Failed to check in all events");
          return;
        }

        const activeName = data.correctedName || (currentParticipant ? currentParticipant.fullName : "Participant");
        showSuccessScreen(data.tokens || [], activeName);
      } catch (err) {
        alert("Server error marking all events present.");
      }
    }

    function showSuccessScreen(tokens, activeName) {
      document.getElementById("deskActiveCard").classList.add("hidden");
      document.getElementById("deskSuccessState").classList.remove("hidden");
      document.getElementById("successName").textContent = activeName;
      
      const tokensContainer = document.getElementById("successTokensList");
      tokensContainer.innerHTML = "";

      if (tokens.length === 0) {
        tokensContainer.innerHTML = `<span class="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold">Already Checked In</span>`;
      } else {
        tokens.forEach(t => {
          const badge = document.createElement("div");
          badge.className = "bg-emerald-100 border border-emerald-300 text-emerald-950 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5";
          badge.innerHTML = `<span class="text-slate-600">${t.eventName}:</span> <strong class="text-emerald-900">${t.token}</strong>`;
          tokensContainer.appendChild(badge);
        });
      }
    }

    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !document.getElementById("deskSuccessState").classList.contains("hidden")) {
        e.preventDefault();
        resetDeskForNext();
      }
    });
  </script>
</body>
</html>
