// app.js - PUBLIC EVENT LISTING
import { supabase } from "./supabaseClient.js";

const eventsList = document.getElementById("eventsList");
const eventsMessage = document.getElementById("eventsMessage");

// Load all events
async function loadEvents() {
  eventsMessage.style.display = "none";
  eventsList.innerHTML = "<p>Loading events…</p>";

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events:", error);
    eventsMessage.textContent = "Error loading events.";
    eventsMessage.style.display = "block";
    eventsList.innerHTML = "";
    return;
  }

  // Filter out deleted events
  const activeEvents = (events || []).filter((ev) => !ev.deleted_at);

  if (activeEvents.length === 0) {
    eventsMessage.textContent = "No events are currently available.";
    eventsMessage.style.display = "block";
    eventsList.innerHTML = "";
    return;
  }

  // Clear loader
  eventsList.innerHTML = "";

  // Render each event as a card
  activeEvents.forEach((ev) => {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <h2>${ev.title}</h2>
      <p><strong>${formatDate(ev.start_time)}</strong></p>
      <p>${ev.location || ""}</p>

      <div style="margin-top: 12px;">
        <a class="btn btn-primary" href="event.html?id=${ev.id}">
          View Event
        </a>
      </div>
    `;

    eventsList.appendChild(card);
  });
}

// Format dates nicely
function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

// Start
loadEvents();
