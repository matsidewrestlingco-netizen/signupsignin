// admin-edit-event.js
// Full event + slot manager for admin-edit-event.html

import { supabase } from "./supabaseClient.js";

/* ----------------------------
   URL Helpers
----------------------------- */

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

if (!eventId) {
  alert("No event ID provided in URL.");
}

/* ----------------------------
   Time Helpers
----------------------------- */

function isoToDate(iso) {
  if (!iso) return "";
  return iso.split("T")[0];
}

function isoToTime(iso) {
  if (!iso) return "";
  return iso.substring(11, 16);
}

function buildDateTimeISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(`${dateStr}T${timeStr}`);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function buildTimeOnlyISO(timeStr) {
  if (!timeStr) return null;
  const dt = new Date(`2000-01-01T${timeStr}`);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

/* ----------------------------
   DOM Elements
----------------------------- */

const eventForm = document.getElementById("event-form");
const eventStatus = document.getElementById("event-status");

const slotList = document.getElementById("slot-list");
const newSlotForm = document.getElementById("new-slot-form");
const slotStatus = document.getElementById("slot-status");

/* ----------------------------
   Load Event Data
----------------------------- */

async function loadEvent() {
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    console.error("Error loading event:", error);
    eventStatus.textContent = "Error loading event.";
    eventStatus.className = "status-message status-error";
    return;
  }

  document.getElementById("title").value = event.title || "";
  document.getElementById("location").value = event.location || "";
  document.getElementById("date").value = isoToDate(event.start_time);
  document.getElementById("startTime").value = isoToTime(event.start_time);
  document.getElementById("endTime").value = isoToTime(event.end_time);
  document.getElementById("description").value = event.description || "";
  document.getElementById("isPublic").checked = event.is_public || false;

  loadSlots();
}

/* ----------------------------
   Load Slots
----------------------------- */

async function loadSlots() {
  const { data: slots, error } = await supabase
    .from("slots")
    .select("*, signups(id)")
    .eq("event_id", eventId)
    .order("id");

  if (error) {
    console.error("Error loading slots:", error);
    slotList.textContent = "Error loading slots.";
    return;
  }

  slotList.innerHTML = "";

  if (!slots.length) {
    slotList.innerHTML = "<p>No slots yet.</p>";
    return;
  }

  slots.forEach((slot) => {
    const filled = slot.signups?.length || 0;
    const start = isoToTime(slot.start_time);
    const end = isoToTime(slot.end_time);

    const wrapper = document.createElement("div");
    wrapper.className = "card";
    wrapper.dataset.slot = slot.id;

    wrapper.innerHTML = `
      <!-- VIEW MODE -->
      <div class="slot-view" data-view="${slot.id}">
        <h3>${slot.name}</h3>
        <p><strong>Category:</strong> ${slot.category}</p>
        <p><strong>Quantity:</strong> ${slot.quantity_total} · <strong>Filled:</strong> ${filled}</p>
        ${
          start
            ? `<p><strong>Time:</strong> ${start} – ${end || ""}</p>`
            : ""
        }
        ${
          slot.description
            ? `<p style="margin-top:6px;">${slot.description}</p>`
            : ""
        }
        <div style="margin-top:10px; display:flex; gap:10px;">
          <button class="btn-primary" data-action="edit" data-id="${slot.id}">Edit</button>
          <button class="btn-ghost" data-action="delete" data-id="${slot.id}">Delete</button>
        </div>
      </div>

      <!-- EDIT MODE -->
      <div class="slot-edit" data-edit="${slot.id}" style="display:none;">
        <div class="form-grid">
          <div class="form-field">
            <label>Name</label>
            <input type="text" data-field="name" value="${slot.name}">
          </div>

          <div class="form-field">
            <label>Category</label>
            <select data-field="category">
              ${categoryOption("volunteer", slot.category)}
              ${categoryOption("food", slot.category)}
              ${categoryOption("concessions", slot.category)}
              ${categoryOption("admissions", slot.category)}
              ${categoryOption("matcrew", slot.category)}
              ${categoryOption("other", slot.category)}
            </select>
          </div>

          <div class="form-field-inline">
            <div>
              <label>Start Time</label>
              <input type="time" data-field="start_time" value="${start}">
            </div>
            <div>
              <label>End Time</label>
              <input type="time" data-field="end_time" value="${end}">
            </div>
          </div>

          <div class="form-field">
            <label>Quantity</label>
            <input type="number" min="1" data-field="quantity_total" value="${slot.quantity_total}">
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea rows="2" data-field="description">${slot.description || ""}</textarea>
          </div>

          <div class="form-actions">
            <button class="btn-primary" data-action="save" data-id="${slot.id}">Save</button>
            <button class="btn-ghost" data-action="cancel" data-id="${slot.id}">Cancel</button>
          </div>

          <p class="status-message" data-slot-status="${slot.id}"></p>
        </div>
      </div>
    `;

    slotList.appendChild(wrapper);
  });
}

/* ----------------------------
   Edit Mode Helpers
----------------------------- */

function categoryOption(value, current) {
  return `<option value="${value}" ${
    value === current ? "selected" : ""
  }>${value.charAt(0).toUpperCase() + value.slice(1)}</option>`;
}

/* ----------------------------
   Slot Actions (Edit / Save / Cancel / Delete)
----------------------------- */

slotList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const slotId = btn.dataset.id;

  const viewEl = document.querySelector(`[data-view="${slotId}"]`);
  const editEl = document.querySelector(`[data-edit="${slotId}"]`);
  const statusEl = document.querySelector(`[data-slot-status="${slotId}"]`);

  if (action === "edit") {
    viewEl.style.display = "none";
    editEl.style.display = "block";
    statusEl.textContent = "";
  }

  if (action === "cancel") {
    editEl.style.display = "none";
    viewEl.style.display = "block";
    statusEl.textContent = "";
  }

  if (action === "delete") {
    if (!confirm("Delete this slot?")) return;

    const { error } = await supabase
      .from("slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      console.error(error);
      alert("Error deleting slot.");
      return;
    }

    loadSlots();
  }

  if (action === "save") {
    statusEl.textContent = "Saving…";
    statusEl.className = "status-message status-info";

    const name = editEl.querySelector(`[data-field="name"]`).value;
    const category = editEl.querySelector(`[data-field="category"]`).value;
    const qty = Number(editEl.querySelector(`[data-field="quantity_total"]`).value);
    const desc = editEl.querySelector(`[data-field="description"]`).value.trim();

    const start = editEl.querySelector(`[data-field="start_time"]`).value;
    const end = editEl.querySelector(`[data-field="end_time"]`).value;

    const payload = {
      name,
      category,
      quantity_total: qty,
      description: desc || null,
      start_time: buildTimeOnlyISO(start),
      end_time: buildTimeOnlyISO(end),
    };

    const { error } = await supabase
      .from("slots")
      .update(payload)
      .eq("id", slotId);

    if (error) {
      console.error(error);
      statusEl.textContent = "Error saving slot.";
      statusEl.className = "status-message status-error";
      return;
    }

    statusEl.textContent = "Slot saved!";
    statusEl.className = "status-message status-success";

    loadSlots();
  }
});

/* ----------------------------
   Submit Event Updates
----------------------------- */

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  eventStatus.textContent = "Saving…";
  eventStatus.className = "status-message status-info";

  const title = document.getElementById("title").value.trim();
  const location = document.getElementById("location").value.trim();
  const date = document.getElementById("date").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const desc = document.getElementById("description").value.trim();
  const isPublic = document.getElementById("isPublic").checked;

  const startISO = buildDateTimeISO(date, start);
  const endISO = end ? buildDateTimeISO(date, end) : null;

  if (!title || !startISO) {
    eventStatus.textContent = "Title, date, and start time are required.";
    eventStatus.className = "status-message status-error";
    return;
  }

  const { error } = await supabase
    .from("events")
    .update({
      title,
      location: location || null,
      description: desc || null,
      start_time: startISO,
      end_time: endISO,
      is_public: isPublic,
    })
    .eq("id", eventId);

  if (error) {
    console.error(error);
    eventStatus.textContent = "Error saving event.";
    eventStatus.className = "status-message status-error";
    return;
  }

  eventStatus.textContent = "Event saved!";
  eventStatus.className = "status-message status-success";
});

/* ----------------------------
   Add New Slot
----------------------------- */

newSlotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  slotStatus.textContent = "Saving…";
  slotStatus.className = "status-message status-info";

  const name = document.getElementById("slot-name").value.trim();
  const category = document.getElementById("slot-category").value;
  const qty = Number(document.getElementById("slot-qty").value) || 1;
  const desc = document.getElementById("slot-description").value.trim();
  const start = document.getElementById("slot-start").value;
  const end = document.getElementById("slot-end").value;

  if (!name) {
    slotStatus.textContent = "Name is required.";
    slotStatus.className = "status-message status-error";
    return;
  }

  const { error } = await supabase.from("slots").insert({
    event_id: eventId,
    name,
    category,
    description: desc || null,
    quantity_total: qty,
    start_time: buildTimeOnlyISO(start),
    end_time: buildTimeOnlyISO(end),
  });

  if (error) {
    console.error("Error adding slot:", error);
    slotStatus.textContent = "Error adding slot.";
    slotStatus.className = "status-message status-error";
    return;
  }

  slotStatus.textContent = "Slot added!";
  slotStatus.className = "status-message status-success";

  newSlotForm.reset();
  document.getElementById("slot-qty").value = 1;

  loadSlots();
});

/* ----------------------------
   Init
----------------------------- */

loadEvent();
