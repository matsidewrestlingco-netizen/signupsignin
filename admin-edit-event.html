// admin-edit-event.js
// =========================================================
// Full file: admin authentication, load event, update event,
// create slots, load slots.
// =========================================================

import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// ---------------------------------------------------------
// Enforce admin login
// ---------------------------------------------------------
requireAdmin();

// ---------------------------------------------------------
// Logout button
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }
});

// ---------------------------------------------------------
// Parse event ID from URL
// ---------------------------------------------------------
const url = new URL(window.location.href);
const eventId = url.searchParams.get("id");

if (!eventId) {
  alert("Missing event ID.");
  window.location.href = "admin-events.html";
}

// ---------------------------------------------------------
// DOM ELEMENTS
// ---------------------------------------------------------
const eventTitleInput = document.getElementById("event-title");
const eventStartInput = document.getElementById("event-start");
const eventLocationInput = document.getElementById("event-location");
const eventDescriptionInput = document.getElementById("event-description");
const eventPublicInput = document.getElementById("event-public");
const eventForm = document.getElementById("editEventForm");
const eventFormMessage = document.getElementById("eventFormMessage");

const slotNameInput = document.getElementById("slot-name");
const slotCategoryInput = document.getElementById("slot-category");
const slotQuantityInput = document.getElementById("slot-quantity");
const slotStartInput = document.getElementById("slot-start");
const slotEndInput = document.getElementById("slot-end");
const slotDescriptionInput = document.getElementById("slot-description");
const slotForm = document.getElementById("newSlotForm");
const slotMessage = document.getElementById("slotMessage");

const existingSlotsContainer = document.getElementById("existingSlots");

// ---------------------------------------------------------
// Load event on page load
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadEventDetails();
});

// ---------------------------------------------------------
// Fetch event by ID and populate form fields
// ---------------------------------------------------------
async function loadEventDetails() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error loading event:", error);
    eventFormMessage.textContent = "Error loading event.";
    eventFormMessage.style.display = "block";
    return;
  }

  // Populate form with values
  eventTitleInput.value = data.title || "";
  eventStartInput.value = data.start_time
    ? data.start_time.substring(0, 16)
    : "";
  eventLocationInput.value = data.location || "";
  eventDescriptionInput.value = data.description || "";
  eventPublicInput.checked = data.is_public === true;

  // Load slots AFTER event loads
  loadSlots();
}

// ---------------------------------------------------------
// Update event details
// ---------------------------------------------------------
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  eventFormMessage.style.display = "none";

  const updatedEvent = {
    title: eventTitleInput.value.trim(),
    start_time: eventStartInput.value,
    location: eventLocationInput.value.trim() || null,
    description: eventDescriptionInput.value.trim() || null,
    is_public: eventPublicInput.checked,
  };

  const { error } = await supabase
    .from("events")
    .update(updatedEvent)
    .eq("id", eventId);

  if (error) {
    console.error("Error updating event:", error);
    eventFormMessage.textContent = "Error updating event.";
    eventFormMessage.style.display = "block";
    return;
  }

  eventFormMessage.textContent = "Event updated successfully!";
  eventFormMessage.style.display = "block";
});

// ---------------------------------------------------------
// Add new slot
// ---------------------------------------------------------
slotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  slotMessage.style.display = "none";

  const newSlot = {
    event_id: eventId,
    name: slotNameInput.value.trim(),
    category: slotCategoryInput.value,
    quantity_total: Number(slotQuantityInput.value) || 1,
    start_time: slotStartInput.value || null,
    end_time: slotEndInput.value || null,
    description: slotDescriptionInput.value.trim() || null,
  };

  const { error } = await supabase.from("slots").insert(newSlot);

  if (error) {
    console.error("Error adding slot:", error);
    slotMessage.textContent = "Error adding slot.";
    slotMessage.style.display = "block";
    return;
  }

  slotMessage.textContent = "Slot added successfully!";
  slotMessage.style.display = "block";

  // Clear form fields
  slotNameInput.value = "";
  slotQuantityInput.value = "";
  slotStartInput.value = "";
  slotEndInput.value = "";
  slotDescriptionInput.value = "";

  // Reload slots list
  loadSlots();
});

// ---------------------------------------------------------
// Load all slots for this event
// ---------------------------------------------------------
async function loadSlots() {
  existingSlotsContainer.innerHTML = "<p>Loading slots…</p>";

  const { data, error } = await supabase
    .from("slots")
    .select("*, signups(id)")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error loading slots:", error);
    existingSlotsContainer.innerHTML = "<p>Error loading slots.</p>";
    return;
  }

  if (!data.length) {
    existingSlotsContainer.innerHTML = "<p>No slots created yet.</p>";
    return;
  }

  existingSlotsContainer.innerHTML = "";

  data.forEach((slot) => {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <h3>${slot.name}</h3>
      <p><strong>Category:</strong> ${slot.category}</p>
      <p><strong>Total Spots:</strong> ${slot.quantity_total}</p>
      <p><strong>Filled:</strong> ${slot.signups?.length || 0}</p>
      ${
        slot.start_time && slot.end_time
          ? `<p><strong>Time:</strong> ${slot.start_time} – ${slot.end_time}</p>`
          : ""
      }
      ${
        slot.description
          ? `<p><strong>Notes:</strong> ${slot.description}</p>`
          : ""
      }
    `;

    existingSlotsContainer.appendChild(card);
  });
}
