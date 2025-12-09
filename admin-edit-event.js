// admin-edit-event.js
// Load + edit event, manage slots (create / edit / delete)

import { supabase } from "./supabaseClient.js";

/* ------------------ Helpers ------------------ */

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

if (!eventId) {
  alert("No event ID provided in URL.");
}

/** Convert event ISO string -> date (YYYY-MM-DD) */
function isoToDate(iso) {
  if (!iso) return "";
  return iso.split("T")[0] || "";
}

/** Convert ISO datetime -> HH:MM (24h) for <input type="time"> */
function isoToTime(iso) {
  if (!iso) return "";
  // "2025-01-01T09:00:00+00:00"  ->  "09:00"
  return iso.substring(11, 16);
}

/** Build ISO datetime from date + time (for event start/end) */
function buildDateTimeISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** Build ISO time-only with dummy date (for slot start/end) */
function buildTimeOnlyISO(timeStr) {
  if (!timeStr) return null;
  const dt = new Date(`2000-01-01T${timeStr}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/* ------------------ DOM refs ------------------ */

const eventForm = document.getElementById("event-form");
const eventStatus = document.getElementById("event-status");

const slotList = document.getElementById("slot-list");
const newSlotForm = document.getElementById("new-slot-form");
const slotStatus = document.getElementById("slot-status");

/* ------------------ Load Event ------------------ */

async function loadEvent() {
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    console.error("Error loading event:", error);
    eventStatus.textContent = "Error loading event.";
    return;
  }

  // Populate event form
  document.getElementById("title").value = event.title || "";
  document.getElementById("location").value = event.location || "";
  document.getElementById("date").value = isoToDate(event.start_time);
  document.getElementById("startTime").value = isoToTime(event.start_time);
  document.getElementById("endTime").value = isoToTime(event.end_time);
  document.getElementById("description").value = event.description || "";
  document.getElementById("isPublic").checked = !!event.is_public;

  await loadSlots();
}

/* ------------------ Load Slots ------------------ */

async function loadSlots() {
  const { data: slots, error } = await supabase
    .from("slots")
    .select("*, signups(id)")
    .eq("event_id", eventId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading slots:", error);
    slotList.textContent = "Error loading slots.";
    return;
  }

  slotList.innerHTML = "";

  if (!slots || slots.length === 0) {
    slotList.innerHTML = "<p>No slots yet.</p>";
    return;
  }

  slots.forEach((slot) => {
    const filled = (slot.signups || []).length;

    const container = document.createElement("div");
    container.className = "card";
    container.style.marginBottom = "12px";
    container.dataset.slotId = slot.id;

    const startTime = isoToTime(slot.start_time);
    const endTime = isoToTime(slot.end_time);

    container.innerHTML = `
      <!-- VIEW MODE -->
      <div class="slot-view" data-slot-id="${slot.id}">
        <h3 style="margin-bottom:4px;">${slot.name}</h3>
        <p><strong>Category:</strong> ${slot.category || "—"}</p>
        <p>
          <strong>Quantity:</strong> ${slot.quantity_total}
          &nbsp;·&nbsp;
          <strong>Filled:</strong> ${filled}
        </p>
        ${
          startTime
            ? `<p><strong>Time:</strong> ${startTime} – ${
                endTime || ""
              }</p>`
            : ""
        }
        ${
          slot.description
            ? `<p style="margin-top:4px;">${slot.description}</p>`
            : ""
        }
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button class="btn-primary" data-action="edit" data-id="${slot.id}">
            Edit
          </button>
          <button class="btn-ghost" data-action="delete" data-id="${slot.id}">
            Delete
          </button>
        </div>
      </div>

      <!-- EDIT MODE -->
      <div class="slot-edit" data-slot-id="${slot.id}" style="display:none; margin-top:8px;">
        <div class="form-grid" style="gap:0.5rem;">
          <div class="form-field">
            <label>Name</label>
            <input type="text" data-field="name" value="${slot.name || ""}">
          </div>

          <div class="form-field">
            <label>Category</label>
            <select data-field="category">
              <option value="volunteer" ${
                slot.category === "volunteer" ? "selected" : ""
              }>Volunteers</option>
              <option value="food" ${
                slot.category === "food" ? "selected" : ""
              }>Food Donations</option>
              <option value="concessions" ${
                slot.category === "concessions" ? "selected" : ""
              }>Concessions</option>
              <option value="admissions" ${
                slot.category === "admissions" ? "selected" : ""
              }>Admissions / Front Desk</option>
              <option value="matcrew" ${
                slot.category === "matcrew" ? "selected" : ""
              }>Mat Crew</option>
              <option value="other" ${
                slot.category === "other" ? "selected" : ""
              }>Other</option>
            </select>
          </div>

          <div class="form-field-inline">
            <div>
              <label>Start Time</label>
              <input type="time" data-field="start_time" value="${startTime}">
            </div>
            <div>
              <label>End Time</label>
              <input type="time" data-field="end_time" value="${endTime}">
            </div>
          </div>

          <div class="form-field">
            <label>Quantity</label>
            <input type="number" min="1" data-field="quantity_total" value="${
              slot.quantity_total || 1
            }">
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea rows="2" data-field="description">${
              slot.description || ""
            }</textarea>
          </div>

          <div class="form-actions" style="margin-top:4px;">
            <button class="btn-primary" data-action="save" data-id="${
              slot.id
            }">Save</button>
            <button class="btn-ghost" data-action="cancel" data-id="${
              slot.id
            }">Cancel</button>
          </div>

          <p class="status-message" data-slot-status="${slot.id}"></p>
        </div>
      </div>
    `;

    slotList.appendChild(container);
  });
}

/* ------------------ Slot Card Actions (Edit / Save / Cancel / Delete) ------------------ */

slotList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const slotId = btn.dataset.id;
  if (!slotId) return;

  const card = slotList.querySelector(`[data-slot-id="${slotId}"]`)?.parentElement;
  const viewEl = slotList.querySelector(`.slot-view[data-slot-id="${slotId}"]`);
  const editEl = slotList.querySelector(`.slot-edit[data-slot-id="${slotId}"]`);
  const statusEl = slotList.querySelector(
    `.slot-edit [data-slot-status="${slotId}"]`
  );

  switch (action) {
    case "edit": {
      if (viewEl && editEl) {
        viewEl.style.display = "none";
        editEl.style.display = "block";
        if (statusEl) statusEl.textContent = "";
      }
      break;
    }

    case "cancel": {
      if (viewEl && editEl) {
        editEl.style.display = "none";
        viewEl.style.display = "block";
        if (statusEl) statusEl.textContent = "";
      }
      break;
    }

    case "save": {
      if (!editEl) return;
      if (statusEl) {
        statusEl.textContent = "Saving…";
        statusEl.className = "status-message status-info";
      }

      const nameInput = editEl.querySelector('[data-field="name"]');
      const categorySelect = editEl.querySelector('[data-field="category"]');
      const qtyInput = editEl.querySelector('[data-field="quantity_total"]');
      const descInput = editEl.querySelector('[data-field="description"]');
      const startInput = editEl.querySelector('[data-field="start_time"]');
      const endInput = editEl.querySelector('[data-field="end_time"]');

      const payload = {
        name: nameInput.value.trim(),
        category: categorySelect.value,
        quantity_total: Number(qtyInput.value) || 1,
        description: descInput.value.trim() || null,
        start_time: buildTimeOnlyISO(startInput.value),
        end_time: buildTimeOnlyISO(endInput.value),
      };

      const { error } = await supabase
        .from("slots")
        .update(payload)
        .eq("id", slotId);

      if (error) {
        console.error("Error updating slot:", error);
        if (statusEl) {
          statusEl.textContent = "Error saving slot.";
          statusEl.className = "status-message status-error";
        }
        return;
      }

      if (statusEl) {
        statusEl.textContent = "Slot saved.";
        statusEl.className = "status-message status-success";
      }

      // Reload everything to sync view + edit UIs
      await loadSlots();
      break;
    }

    case "delete": {
      if (!confirm("Delete this slot?")) return;

      const { error } = await supabase
        .from("slots")
        .delete()
        .eq("id", slotId);

      if (error) {
        console.error("Error deleting slot:", error);
        return;
      }

      await loadSlots();
      break;
    }
  }
});

/* ------------------ Save Event Info ------------------ */

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
    eventStatus.textContent =
      "Title, date, and start time are required.";
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
    console.error("Error saving event:", error);
    eventStatus.textContent = "Error saving event.";
    eventStatus.className = "status-message status-error";
  } else {
    eventStatus.textContent = "Event saved.";
    eventStatus.className = "status-message status-success";
  }
});

/* ------------------ Add New Slot ------------------ */

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

  slotStatus.textContent = "Slot added.";
  slotStatus.className = "status-message status-success";
  newSlotForm.reset();
  document.getElementById("slot-qty").value = "1";
  await loadSlots();
});

/* ------------------ Kickoff ------------------ */

loadEvent();
