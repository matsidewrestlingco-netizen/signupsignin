import { supabase } from "./supabaseClient.js";

// Format time like "8:00 AM"
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h);
  d.setMinutes(m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Get event ID from URL
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const titleEl = document.getElementById("event-title");
const dateEl = document.getElementById("event-date");
const locationEl = document.getElementById("event-location");
const descEl = document.getElementById("event-description");
const slotListEl = document.getElementById("slot-list");
const messageEl = document.getElementById("message");

// Load Event + Slots
async function loadEvent() {
  // Load Event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    titleEl.textContent = "Event Not Found";
    return;
  }

  titleEl.textContent = event.title;
  dateEl.textContent = new Date(event.start_time).toLocaleString();
  locationEl.textContent = event.location || "";
  descEl.textContent = event.description || "";

  // Load Slots + Signups
  const { data: slots, error: slotError } = await supabase
    .from("slots")
    .select("*, signups(*)")
    .eq("event_id", eventId)
    .order("category")
    .order("start_time");

  if (slotError) {
    slotListEl.textContent = "Error loading slots.";
    return;
  }

  renderSlots(slots);
}

// Render UI
function renderSlots(slots) {
  slotListEl.innerHTML = "";

  if (!slots.length) {
    slotListEl.textContent = "No slots created yet.";
    return;
  }

  const grouped = slots.reduce((acc, slot) => {
    const key = slot.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  Object.keys(grouped).forEach((cat) => {
    const catHeader = document.createElement("h3");
    catHeader.className = "slot-category-title";
    catHeader.textContent = cat;
    slotListEl.appendChild(catHeader);

    grouped[cat].forEach((slot) => {
      const filled = slot.signups.length;
      const remaining = slot.quantity_total - filled;

      const card = document.createElement("div");
      card.className = "slot-card";

      card.innerHTML = `
        <div class="slot-header">
          <div>
            <h4 class="slot-name">${slot.name}</h4>
            ${
              slot.start_time
                ? `<p class="slot-time">${formatTime(
                    slot.start_time
                  )} – ${formatTime(slot.end_time)}</p>`
                : ""
            }
            ${
              slot.description
                ? `<p class="slot-desc">${slot.description}</p>`
                : ""
            }
          </div>

          <div class="slot-counts">
            <p><strong>${filled}</strong> / ${slot.quantity_total}</p>
            <p class="${remaining <= 0 ? "full" : "remaining"}">
              ${
                remaining <= 0
                  ? "Full"
                  : `${remaining} remaining`
              }
            </p>
          </div>
        </div>

        ${
          remaining > 0
            ? `<button class="sign-btn" data-id="${slot.id}">Sign Up</button>`
            : ""
        }

        <div class="signup-form hidden" id="form-${slot.id}">
          <input placeholder="Full Name" id="name-${slot.id}" />
          <input placeholder="Email" id="email-${slot.id}" />
          <textarea placeholder="Optional note" id="note-${slot.id}"></textarea>

          <div class="form-actions">
            <button class="confirm-btn" data-id="${slot.id}">Confirm</button>
            <button class="cancel-btn" data-id="${slot.id}">Cancel</button>
          </div>
        </div>
      `;

      slotListEl.appendChild(card);
    });
  });

  attachEventListeners();
}

// Attach handlers to dynamic buttons
function attachEventListeners() {
  document.querySelectorAll(".sign-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      document.getElementById(`form-${id}`).classList.remove("hidden");
    });
  });

  document.querySelectorAll(".cancel-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      document.getElementById(`form-${id}`).classList.add("hidden");
    })
  );

  document.querySelectorAll(".confirm-btn").forEach((btn) =>
    btn.addEventListener("click", () => submitSignup(btn.dataset.id))
  );
}

// Submit Signup
async function submitSignup(slotId) {
  messageEl.textContent = "";

  const full_name = document.getElementById(`name-${slotId}`).value.trim();
  const email = document.getElementById(`email-${slotId}`).value.trim();
  const note = document.getElementById(`note-${slotId}`).value.trim();

  if (!full_name || !email) {
    messageEl.textContent = "Please enter name and email.";
    return;
  }

  const { error } = await supabase.from("signups").insert({
    slot_id: slotId,
    full_name,
    email,
    note,
  });

  if (error) {
    messageEl.textContent = "Error saving signup.";
    return;
  }

  messageEl.textContent = "You are signed up!";
  loadEvent(); // Refresh slots
}

loadEvent();
