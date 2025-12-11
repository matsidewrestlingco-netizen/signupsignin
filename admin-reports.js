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

  const { data, error } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,slots(name)")
    .eq("event_id", eventId);

  if (error) return console.error(error);

  const formatted = data.map(s => ({
    name: s.full_name,
    email: s.email,
    slot: s.slots?.name || "",
    checked_in: s.checked_in ? "Yes" : "No",
  }));

  downloadCSV("signups.csv", formatted);
};

// ----------------------------
// Download Check-ins
// ----------------------------
document.getElementById("downloadCheckins").onclick = async () => {
  const eventId = document.getElementById("eventSelect").value;

  const { data } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,checked_in_at,slots(name)")
    .eq("event_id", eventId)
    .eq("checked_in", true);

  const formatted = data.map(s => ({
    name: s.full_name,
    email: s.email,
    slot: s.slots?.name || "",
    checked_in_at: s.checked_in_at || "",
  }));

  downloadCSV("checkins.csv", formatted);
};

// ----------------------------
// Download all signups
// ----------------------------
document.getElementById("downloadAll").onclick = async () => {
  const { data } = await supabase
    .from("signups")
    .select("full_name,email,checked_in,event_id,slots(name)");

  const formatted = data.map(s => ({
    event_id: s.event_id,
    name: s.full_name,
    email: s.email,
    slot: s.slots?.name || "",
    checked_in: s.checked_in ? "Yes" : "No",
  }));

  downloadCSV("all_signups.csv", formatted);
};

// Init
loadEvents();
