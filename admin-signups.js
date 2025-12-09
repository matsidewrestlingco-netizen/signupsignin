// admin-signups.js
import { supabase } from "./supabaseClient.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const eventTitleEl = document.getElementById("event-title");
const eventInfoEl = document.getElementById("event-info");
const signupsContainer = document.getElementById("signups-container");
const exportBtn = document.getElementById("export-csv-btn");

let groupedSignups = {}; // for CSV

async function loadEvent() {
  if (!eventId) {
    eventTitleEl.textContent = "Event ID missing";
    return;
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    eventTitleEl.textContent = "Event not found";
    return;
  }

  eventTitleEl.textContent = event.title;
  eventInfoEl.textContent = new Date(event.start_time).toLocaleString();

  loadSignups();
}

async function loadSignups() {
  const { data: slots, error } = await supabase
    .from("slots")
    .select("id, name, category, signups(full_name,email,note)")
    .eq("event_id", eventId);

  if (error) {
    signupsContainer.innerHTML = "Error loading signups.";
    return;
  }

  groupedSignups = {};

  slots.forEach((slot) => {
    groupedSignups[slot.name] = slot.signups;
  });

  renderSignups();
}

function renderSignups() {
  signupsContainer.innerHTML = "";

  for (const [slotName, signups] of Object.entries(groupedSignups)) {
    const section = document.createElement("div");
    section.className = "signup-group";

    const title = document.createElement("h3");
    title.textContent = `${slotName} (${signups.length})`;
    title.style.marginBottom = "8px";

    const list = document.createElement("div");
    list.className = "signup-list";

    if (signups.length === 0) {
      list.innerHTML = `<p>No signups yet.</p>`;
    } else {
      signups.forEach((s) => {
        const item = document.createElement("div");
        item.className = "signup-entry";
        item.innerHTML = `
          <p><strong>${s.full_name}</strong> (${s.email})</p>
          ${s.note ? `<p class="note">Note: ${s.note}</p>` : ""}
        `;
        list.appendChild(item);
      });
    }

    section.appendChild(title);
    section.appendChild(list);
    signupsContainer.appendChild(section);
  }
}

/* ---------------------
   CSV EXPORT
---------------------- */

exportBtn.addEventListener("click", () => {
  let csv = "Slot,Name,Email,Note\n";

  for (const [slotName, signups] of Object.entries(groupedSignups)) {
    signups.forEach((s) => {
      csv += `"${slotName}","${s.full_name}","${s.email}","${s.note || ""}"\n`;
    });
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "signups.csv";
  a.click();

  URL.revokeObjectURL(url);
});

/* Init */
loadEvent();
