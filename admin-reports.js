// admin-reports.js — FULL MERGED VERSION (NO RELATIONSHIPS NEEDED)

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
// Load signup preview (basic report)
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

  preview.innerHTML = signups
    .map(s => `
      <div class="report-row">
        <strong>${s.full_name}</strong>
        <span>${s.email}</span>
        <span>${s.checked_in ? "✅ Checked In" : "❌ Not Checked In"}</span>
      </div>
    `)
    .join("");
}

// ================================================
// Helper: Build Slot Fulfillment Structure
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

  preview.innerHTML = slots
    .map(slot => {
      const filled = slot.signups.length;
      const remaining = slot.quantity - filled;
      const pct = Math.round((filled / slot.quantity) * 100);

      return `
        <div class="report-row">
          <strong>${slot.name}</strong>
          <span>${slot.start_time || ""} → ${slot.end_time || ""}</span>
          <span>Needed: ${slot.quantity}</span>
          <span>Filled: ${filled}</span>
          <span>Remaining: ${remaining}</span>
          <span>${pct}% Filled</span>
        </div>
      `;
    })
    .join("");
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

  preview.innerHTML = unfilled
    .map(slot => {
      const filled = slot.signups.length;
      const remaining = slot.quantity - filled;
      const pct = Math.round((filled / slot.quantity) * 100);

      return `
        <div class="report-row">
          <strong>${slot.name}</strong>
          <span>${slot.start_time || ""} → ${slot.end_time || ""}</span>
          <span>Needed: ${slot.quantity}</span>
          <span>Filled: ${filled}</span>
          <span>Remaining: ${remaining}</span>
          <span>${pct}% Filled</span>
        </div>
      `;
    })
    .join("");
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
    pct_filled: Math.round((slot.signups.length / slot.quantity) * 100)
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

// Init
loadEvents();

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
