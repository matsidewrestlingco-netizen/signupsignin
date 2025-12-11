// event.js — Public event detail + slot signup

import { supabase } from "./supabaseClient.js";

// Parse event ID from URL
const url = new URL(window.location.href);
const eventId = url.searchParams.get("id");

if (!eventId) {
  alert("Missing event ID.");
  window.location.href = "index.html";
}

// DOM elements
const titleEl = document.getElementById("event-title");
const dateEl = document.getElementById("event-date");
const locationEl = document.getElementById("event-location");
const descriptionEl = document.getElementById("event-description");
const slotListEl = document.getElementById("slot-list");
const messageEl = document.getElementById("message");

document.addEventListener("DOMContentLoaded", () => {
  loadEvent();
  loadSlots();
});

// ------------------------
// Load Event Details
// ------------------------
async function loadEvent() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !data) {
    titleEl.textContent = "Event not found.";
    return;
  }

  titleEl.textContent = data.title;
  dateEl.textContent = formatDate(data.start_time);
  locationEl.textContent = data.location || "";
  descriptionEl.textContent = data.description || "";
}

// ------------------------
// Load Available Slots
// ------------------------
async function loadSlots() {
  slotListEl.innerHTML = "<p>Loading slots…</p>";

  const { data, error } = await supabase
    .from("slots")
    .select("*, signups(full_name)")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading slots:", error);
    slotListEl.innerHTML = "<p>Error loading slots.</p>";
    return;
  }

  if (!data.length) {
    slotListEl.innerHTML = "<p>No slots available.</p>";
    return;
  }

  // Sort slots alphabetically by category
slots.sort((a, b) => a.category.localeCompare(b.category));

  renderSlots(data);
}

function renderSlots(slots) {
  slotListEl.innerHTML = "";

  slots.forEach((slot) => {
    const filled = slot.signups?.length || 0;
    const remaining = slot.quantity_total - filled;

    const card = document.createElement("article");
    card.className = "card";

    // Build the signup name list
    const signupNamesHTML =
      filled > 0
        ? `
        <div class="signup-list">
          <strong>Signed Up:</strong>
          <ul>
            ${slot.signups
              .map((s) => `<li>${s.full_name}</li>`)
              .join("")}
          </ul>
        </div>`
        : `<p class="helper-text">No signups yet.</p>`;

    card.innerHTML = `
      <h3>${slot.name}</h3>

      ${
        slot.start_time && slot.end_time
          ? `<p><strong>${formatTime(slot.start_time)} – ${formatTime(
              slot.end_time
            )}</strong></p>`
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
    `;

    slotListEl.appendChild(card);
  });

  enableSignupButtons();
}

// ------------------------
// Signup Flow
// ------------------------
function enableSignupButtons() {
  document.querySelectorAll(".signup-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slotId = btn.dataset.slot;
      document.getElementById(`form-${slotId}`).style.display = "block";
    });
  });

  document.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slotId = btn.dataset.slot;
      document.getElementById(`form-${slotId}`).style.display = "none";
    });
  });

  document.querySelectorAll(".confirm-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const slotId = btn.dataset.slot;
      submitSignup(slotId);
    });
  });
}

async function submitSignup(slotId) {
  messageEl.textContent = "";

  const form = document.getElementById(`form-${slotId}`);
  const fullName = form.querySelector(".input-name").value.trim();
  const email = form.querySelector(".input-email").value.trim();
  const note = form.querySelector(".input-note").value.trim() || null;

  if (!fullName || !email) {
    messageEl.textContent = "Please enter your name and email.";
    return;
  }

  const { error } = await supabase.from("signups").insert({
    slot_id: slotId,
    full_name: fullName,
    email,
    note,
  });

  if (error) {
    console.error(error);
    messageEl.textContent = "Signup failed.";
    return;
  }

  messageEl.textContent = "Signup successful!";
  loadSlots();
}

// ------------------------
// Helpers
// ------------------------
function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(timeString) {
  if (!timeString) return "";
  const [hour, minute] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
