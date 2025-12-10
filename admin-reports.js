// admin-reports.js
// Admin Reports: export signups & check-ins

import { supabase } from "./supabaseClient.js";
import { requireAdmin } from "./admin.js";

// DOM elements
const eventSelect = document.getElementById("report-event-select");
const previewTable = document.getElementById("report-preview-table");
const previewBody = document.getElementById("report-preview-body");
const previewEmpty = document.getElementById("report-preview-empty");

const btnSignups = document.getElementById("btn-download-signups");
const btnCheckins = document.getElementById("btn-download-checkins");
const btnAllSignups = document.getElementById("btn-download-all-signups");

// Cached data
let allEvents = [];
let currentEvent = null;
let currentRows = []; // flattened rows for current event

document.addEventListener("DOMContentLoaded", () => {
  // Protect this page
  requireAdmin();

  loadEventOptions();

  if (eventSelect) {
    eventSelect.addEventListener("change", () => {
      const eventId = eventSelect.value;
      if (!eventId) {
        currentEvent = null;
        currentRows = [];
        renderPreview([]);
        return;
      }
      loadEventReport(eventId);
    });
  }

  if (btnSignups) {
    btnSignups.addEventListener("click", downloadCurrentEventSignupsCsv);
  }

  if (btnCheckins) {
    btnCheckins.addEventListener("click", downloadCurrentEventCheckinsCsv);
  }

  if (btnAllSignups) {
    btnAllSignups.addEventListener("click", downloadAllSignupsCsv);
  }
});

// ---------------------------
// Load events into dropdown
// ---------------------------
async function loadEventOptions() {
  if (!eventSelect) return;

  eventSelect.innerHTML = `<option value="">Loading events…</option>`;

  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_time")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events for reports:", error);
    eventSelect.innerHTML = `<option value="">Error loading events</option>`;
    return;
  }

  allEvents = data || [];

  if (allEvents.length === 0) {
    eventSelect.innerHTML = `<option value="">No events available</option>`;
    renderPreview([]);
    return;
  }

  eventSelect.innerHTML = `<option value="">Select an event…</option>`;
  allEvents.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `${ev.title} – ${formatDate(ev.start_time)}`;
    eventSelect.appendChild(opt);
  });
}

// ---------------------------
// Load report data for 1 event
// ---------------------------
async function loadEventReport(eventId) {
  previewEmpty.textContent = "Loading report…";
  previewEmpty.style.display = "block";
  previewTable.style.display = "none";

  const event = allEvents.find((e) => e.id === eventId) || null;
  currentEvent = event;

  const { data: slots, error } = await supabase
    .from("slots")
    .select(
      `
      id,
      name,
      category,
      start_time,
      end_time,
      signups (
        full_name,
        email,
        note,
        checked_in,
        checked_in_at,
        created_at
      )
    `
    )
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading slots for report:", error);
    previewEmpty.textContent = "Error loading report data.";
    previewTable.style.display = "none";
    return;
  }

  const rows = buildRowsFromSlots(slots || [], event);
  currentRows = rows;
  renderPreview(rows);
}

// Flatten slots + signups into row objects
function buildRowsFromSlots(slots, event) {
  const rows = [];
  const eventTitle = event?.title || "";
  const eventStart = event?.start_time || "";

  slots.forEach((slot) => {
    const signups = slot.signups || [];
    signups.forEach((s) => {
      rows.push({
        event_title: eventTitle,
        event_start_time: eventStart,
        slot_name: slot.name || "",
        slot_category: slot.category || "",
        slot_start_time: slot.start_time || "",
        slot_end_time: slot.end_time || "",
        full_name: s.full_name || "",
        email: s.email || "",
        note: s.note || "",
        checked_in: s.checked_in ? "Yes" : "No",
        checked_in_at: s.checked_in_at || "",
        signup_created_at: s.created_at || "",
      });
    });
  });

  return rows;
}

// ---------------------------
// Preview rendering
// ---------------------------
function renderPreview(rows) {
  if (!previewBody || !previewTable || !previewEmpty) return;

  if (!rows || rows.length === 0) {
    previewBody.innerHTML = "";
    previewTable.style.display = "none";
    previewEmpty.textContent = "No signups found for this event.";
    previewEmpty.style.display = "block";
    return;
  }

  previewEmpty.style.display = "none";
  previewTable.style.display = "table";
  previewBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${row.full_name}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${row.email}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${row.slot_name}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${row.slot_category}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${row.checked_in}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #374151;">${
        row.checked_in_at || ""
      }</td>
    `;
    previewBody.appendChild(tr);
  });
}

// ---------------------------
// CSV helpers
// ---------------------------
function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function downloadCsv(headers, rows, filename) {
  const lines = [];
  lines.push(headers.map(escapeCsv).join(","));
  rows.forEach((row) => {
    lines.push(row.map(escapeCsv).join(","));
  });

  const csvContent = lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50) || "event";
}

// ---------------------------
// CSV download actions
// ---------------------------
function downloadCurrentEventSignupsCsv() {
  if (!currentEvent) {
    alert("Please select an event first.");
    return;
  }

  if (!currentRows.length) {
    alert("No signups found for this event.");
    return;
  }

  const headers = [
    "Name",
    "Email",
    "Slot",
    "Category",
    "Slot Start Time",
    "Slot End Time",
    "Note",
  ];

  const rows = currentRows.map((r) => [
    r.full_name,
    r.email,
    r.slot_name,
    r.slot_category,
    r.slot_start_time,
    r.slot_end_time,
    r.note,
  ]);

  const filename = `signups_${slugify(currentEvent.title)}.csv`;
  downloadCsv(headers, rows, filename);
}

function downloadCurrentEventCheckinsCsv() {
  if (!currentEvent) {
    alert("Please select an event first.");
    return;
  }

  if (!currentRows.length) {
    alert("No signups found for this event.");
    return;
  }

  // This includes BOTH checked-in and not-yet-checked-in (per your request)
  const headers = [
    "Name",
    "Email",
    "Slot",
    "Category",
    "Checked In",
    "Checked In At",
    "Note",
  ];

  const rows = currentRows.map((r) => [
    r.full_name,
    r.email,
    r.slot_name,
    r.slot_category,
    r.checked_in,
    r.checked_in_at,
    r.note,
  ]);

  const filename = `checkins_${slugify(currentEvent.title)}.csv`;
  downloadCsv(headers, rows, filename);
}

async function downloadAllSignupsCsv() {
  previewEmpty.textContent = "Building full export…";

  const { data: events, error: evError } = await supabase
    .from("events")
    .select("id, title, start_time")
    .order("start_time", { ascending: true });

  if (evError) {
    console.error("Error loading events for all-signups export:", evError);
    alert("Error loading events for export.");
    return;
  }

  let globalRows = [];

  for (const ev of events || []) {
    const { data: slots, error: slotError } = await supabase
      .from("slots")
      .select(
        `
        id,
        name,
        category,
        start_time,
        end_time,
        signups (
          full_name,
          email,
          note,
          checked_in,
          checked_in_at,
          created_at
        )
      `
      )
      .eq("event_id", ev.id)
      .order("start_time", { ascending: true });

    if (slotError) {
      console.error("Error loading slots for event", ev.id, slotError);
      continue;
    }

    const rows = buildRowsFromSlots(slots || [], ev);
    globalRows = globalRows.concat(rows);
  }

  if (!globalRows.length) {
    alert("No signups found across any events.");
    return;
  }

  const headers = [
    "Event",
    "Event Start Time",
    "Name",
    "Email",
    "Slot",
    "Category",
    "Checked In",
    "Checked In At",
    "Note",
  ];

  const rows = globalRows.map((r) => [
    r.event_title,
    r.event_start_time,
    r.full_name,
    r.email,
    r.slot_name,
    r.slot_category,
    r.checked_in,
    r.checked_in_at,
    r.note,
  ]);

  downloadCsv(headers, rows, "all_signups.csv");
}

// ---------------------------
// Formatting helper
// ---------------------------
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
