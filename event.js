import { supabase } from "./supabaseClient.js";

// ---------- DOM ELEMENTS ----------
const titleEl = document.getElementById("eventTitle");
const dateEl = document.getElementById("eventDate");
const descEl = document.getElementById("eventDescription");
const slotListEl = document.getElementById("slotList");

// Extract event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get("id");

// ---------- INITIAL LOAD ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadEvent();
  await loadSlots();
});

// ---------- LOAD EVENT ----------
async function loadEvent() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Error loading event:", error);
    return;
  }

  titleEl.textContent = data.title;
  dateEl.textContent = formatDate(data.start_time);
  descEl.textContent = data.description || "";
}

// ---------- LOAD SLOTS ----------
async function loadSlots() {
  slotListEl.innerHTML = "<p>Loading slots…</p>";

  const { data: slots, error } = await supabase
    .from("slots")
    .select("*, signups(full_name)")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading slots:", error);
    slotListEl.innerHTML = "<p>Error loading slots.</p>";
    return;
  }

  if (!slots.length) {
    slotListEl.innerHTML = "<p>No slots available.</p>";
    return;
  }

  // Sort alphabetically by category
  slots.sort((a, b) => a.category.localeCompare(b.category));

  // Render with category headers
  renderSlots(slots);
}

// ---------- RENDER SLOTS WITH CATEGORY HEADERS ----------
function renderSlots(slots) {
  slotListEl.innerHTML = "";

  const grouped = {};

  slots.forEach(slot => {
    if (!grouped[slot.category]) grouped[slot.category] = [];
    grouped[slot.category].push(slot);
  });

  let html = "";

  Object.keys(grouped).forEach(category => {
    html += `<h2 class="slot-category-header">${category}</h2>`;

    grouped[category].forEach(slot => {
      const filled = slot.signups?.length || 0;
      const remaining = slot.quantity_total - filled;

      const signupNamesHTML =
        filled > 0
          ? `
          <div class="signup-list">
            <strong>Signed Up:</strong>
            <ul>
              ${slot.signups.map(s => `<li>${s.full_name}</li>`).join("")}
            </ul>
          </div>`
          : `<p class="helper-text">No signups yet.</p>`;

      html += `
        <article class="card">
          <h3>${slot.name}</h3>

          ${
            slot.start_time && slot.end_time
              ? `<p><strong>${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}</strong></p>`
              : ""
          }

          <p><strong>${remaining}</strong> spots remaining</p>

          ${signupNamesHTML}

          ${
            remaining > 0
              ? `
                <button class="btn btn-primary signup-btn" data-slot="${slot.id}">
                  Sign Up
                </button>

                <div class="signup-form" id="form-${slot.id}" style="display:none;">

                  <div class="signup-row">
                    <input type="text" class="input-name" placeholder="Your name">
                    <input type="email" class="input-email" placeholder="Your email">
                  </div>

                  <textarea class="input-note" placeholder="Optional note"></textarea>

                  <div class="signup-buttons">
                    <button class="btn btn-primary confirm-btn" data-slot="${slot.id}">Confirm</button>
                    <button class="btn btn-secondary cancel-btn" data-slot="${slot.id}">Cancel</button>
                  </div>

                </div>
              `
              : `<p class="helper-text">This slot is full.</p>`
          }

        </article>
      `;
    });

    html += `<hr/>`;
  });

  slotListEl.innerHTML = html;

  enableSignupButtons();
}

// ---------- ENABLE SIGNUP BUTTONS ----------
function enableSignupButtons() {
  document.querySelectorAll(".signup-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const slotId = btn.dataset.slot;
      const form = document.getElementById(`form-${slotId}`);
      form.style.display = "block";
      btn.style.display = "none";
    });
  });

  document.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const slotId = btn.dataset.slot;
      const form = document.getElementById(`form-${slotId}`);
      const signupBtn = document.querySelector(`.signup-btn[data-slot="${slotId}"]`);

      form.style.display = "none";
      signupBtn.style.display = "block";
    });
  });

  document.querySelectorAll(".confirm-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const slotId = btn.dataset.slot;
      await submitSignup(slotId);
    });
  });
}

// ---------- SUBMIT SIGNUP ----------
async function submitSignup(slotId) {
  const form = document.getElementById(`form-${slotId}`);
  const name = form.querySelector(".input-name").value.trim();
  const email = form.querySelector(".input-email").value.trim();
  const note = form.querySelector(".input-note").value.trim();

  if (!name || !email) {
    alert("Please enter your name and email.");
    return;
  }

  const { error } = await supabase.from("signups").insert({
    slot_id: slotId,
    full_name: name,
    email: email,
    note: note,
    event_id: eventId
  });

  if (error) {
    console.error("Error submitting signup:", error);
    alert("Something went wrong. Please try again.");
    return;
  }

  await loadSlots(); // refresh UI
}

// ---------- FORMATTERS ----------
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(timeString) {
  return new Date(timeString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}
