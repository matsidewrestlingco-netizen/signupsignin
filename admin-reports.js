// admin-reports.js — FULL MERGED VERSION WITH PARTICIPANT REPORTS

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
// Load signup preview (basic per-event signup list)
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

  // Simple table view
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

  // Group signups by slot_id
  const signupMap = {};
  signups.forEach(s => {
    if (!signupMap[s.slot_id]) signupMap[s.slot_id] = [];
    signupMap[s.slot_id].push(s);
  });

  // Attach grouped signups to each slot
  const finalSlots = slots.map(slot => ({
    ...slot,
    signups: signupMap[slot.id] || []
  }));

  return finalSlots;
}

// ================================================
// Slot Fulfillment Report (UI)
// ================================================
async function loadSlotFulfillment(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading slot fulfillment…";

  const slots = await buildSlotData(eventId);

  if (!slots.length) {
    preview.textContent = "No slots found.";
    return;
  }

  const rowsHtml = slots
    .map(slot => {
      const filled = slot.signups.length;
      const remaining = slot.quantity - filled;
      const pct = slot.quantity > 0
        ? Math.round((filled / slot.quantity) * 100)
        : 0;

      return `
        <tr>
          <td>${slot.name}</td>
          <td>${slot.start_time || ""}</td>
          <td>${slot.end_time || ""}</td>
          <td>${slot.quantity}</td>
          <td>${filled}</td>
          <td>${remaining}</td>
          <td>${pct}%</td>
        </tr>
      `;
    })
    .join("");

  preview.innerHTML = `
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
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ================================================
// Unfilled Slots Report (UI)
// ================================================
async function loadUnfilledSlots(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading unfilled slots…";

  const slots = await buildSlotData(eventId);

  const unfilled = slots.filter(slot => slot.signups.length < slot.quantity);

  if (!unfilled.length) {
    preview.textContent = "All slots are fully filled!";
    return;
  }

  const rowsHtml = unfilled
    .map(slot => {
      const filled = slot.signups.length;
      const remaining = slot.quantity - filled;
      const pct = slot.quantity > 0
        ? Math.round((filled / slot.quantity) * 100)
        : 0;

      return `
        <tr>
          <td>${slot.name}</td>
          <td>${slot.start_time || ""}</td>
          <td>${slot.end_time || ""}</td>
          <td>${slot.quantity}</td>
          <td>${filled}</td>
          <td>${remaining}</td>
          <td>${pct}%</td>
        </tr>
      `;
    })
    .join("");

  preview.innerHTML = `
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
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// ================================================
// Participant Activity Report (GLOBAL, ALL EVENTS)
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

  // Aggregate by participant
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

    // Calculate hours from slot duration (if slot info exists)
    const slot = slotMap[s.slot_id];
    if (slot && slot.start_time && slot.end_time) {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      const diffMs = end - start;
      if (!isNaN(diffMs) && diffMs > 0) {
        p.totalHours += diffMs / (1000 * 60 * 60); // ms → hours
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
