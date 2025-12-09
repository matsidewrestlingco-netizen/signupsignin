import { supabase } from "./supabaseClient.js";

/* Utility to read ?id from URL */
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

if (!eventId) {
  alert("No event ID provided.");
}

/* ELEMENTS */
const eventForm = document.getElementById("event-form");
const eventStatus = document.getElementById("event-status");

const slotList = document.getElementById("slot-list");
const newSlotForm = document.getElementById("new-slot-form");
const slotStatus = document.getElementById("slot-status");

/* Load event + slots */
async function loadEvent() {
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error(error);
    eventStatus.textContent = "Error loading event.";
    return;
  }

  // Populate form
  document.getElementById("title").value = event.title || "";
  document.getElementById("location").value = event.location || "";

  const date = event.start_time?.split("T")[0] || "";
  const startTime = event.start_time?.split("T")[1]?.slice(0, 5) || "";
  const endTime = event.end_time?.split("T")[1]?.slice(0, 5) || "";

  document.getElementById("date").value = date;
  document.getElementById("startTime").value = startTime;
  document.getElementById("endTime").value = endTime;

  document.getElementById("description").value = event.description || "";
  document.getElementById("isPublic").checked = event.is_public;

  loadSlots();
}

/* Load slots */
async function loadSlots() {
  const { data: slots, error } = await supabase
    .from("slots")
    .select("*, signups(count)")
    .eq("event_id", eventId)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    slotList.textContent = "Error loading slots.";
    return;
  }

  slotList.innerHTML = "";

  if (!slots.length) {
    slotList.innerHTML = "<p>No slots yet.</p>";
    return;
  }

  slots.forEach((slot) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.marginBottom = "12px";

    div.innerHTML = `
      <h3>${slot.name}</h3>
      <p><strong>Category:</strong> ${slot.category}</p>
      <p><strong>Quantity:</strong> ${slot.quantity_total}</p>
      <p><strong>Filled:</strong> ${slot.signups?.length || 0}</p>
      ${
        slot.start_time
          ? `<p><strong>Time:</strong> ${slot.start_time} → ${
              slot.end_time || ""
            }</p>`
          : ""
      }
      <button data-delete="${slot.id}" class="btn-ghost">Delete</button>
    `;

    slotList.appendChild(div);
  });

  // Add delete listeners
  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if (!confirm("Delete this slot?")) return;

      const { error } = await supabase
        .from("slots")
        .delete()
        .eq("id", id);

      if (error) console.error(error);
      loadSlots();
    });
  });
}

/* Save event info */
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  eventStatus.textContent = "Saving…";

  const title = document.getElementById("title").value;
  const location = document.getElementById("location").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const desc = document.getElementById("description").value;
  const isPublic = document.getElementById("isPublic").checked;

  const startISO = new Date(`${date}T${start}`).toISOString();
  const endISO = end ? new Date(`${date}T${end}`).toISOString() : null;

  const { error } = await supabase
    .from("events")
    .update({
      title,
      location,
      description: desc,
      start_time: startISO,
      end_time: endISO,
      is_public: isPublic
    })
    .eq("id", eventId);

  if (error) {
    console.error(error);
    eventStatus.textContent = "Error saving event.";
  } else {
    eventStatus.textContent = "Saved!";
  }
});

/* Add new slot */
newSlotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  slotStatus.textContent = "Saving…";

  const name = document.getElementById("slot-name").value;
  const category = document.getElementById("slot-category").value;
  const qty = +document.getElementById("slot-qty").value;
  const desc = document.getElementById("slot-description").value;

  const start = document.getElementById("slot-start").value;
  const end = document.getElementById("slot-end").value;

  const startISO = start ? new Date(`2000-01-01T${start}`).toISOString() : null;
  const endISO = end ? new Date(`2000-01-01T${end}`).toISOString() : null;

  const { error } = await supabase.from("slots").insert({
    event_id: eventId,
    name,
    category,
    description: desc || null,
    quantity_total: qty,
    start_time: startISO,
    end_time: endISO
  });

  if (error) {
    console.error(error);
    slotStatus.textContent = "Error adding slot.';
    return;
  }

  slotStatus.textContent = "Slot added!";
  newSlotForm.reset();
  loadSlots();
});

/* Start */
loadEvent();
