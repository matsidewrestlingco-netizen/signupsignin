import { supabase } from "./supabaseClient.js";

const eventSelect = document.getElementById("report-event-select");
const previewTable = document.getElementById("report-preview-table");
const previewBody = document.getElementById("report-preview-body");
const previewEmpty = document.getElementById("report-preview-empty");

// Load events into dropdown
async function loadEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_time")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events:", error);
    return;
  }

  eventSelect.innerHTML = `<option value="">Select an event...</option>`;

  data.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `${ev.title} (${new Date(ev.start_time).toLocaleDateString()})`;
    eventSelect.appendChild(opt);
  });
}

// Load preview table when dropdown changes
async function loadPreview(eventId) {
  if (!eventId) {
    previewTable.style.display = "none";
    previewEmpty.style.display = "block";
    previewEmpty.textContent = "Choose an event above to see signups.";
    return;
  }

  const { data, error } = await supabase
    .from("signups")
    .select("full_name, email, note, checked_in, checked_in_at, slots(name, category)")
    .eq("event_id", eventId);

  if (error) {
    console.error(error);
    return;
  }

  previewBody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.full_name}</td>
      <td>${row.email}</td>
      <td>${row.slots?.name || ""}</td>
      <td>${row.slots?.category || ""}</td>
      <td>${row.checked_in ? "Yes" : "No"}</td>
      <td>${row.checked_in_at || ""}</td>
    `;
    previewBody.appendChild(tr);
  });

  previewEmpty.style.display = data.length ? "none" : "block";
  previewTable.style.display = data.length ? "table" : "none";
}

// CSV Download Helper
function downloadCSV(filename, rows) {
  const process = rows.map((row) =>
    Object.values(row).map((v) => `"${v ?? ""}"`).join(",")
  );

  const blob = new Blob([process.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Download Signups
document.getElementById("btn-download-signups").onclick = async () => {
  const eventId = eventSelect.value;
  if (!eventId) return alert("Select an event");

  const { data, error } = await supabase
    .from("signups")
    .select("full_name, email, slot_id, checked_in, checked_in_at, slots(name, category)")
    .eq("event_id", eventId);

  if (error) return console.error(error);

  downloadCSV("event-signups.csv", data);
};

// Download Check-ins
document.getElementById("btn-download-checkins").onclick = async () => {
  const eventId = eventSelect.value;
  if (!eventId) return alert("Select an event");

  const { data, error } = await supabase
    .from("signups")
    .select("full_name, email, slot_id, checked_in, checked_in_at, slots(name, category)")
    .eq("event_id", eventId)
    .eq("checked_in", true);

  if (error) return console.error(error);

  downloadCSV("checked-in.csv", data);
};

// Download All Signups (all events)
document.getElementById("btn-download-all-signups").onclick = async () => {
  const { data, error } = await supabase
    .from("signups")
    .select("full_name, email, event_id, slot_id, checked_in, checked_in_at");

  if (error) return console.error(error);

  downloadCSV("all-signups.csv", data);
};

// Bind dropdown listener
eventSelect.addEventListener("change", () => loadPreview(eventSelect.value));

// Initialize
loadEvents();
