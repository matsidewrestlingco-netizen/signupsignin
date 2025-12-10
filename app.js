// app.js — Load and display all public events

import { supabase } from "./supabaseClient.js";

// DOM elements
const eventsList = document.getElementById("eventsList");
const eventsMessage = document.getElementById("eventsMessage");

// Load events immediately
document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
});

async function loadEvents() {
  eventsList.innerHTML = "<p>Loading events…</p>";
  eventsMessage.style.display = "none";

  // Fetch public events only
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_public", true)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events:", error);
    eventsMessage.textContent = "Unable to load events.";
    eventsMessage.style.display = "block";
    return;
  }

  if (!data || data.length === 0) {
    eventsList.innerHTML = "";
    eventsMessage.textContent = "No events are currently available.";
    eventsMessage.style.display = "block";
    return;
  }

  renderEvents(data);
}

function renderEvents(events) {
  eventsList.innerHTML = "";

  events.forEach((ev) => {
    const card = document.createElement("article");
    card.className = "card clickable";
    card.addEventListener("click", () => {
      window.location.href = `event.html?id=${ev.id}`;
    });

    card.innerHTML = `
      <h2>${ev.title}</h2>
      <p><strong>${formatDate(ev.start_time)}</strong></p>
      <p>${ev.location || ""}</p>
    `;

    eventsList.appendChild(card);
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
