import { supabase } from "./supabaseClient.js";

// Get event ID from URL
const url = new URL(window.location.href);
const eventId = url.searchParams.get("id");

async function loadEvent() {
  const titleEl = document.getElementById("event-title");
  const dateEl = document.getElementById("event-date");
  const locationEl = document.getElementById("event-location");
  const descEl = document.getElementById("event-description");
  const slotListEl = document.getElementById("slot-list");
  const messageEl = document.getElementById("message");

  if (!eventId) {
    titleEl.textContent = "Event Not Found";
    return;
  }

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    titleEl.textContent = "Event Not Found";
    return;
  }

  // Fill event info
  titleEl.textContent = event.title;
  dateEl.textContent = new Date(event.start_time).toLocaleString();
  locationEl.textContent = event.location || "";
  descEl.textContent = event.description || "";

  // Fetch slots
  const { data: slots, error: slotError } = await supabase
    .from("slots")
    .select("*, signups(*)")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (slotError) {
    messageEl.textContent = "Error loading slots.";
    return;
  }

  if (!slots || slots.length === 0) {
    slotListEl.innerHTML = `<p>No slots have been created for this event.</p>`;
    return;
  }

  // Group slots by category
  const grouped = {};
  slots.forEach((slot) => {
    const key = slot.category || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  });

  // Render slot categories + cards
  slotListEl.innerHTML = "";

  Object.keys(grouped).forEach((categoryName) => {
    const niceName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    // CATEGORY HEADER
    const categoryHeader = document.createElement("h3");
    categoryHeader.className = "slot-category-header";
    categoryHeader.textContent = niceName;
    slotListEl.appendChild(categoryHeader);

    grouped[categoryName].forEach((slot) => {
      const filled = slot.signups?.length || 0;
      const remaining = slot.quantity_total - filled;

      const card = document.createElement("div");
      card.className = "card slot-card";

      card.innerHTML = `
        <h4 class="slot-title">${slot.name}</h4>
        <p class="slot-time">${slot.start_time || ""} – ${slot.end_time || ""}</p>
        <p><strong>${filled} / ${slot.quantity_total}</strong></p>
        <p class="slot-remaining">${remaining} remaining</p>

        ${
          remaining > 0
            ? `<button class="btn btn-primary signup-btn" data-slot="${slot.id}">
                 Sign Up
               </button>`
            : `<p class="slot-full">Full</p>`
        }
      `;

      slotListEl.appendChild(card);
    });
  });

  // Attach signup button handlers
  document.querySelectorAll(".signup-btn").forEach((btn) => {
    btn.addEventListener("click", () => openSignupForm(btn.dataset.slot));
  });
}

function openSignupForm(slotId) {
  const name = prompt("Your Name:");
  const email = prompt("Your Email:");

  if (!name || !email) return;

  supabase
    .from("signups")
    .insert({
      slot_id: slotId,
      full_name: name,
      email: email,
    })
    .then(({ error }) => {
      if (error) alert("Error saving signup.");
      else location.reload();
    });
}

loadEvent();
