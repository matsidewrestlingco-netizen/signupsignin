import { requireAdmin, logoutAdmin } from "./auth.js";

// Require login
requireAdmin();

// Enable log out
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }
});

// admin-edit-event.js
import { supabase } from "./supabaseClient.js";

// ----------------------------
// Extract event ID from URL
// ----------------------------
const url = new URL(window.location.href);
const eventId = url.searchParams.get("id");

if (!eventId) {
  alert("No event ID found in URL.");
  console.error("Missing ?id= parameter");
}

// ----------------------------
// Utility: Convert "HH:MM" -> "HH:MM:00"
// ----------------------------
function toPgTime(t) {
  if (!t) return null;
  const clean = t.trim().slice(0, 5); // ensure HH:MM only
  return `${clean}:00`;
}

// ----------------------------
// Load Event
// ----------------------------
async function loadEvent() {
  console.log("Loading event", eventId);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error loading event:", error);
    alert("Could not load event.");
    return;
  }

  // Populate form
  document.querySelector("#title").value = data.title || "";
  document.querySelector("#description").value = data.description || "";
  document.querySelector("#location").value = data.location || "";

  // Fill date input (YYYY-MM-DD)
  if (data.start_time) {
    document.querySelector("#date").value =
      data.start_time.split("T")[0] || "";
  }

  // Convert timestamps → HH:MM local
  if (data.start_time) {
    const d = new Date(data.start_time);
    document.querySelector("#start_time").value =
      d.toISOString().slice(11, 16);
  }

  if (data.end_time) {
    const d = new Date(data.end_time);
    document.querySelector("#end_time").value =
      d.toISOString().slice(11, 16);
  }
}

// ----------------------------
// Load Slots
// ----------------------------
async function loadSlots() {
  const container = document.querySelector("#existing-slots");
  container.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("slots")
    .select("*")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading slots:", error);
    container.innerHTML = "<p>Error loading slots.</p>";
    return;
  }

  if (!data.length) {
    container.innerHTML = "<p>No slots created yet.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((slot) => {
    const div = document.createElement("div");
    div.className = "slot-card";

    div.innerHTML = `
      <div class="slot-card-header">
        <strong>${slot.name}</strong>
        <button class="delete-slot btn-secondary" data-id="${slot.id}">
          Delete
        </button>
      </div>

      ${slot.description ? `<p>${slot.description}</p>` : ""}

      <div class="slot-card-meta">
        <p><strong>Qty:</strong> ${slot.quantity_total}</p>
        <p><strong>Time:</strong> ${slot.start_time || "—"} → ${slot.end_time || "—"}</p>
        <p><strong>Category:</strong> ${slot.category || "—"}</p>
      </div>
    `;

    container.appendChild(div);
  });

  // Wire up delete buttons
  document.querySelectorAll(".delete-slot").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const slotId = e.target.dataset.id;
      await deleteSlot(slotId);
    });
  });
}

// ----------------------------
// Add Slot
// ----------------------------
async function addSlot() {
  const name = document.querySelector("#slot-name").value.trim();
  const description = document.querySelector("#slot-description").value.trim();
  const qty = parseInt(document.querySelector("#slot-qty").value, 10);
  const start = document.querySelector("#slot-start").value;
  const end = document.querySelector("#slot-end").value;
  const category = document.querySelector("#slot-category").value.trim();

  if (!name) return alert("Slot name is required.");
  if (!qty || Number.isNaN(qty)) return alert("Quantity must be a number.");

  const payload = {
    event_id: eventId,
    name,
    description: description || null,
    quantity_total: qty,
    start_time: toPgTime(start),
    end_time: toPgTime(end),
    category: category || null,
    created_at: new Date().toISOString(), // forces validity if column is NOT NULL
  };

  console.log("Adding slot:", payload);

  const { data, error } = await supabase
    .from("slots")
    .insert(payload)
    .select();

  if (error) {
    console.error("Error adding slot:", error);
    alert("Error adding slot:\n" + JSON.stringify(error, null, 2));
    return;
  }

  alert("Slot added!");

  // Clear inputs
  document.querySelector("#slot-name").value = "";
  document.querySelector("#slot-description").value = "";
  document.querySelector("#slot-qty").value = "";
  document.querySelector("#slot-start").value = "";
  document.querySelector("#slot-end").value = "";
  document.querySelector("#slot-category").value = "";

  loadSlots();
}

// ----------------------------
// Delete Slot
// ----------------------------
async function deleteSlot(slotId) {
  if (!confirm("Delete this slot?")) return;

  const { error } = await supabase
    .from("slots")
    .delete()
    .eq("id", slotId);

  if (error) {
    console.error("Error deleting slot:", error);
    alert("Could not delete slot.");
    return;
  }

  loadSlots();
}

// ----------------------------
// Save Event
// ----------------------------
async function saveEvent() {
  const title = document.querySelector("#title").value.trim();
  const description = document.querySelector("#description").value.trim();
  const location = document.querySelector("#location").value.trim();
  const date = document.querySelector("#date").value;
  const start = document.querySelector("#start_time").value;
  const end = document.querySelector("#end_time").value;

  const startISO = date && start ? `${date}T${start}:00` : null;
  const endISO = date && end ? `${date}T${end}:00` : null;

  const payload = {
    title,
    description,
    location,
    start_time: startISO,
    end_time: endISO,
  };

  console.log("Saving event:", payload);

  const { error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", eventId);

  if (error) {
    console.error("Error updating event:", error);
    alert("Could not save event:\n" + JSON.stringify(error, null, 2));
    return;
  }

  alert("Event saved!");
}

// ----------------------------
// Wire Up Buttons
// ----------------------------
document.querySelector("#add-slot-btn").addEventListener("click", addSlot);
document.querySelector("#save-event-btn").addEventListener("click", saveEvent);

// ----------------------------
// Initial Load
// ----------------------------
loadEvent();
loadSlots();
