// admin-reports.js — FULL VERSION WITH SUMMARY & READINESS

import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// Enforce admin access
requireAdmin();

// Attach logout handler
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutAdmin);
});

// ================================================
// Build Event Lookup Map
// ================================================
async function buildEventLookup() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, start_time, end_time");

  if (error) {
    console.error("Error loading events for lookup:", error);
    return {};
  }

  const map = {};
  events.forEach(e => {
    map[e.id] = {
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time || ""
    };
  });

  return map;
}

// ================================================
// Load events into dropdown
// ================================================
async function loadEvents() {
  const eventSelect = document.getElementById("eventSelect");

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events:", error);
    eventSelect.innerHTML = `<option>Error loading events</option>`;
    return;
  }

  if (!events.length) {
    eventSelect.innerHTML = `<option>No events found</option>`;
    return;
  }

  eventSelect.innerHTML = events
    .map(e => `<option value="${e.id}">${e.title}</option>`)
    .join("");

  loadPreview(eventSelect.value);

  eventSelect.addEventListener("change", () => {
    loadPreview(eventSelect.value);
  });
}

// ================================================
// Basic signup preview (per event)
// ================================================
async function loadPreview(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading signups…";

  const { data: signups, error } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error loading preview:", error);
    preview.textContent = "Error loading data.";
    return;
  }

  if (!signups.length) {
    preview.textContent = "No signups yet.";
    return;
  }

  const rowsHtml = signups
    .map(s => `
      <tr>
        <td>${s.full_name}</td>
        <td>${s.email || ""}</td>
        <td>${s.checked_in ? "✅" : "❌"}</td>
      </tr>
    `)
    .join("");

  preview.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Checked In</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ================================================
// Helper: Build Slot Data with Attached Signups
// ================================================
async function buildSlotData(eventId) {
  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("*")
    .eq("event_id", eventId);

  if (slotErr) {
    console.error("Error loading slots:", slotErr);
    return [];
  }

  const { data: signups, error: signupErr } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId);

  if (signupErr) {
    console.error("Error loading signups:", signupErr);
    return [];
  }

  const signupMap = {};
  signups.forEach(s => {
    if (!signupMap[s.slot_id]) signupMap[s.slot_id] = [];
    signupMap[s.slot_id].push(s);
  });

  const finalSlots = slots.map(slot => ({
    ...slot,
    signups: signupMap[slot.id] || []
  }));

  return finalSlots;
}

// ================================================
// EVENT SUMMARY (PER EVENT)
// ================================================
async function loadEventSummary(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading event summary…";

  const [slots, signupsRes, eventLookup] = await Promise.all([
    buildSlotData(eventId),
    supabase.from("signups").select("*").eq("event_id", eventId),
    buildEventLookup()
  ]);

  const signups = signupsRes.data || [];

  if (!slots.length && !signups.length) {
    preview.textContent = "No data found for this event.";
    return;
  }

  const eventMeta = eventLookup[eventId] || {};

  const totalSlots = slots.length;
  const totalSignups = signups.length;

  let neededTotal = 0;
  let filledTotal = 0;
  let emptySlots = 0;
  let partialSlots = 0;
  let fullSlots = 0;

  slots.forEach(slot => {
    const needed = slot.quantity || 0;
    const filled = slot.signups.length;
    neededTotal += needed;
    filledTotal += filled;

    if (needed === 0 && filled === 0) {
      // ignore weird zero/zero cases in classification
      emptySlots += 1;
    } else if (filled === 0) {
      emptySlots += 1;
    } else if (filled < needed) {
      partialSlots += 1;
    } else {
      fullSlots += 1;
    }
  });

  const avgFillPct =
    neededTotal > 0 ? Math.round((filledTotal / neededTotal) * 100) : 0;

  const checkedInCount = signups.filter(s => s.checked_in).length;
  const noShowCount = totalSignups - checkedInCount;
  const attendancePct =
    totalSignups > 0
      ? Math.round((checkedInCount / totalSignups) * 100)
      : 0;

  preview.innerHTML = `
    <div class="summary-block">
      <h3>Event Info</h3>
      <table class="report-table">
        <tbody>
          <tr><th>Title</th><td>${eventMeta.title || ""}</td></tr>
          <tr><th>Start Time</th><td>${eventMeta.start_time || ""}</td></tr>
          <tr><th>End Time</th><td>${eventMeta.end_time || ""}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="summary-block">
      <h3>Slots & Coverage</h3>
      <table class="report-table">
        <tbody>
          <tr><th>Total Slots</th><td>${totalSlots}</td></tr>
          <tr><th>Total Needed (All Slots)</th><td>${neededTotal}</td></tr>
          <tr><th>Total Filled (Signups)</th><td>${filledTotal}</td></tr>
          <tr><th>Average Fulfillment</th><td>${avgFillPct}%</td></tr>
          <tr><th>Fully Covered Slots</th><td>${fullSlots}</td></tr>
          <tr><th>Understaffed Slots</th><td>${partialSlots}</td></tr>
          <tr><th>Empty Slots</th><td>${emptySlots}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="summary-block">
      <h3>Attendance Snapshot</h3>
      <table class="report-table">
        <tbody>
          <tr><th>Total Signups</th><td>${totalSignups}</td></tr>
          <tr><th>Checked In</th><td>${checkedInCount}</td></tr>
          <tr><th>No-Shows</th><td>${noShowCount}</td></tr>
          <tr><th>Attendance Rate</th><td>${attendancePct}%</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

// ================================================
// READINESS DASHBOARD (PER EVENT)
// 3 sections: Critical / Understaffed / Fully Covered
// ================================================
async function loadReadinessDashboard(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading readiness dashboard…";

  const slots = await buildSlotData(eventId);

  if (!slots.length) {
    preview.textContent = "No slots found for this event.";
    return;
  }

  const critical = [];
  const under = [];
  const full = [];

  slots.forEach(slot => {
    const needed = slot.quantity || 0;
    const filled = slot.signups.length;
    const remaining = needed - filled;
    const pct = needed > 0 ? Math.round((filled / needed) * 100) : 0;

    const rowHtml = `
      <tr>
        <td>${slot.name}</td>
        <td>${slot.start_time || ""}</td>
        <td>${slot.end_time || ""}</td>
        <td>${needed}</td>
        <td>${filled}</td>
        <td>${remaining}</td>
        <td>${pct}%</td>
      </tr>
    `;

    if (needed > 0 && filled === 0) {
      critical.push(rowHtml);
    } else if (needed > 0 && filled < needed) {
      under.push(rowHtml);
    } else if (needed > 0 && filled >= needed) {
      full.push(rowHtml);
    }
  });

  const buildSection = (title, rows, emptyMessage, extraClass = "") => {
    if (!rows.length) {
      return `
        <div class="summary-block ${extraClass}">
          <h3>${title}</h3>
          <p>${emptyMessage}</p>
        </div>
      `;
    }

    return `
      <div class="summary-block ${extraClass}">
        <h3>${title}</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Start</th>
              <th>End</th>
              <th>Needed</th>
              <th>Filled</th>
              <th>Remaining</th>
              <th>% Filled</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  preview.innerHTML = `
    ${buildSection("Critical Slots (0 Filled)", critical, "No critical slots. Nice work.", "critical-section")}
    ${buildSection("Understaffed Slots", under, "No understaffed slots.", "under-section")}
    ${buildSection("Fully Covered Slots", full, "No fully covered slots yet.", "full-section")}
  `;
}

// ================================================
// Participant Activity Report (GLOBAL)
// ================================================
async function loadParticipantActivity() {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading participant activity…";

  const { data: signups, error: signupErr } = await supabase
    .from("signups")
    .select("*");

  if (signupErr) {
    console.error("Error loading signups for participant report:", signupErr);
    preview.textContent = "Error loading data.";
    return;
  }

  if (!signups.length) {
    preview.textContent = "No signups found.";
    return;
  }

  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("id, start_time, end_time, event_id");

  if (slotErr) {
    console.error("Error loading slots for participant report:", slotErr);
    preview.textContent = "Error loading data.";
    return;
  }

  const slotMap = {};
  slots.forEach(sl => {
    slotMap[sl.id] = sl;
  });

  const participantMap = {};

  signups.forEach(s => {
    const key = s.email || `${s.full_name}#${s.id}`;
    if (!participantMap[key]) {
      participantMap[key] = {
        name: s.full_name,
        email: s.email || "",
        events: new Set(),
        slotsCount: 0,
        totalHours: 0,
        checkedInCount: 0,
        noShowCount: 0
      };
    }

    const p = participantMap[key];
    if (s.event_id) {
      p.events.add(s.event_id);
    }

    p.slotsCount += 1;

    if (s.checked_in) {
      p.checkedInCount += 1;
    } else {
      p.noShowCount += 1;
    }

    const slot = slotMap[s.slot_id];
    if (slot && slot.start_time && slot.end_time) {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      const diffMs = end - start;
      if (!isNaN(diffMs) && diffMs > 0) {
        p.totalHours += diffMs / (1000 * 60 * 60);
      }
    }
  });

  const participants = Object.values(participantMap).map(p => ({
    ...p,
    eventsCount: p.events.size,
    attendanceRate:
      p.slotsCount > 0
        ? Math.round((p.checkedInCount / p.slotsCount) * 100)
        : 0
  }));

  if (!participants.length) {
    preview.textContent = "No participant data available.";
    return;
  }

  const rowsHtml = participants
    .map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${p.eventsCount}</td>
        <td>${p.slotsCount}</td>
        <td>${p.totalHours.toFixed(2)}</td>
        <td>${p.checkedInCount}</td>
        <td>${p.noShowCount}</td>
        <td>${p.attendanceRate}%</td>
      </tr>
    `)
    .join("");

  preview.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Events</th>
          <th>Slots</th>
          <th>Hours</th>
          <th>Checked In</th>
          <th>No-Shows</th>
          <th>Attendance</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ================================================
// No-Show Report (PER EVENT)
// ================================================
async function loadNoShowReport(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading no-show report…";

  const { data: signups, error: signupErr } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId);

  if (signupErr) {
    console.error("Error loading signups for no-show report:", signupErr);
    preview.textContent = "Error loading data.";
    return;
  }

  if (!signups.length) {
    preview.textContent = "No signups for this event.";
    return;
  }

  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("id, name, start_time, end_time")
    .eq("event_id", eventId);

  if (slotErr) {
    console.error("Error loading slots for no-show report:", slotErr);
    preview.textContent = "Error loading data.";
    return;
  }

  const slotMap = {};
  slots.forEach(sl => {
    slotMap[sl.id] = sl;
  });

  const rowsHtml = signups
    .map(s => {
      const slot = slotMap[s.slot_id];
      const slotName = slot?.name || "";
      const start = slot?.start_time || "";
      const end = slot?.end_time || "";
      const checked = s.checked_in;
      const noShow = !checked;

      return `
        <tr>
          <td>${s.full_name}</td>
          <td>${s.email || ""}</td>
          <td>${slotName}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${checked ? "✅" : "❌"}</td>
          <td>${noShow ? "Yes" : "No"}</td>
          <td>${s.checked_in_at || ""}</td>
        </tr>
      `;
    })
    .join("");

  preview.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Slot</th>
          <th>Start</th>
          <th>End</th>
          <th>Checked In</th>
          <th>No-Show</th>
          <th>Checked In At</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ================================================
// CSV Download: Slot Fulfillment
// ================================================
document.getElementById("downloadSlotFulfillment").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const slots = await buildSlotData(eventId);

  const formatted = slots.map(slot => ({
    slot_name: slot.name,
    start_time: slot.start_time,
    end_time: slot.end_time,
    needed: slot.quantity,
    filled: slot.signups.length,
    remaining: slot.quantity - slot.signups.length,
    pct_filled:
      slot.quantity > 0
        ? Math.round((slot.signups.length / slot.quantity) * 100)
        : 0
  }));

  downloadCSV("slot_fulfillment.csv", formatted);
};

// ================================================
// CSV Download: Regular Signups
// ================================================
document.getElementById("downloadSignups").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId);

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    checked_in: s.checked_in ? "Yes" : "No"
  }));

  downloadCSV("signups.csv", formatted);
};

// ================================================
// CSV Download: Check-Ins
// ================================================
document.getElementById("downloadCheckins").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;

  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId)
    .eq("checked_in", true);

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    checked_in_at: s.checked_in_at || ""
  }));

  downloadCSV("checkins.csv", formatted);
};

// ================================================
// CSV Download: ALL signups across all events
// ================================================
document.getElementById("downloadAll").onclick = async () => {
  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("*");

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    checked_in: s.checked_in ? "Yes" : "No"
  }));

  downloadCSV("all_signups.csv", formatted);
};

// ================================================
// CSV Download: Participant Activity (GLOBAL)
// ================================================
document.getElementById("downloadParticipantActivity").onclick = async () => {
  const { data: signups, error: signupErr } = await supabase
    .from("signups")
    .select("*");

  if (signupErr) {
    console.error("Error loading signups for participant CSV:", signupErr);
    return;
  }

  if (!signups.length) {
    alert("No signups found.");
    return;
  }

  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("id, start_time, end_time, event_id");

  if (slotErr) {
    console.error("Error loading slots for participant CSV:", slotErr);
    return;
  }

  const slotMap = {};
  slots.forEach(sl => {
    slotMap[sl.id] = sl;
  });

  const participantMap = {};

  signups.forEach(s => {
    const key = s.email || `${s.full_name}#${s.id}`;
    if (!participantMap[key]) {
      participantMap[key] = {
        name: s.full_name,
        email: s.email || "",
        events: new Set(),
        slotsCount: 0,
        totalHours: 0,
        checkedInCount: 0,
        noShowCount: 0
      };
    }

    const p = participantMap[key];
    if (s.event_id) {
      p.events.add(s.event_id);
    }

    p.slotsCount += 1;

    if (s.checked_in) {
      p.checkedInCount += 1;
    } else {
      p.noShowCount += 1;
    }

    const slot = slotMap[s.slot_id];
    if (slot && slot.start_time && slot.end_time) {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      const diffMs = end - start;
      if (!isNaN(diffMs) && diffMs > 0) {
        p.totalHours += diffMs / (1000 * 60 * 60);
      }
    }
  });

  const rows = Object.values(participantMap).map(p => ({
    name: p.name,
    email: p.email,
    events: p.events.size,
    slots: p.slotsCount,
    hours: p.totalHours.toFixed(2),
    checked_in: p.checkedInCount,
    no_shows: p.noShowCount,
    attendance_rate:
      p.slotsCount > 0
        ? Math.round((p.checkedInCount / p.slotsCount) * 100)
        : 0
  }));

  if (!rows.length) {
    alert("No participant data to export.");
    return;
  }

  downloadCSV("participant_activity.csv", rows);
};

// ================================================
// CSV Download: No-Show Report (PER EVENT)
// ================================================
document.getElementById("downloadNoShow").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const eventLookup = await buildEventLookup();

  const { data: signups, error: signupErr } = await supabase
    .from("signups")
    .select("*")
    .eq("event_id", eventId);

  if (signupErr) {
    console.error("Error loading signups for no-show CSV:", signupErr);
    return;
  }

  if (!signups.length) {
    alert("No signups for this event.");
    return;
  }

  const { data: slots, error: slotErr } = await supabase
    .from("slots")
    .select("id, name, start_time, end_time")
    .eq("event_id", eventId);

  if (slotErr) {
    console.error("Error loading slots for no-show CSV:", slotErr);
    return;
  }

  const slotMap = {};
  slots.forEach(sl => {
    slotMap[sl.id] = sl;
  });

  const rows = signups.map(s => {
    const slot = slotMap[s.slot_id];
    const slotName = slot?.name || "";
    const start = slot?.start_time || "";
    const end = slot?.end_time || "";
    const checked = s.checked_in;
    const noShow = !checked;

    return {
      event_id: s.event_id,
      event_title: eventLookup[s.event_id]?.title || "",
      name: s.full_name,
      email: s.email || "",
      slot_name: slotName,
      slot_start: start,
      slot_end: end,
      checked_in: checked ? "Yes" : "No",
      no_show: noShow ? "Yes" : "No",
      checked_in_at: s.checked_in_at || ""
    };
  });

  downloadCSV("no_show_report.csv", rows);
};

// ================================================
// CSV Download: Event Summary (PER EVENT)
// ================================================
document.getElementById("downloadEventSummary").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const [slots, signupsRes, eventLookup] = await Promise.all([
    buildSlotData(eventId),
    supabase.from("signups").select("*").eq("event_id", eventId),
    buildEventLookup()
  ]);

  const signups = signupsRes.data || [];
  const eventMeta = eventLookup[eventId] || {};

  const totalSlots = slots.length;
  const totalSignups = signups.length;

  let neededTotal = 0;
  let filledTotal = 0;
  let emptySlots = 0;
  let partialSlots = 0;
  let fullSlots = 0;

  slots.forEach(slot => {
    const needed = slot.quantity || 0;
    const filled = slot.signups.length;
    neededTotal += needed;
    filledTotal += filled;

    if (needed === 0 && filled === 0) {
      emptySlots += 1;
    } else if (filled === 0) {
      emptySlots += 1;
    } else if (filled < needed) {
      partialSlots += 1;
    } else {
      fullSlots += 1;
    }
  });

  const avgFillPct =
    neededTotal > 0 ? Math.round((filledTotal / neededTotal) * 100) : 0;

  const checkedInCount = signups.filter(s => s.checked_in).length;
  const noShowCount = totalSignups - checkedInCount;
  const attendancePct =
    totalSignups > 0
      ? Math.round((checkedInCount / totalSignups) * 100)
      : 0;

  const row = [{
    event_id: eventId,
    event_title: eventMeta.title || "",
    event_start: eventMeta.start_time || "",
    event_end: eventMeta.end_time || "",
    total_slots: totalSlots,
    total_needed: neededTotal,
    total_filled: filledTotal,
    empty_slots: emptySlots,
    partial_slots: partialSlots,
    full_slots: fullSlots,
    avg_fulfillment_pct: avgFillPct,
    total_signups: totalSignups,
    checked_in: checkedInCount,
    no_shows: noShowCount,
    attendance_pct: attendancePct
  }];

  downloadCSV("event_summary.csv", row);
};

// ================================================
// CSV Download: Readiness (slot-by-slot)
// ================================================
document.getElementById("downloadReadiness").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const [slots, eventLookup] = await Promise.all([
    buildSlotData(eventId),
    buildEventLookup()
  ]);

  const eventMeta = eventLookup[eventId] || {};

  const rows = slots.map(slot => {
    const needed = slot.quantity || 0;
    const filled = slot.signups.length;
    const remaining = needed - filled;
    let status = "Unknown";

    if (needed > 0 && filled === 0) {
      status = "Critical";
    } else if (needed > 0 && filled < needed) {
      status = "Understaffed";
    } else if (needed > 0 && filled >= needed) {
      status = "Fully Covered";
    } else {
      status = "No Requirement";
    }

    const pct =
      needed > 0 ? Math.round((filled / needed) * 100) : 0;

    return {
      event_id: eventId,
      event_title: eventMeta.title || "",
      slot_name: slot.name,
      slot_start: slot.start_time || "",
      slot_end: slot.end_time || "",
      needed,
      filled,
      remaining,
      pct_filled: pct,
      status
    };
  });

  downloadCSV("event_readiness.csv", rows);
};

// ================================================
// Button Wiring
// ================================================
document.getElementById("slotFulfillmentBtn").onclick = () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");
  loadSlotFulfillment(eventId);
};

document.getElementById("unfilledSlotsBtn").onclick = () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");
  loadUnfilledSlots(eventId);
};

document.getElementById("participantActivityBtn").onclick = () => {
  loadParticipantActivity();
};

document.getElementById("noShowReportBtn").onclick = () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");
  loadNoShowReport(eventId);
};

document.getElementById("eventSummaryBtn").onclick = () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");
  loadEventSummary(eventId);
};

document.getElementById("readinessBtn").onclick = () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");
  loadReadinessDashboard(eventId);
};

// ================================================
// CSV Utility
// ================================================
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) {
    alert("No data to download.");
    return;
  }

  const headers = Object.keys(rows[0]).join(",");
  const values = rows.map(r => Object.values(r).join(",")).join("\n");
  const output = headers + "\n" + values;

  const blob = new Blob([output], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Init
loadEvents();
