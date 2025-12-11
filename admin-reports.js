// admin-reports.js — FIXED VERSION

import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// Enforce admin access
requireAdmin();

// Attach logout handler
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutAdmin);
});

// ----------------------------
// Build Event Lookup Map (Events → Title & Times)
// ----------------------------
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

// ----------------------------
// Load events into dropdown
// ----------------------------
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

// ----------------------------
// Load signup preview
// ----------------------------
async function loadPreview(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading signups…";

  const { data: signups, error } = await supabase
    .from("signups")
    .select("*, slots(name)")
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
        <span>${s.slots?.name || "Unknown Slot"}</span>
        <span>${s.checked_in ? "✅ Checked In" : "❌ Not Checked In"}</span>
      </div>
    `)
    .join("");
}

// --------------------------------------
// SLOT FULFILLMENT REPORT (ALL SLOTS)
// --------------------------------------
async function loadSlotFulfillment(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading slot fulfillment…";

  const { data, error } = await supabase
    .from("slots")
    .select("id, name, start_time, end_time, quantity, signups(id)")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error loading slot fulfillment:", error);
    preview.textContent = "Error loading slot fulfillment.";
    return;
  }

  if (!data.length) {
    preview.textContent = "No slots found for this event.";
    return;
  }

  // Build UI output
  preview.innerHTML = data
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

// ----------------------------
// CSV Download Helper
// ----------------------------
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

// ----------------------------
// Download Signups
// ----------------------------
document.getElementById("downloadSignups").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,event_id,slots(name,start_time,end_time)")
    .eq("event_id", eventId);

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    slot_name: s.slots?.name || "",
    slot_start_time: s.slots?.start_time || "",
    slot_end_time: s.slots?.end_time || "",
    checked_in: s.checked_in ? "Yes" : "No"
  }));

  downloadCSV("signups.csv", formatted);
};
// ----------------------------
// Download Check-ins
// ----------------------------
document.getElementById("downloadCheckins").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;

  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,checked_in_at,event_id,slots(name,start_time,end_time)")
    .eq("event_id", eventId)
    .eq("checked_in", true);

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    slot_name: s.slots?.name || "",
    slot_start_time: s.slots?.start_time || "",
    slot_end_time: s.slots?.end_time || "",
    checked_in_at: s.checked_in_at || ""
  }));

  downloadCSV("checkins.csv", formatted);
};
// ----------------------------
// Download all signups
// ----------------------------
document.getElementById("downloadAll").onclick = async () => {
  const eventLookup = await buildEventLookup();

  const { data, error } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,event_id,slots(name,start_time,end_time)");

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    event_id: s.event_id,
    event_title: eventLookup[s.event_id]?.title || "",
    name: s.full_name,
    email: s.email,
    slot_name: s.slots?.name || "",
    slot_start_time: s.slots?.start_time || "",
    slot_end_time: s.slots?.end_time || "",
    checked_in: s.checked_in ? "Yes" : "No"
  }));

  downloadCSV("all_signups.csv", formatted);
};

// --------------------------------------
// UNFILLED SLOTS REPORT (REMAINING > 0)
// --------------------------------------
async function loadUnfilledSlots(eventId) {
  const preview = document.getElementById("preview-container");
  preview.textContent = "Loading unfilled slots…";

  const { data, error } = await supabase
    .from("slots")
    .select("id, name, start_time, end_time, quantity, signups(id)")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error loading unfilled slots:", error);
    preview.textContent = "Error loading data.";
    return;
  }

  const unfilled = data.filter(slot => slot.signups.length < slot.quantity);

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

document.getElementById("downloadSlotFulfillment").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;
  if (!eventId) return alert("Select an event first.");

  const { data } = await supabase
    .from("slots")
    .select("id, name, start_time, end_time, quantity, signups(id)")
    .eq("event_id", eventId);

  const formatted = data.map(slot => ({
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

// Slot Fulfillment + Unfilled Slot Buttons
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
