// admin-events.js
// Admin dashboard: load events, stats, sorting, filtering

import { supabase } from "./supabaseClient.js";

/* --------------------------
   DOM elements
-------------------------- */

const eventsContainer = document.getElementById("events-container");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const toggleUpcoming = document.getElementById("toggle-upcoming");

/* Cached data */
let allEvents = [];
let slotStats = {};

/* --------------------------
   Load all events
-------------------------- */

async function loadEvents() {
  eventsContainer.innerHTML = "<p>Loading events…</p>";

  // Fetch events
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (eventError) {
    console.error(eventError);
    eventsContainer.innerHTML = "<p>Error loading events.</p>";
    return;
  }

  allEvents = (events || []).filter(ev => !ev.deleted_at);

  // Fetch slot stats
  const { data: slots, error: slotError } = await supabase
    .from("slots")
    .select("event_id, quantity_total, signups(id)");

  if (slotError) {
    console.error(slotError);
    return;
  }

  slotStats = {};

  for (const s of slots || []) {
    const eventId = s.event_id;
    const filled = s.signups?.length || 0;

    if (!slotStats[eventId]) {
      slotStats[eventId] = {
        totalSlots: 0,
        totalCapacity: 0,
        totalSignups: 0,
      };
    }

    slotStats[eventId].totalSlots += 1;
    slotStats[eventId].totalCapacity += Number(s.quantity_total || 0);
    slotStats[eventId].totalSignups += filled;
  }

  renderEvents();
}

/* --------------------------
   Render event cards
-------------------------- */

function renderEvents() {
  let events = [...allEvents];

  const now = new Date();

  // Filter: show upcoming only
  if (toggleUpcoming.checked) {
    events = events.filter((ev) => new Date(ev.start_time) >= now);
  }

  // Filter: search
  const q = searchInput.value.toLowerCase().trim();
  if (q) {
    events = events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        (ev.location || "").toLowerCase().includes(q)
    );
  }

  // Sort
  const sort = sortSelect.value;
  events.sort((a, b) => {
    if (sort === "date-asc") {
      return new Date(a.start_time) - new Date(b.start_time);
    }
    if (sort === "date-desc") {
      return new Date(b.start_time) - new Date(a.start_time);
    }
    if (sort === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "title-desc") {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  // Render
  if (!events.length) {
    eventsContainer.innerHTML = "<p>No events match your filters.</p>";
    return;
  }

  eventsContainer.innerHTML = "";

  events.forEach((ev) => {
    const stats = slotStats[ev.id] || {
      totalSlots: 0,
      totalCapacity: 0,
      totalSignups: 0,
    };

    const fillRate = stats.totalCapacity
      ? Math.round((stats.totalSignups / stats.totalCapacity) * 100)
      : 0;

    const card = document.createElement("article");
    card.className = "card admin-event-card";

    card.innerHTML = `
      <div class="admin-event-header">
        <h3 class="admin-event-title">${ev.title}</h3>
        <p class="admin-event-datetime">${formatDate(ev.start_time)}</p>
        <p class="admin-event-location">${ev.location || ""}</p>
      </div>

      <div class="admin-event-stats">
        <p><strong>${stats.totalSlots}</strong> slots</p>
        <p><strong>${stats.totalSignups}</strong> signups</p>
        <p><strong>${fillRate}%</strong> full</p>
      </div>

      <div class="admin-event-actions">
        <a class="btn-primary admin-btn" href="admin-edit-event.html?id=${ev.id}">Edit</a>
        <a class="btn-ghost admin-btn" href="admin-signups.html?id=${ev.id}">View Signups</a>
        <a class="btn-ghost admin-btn" href="event.html?id=${ev.id}" target="_blank">Public View</a>
        <button class="btn-danger admin-btn delete-event-btn" data-event-id="${ev.id}">
          Delete
        </button>
      </div>
    `;

    eventsContainer.appendChild(card);
  });
}

/* --------------------------
   Format date
-------------------------- */

function formatDate(iso) {
  const dt = new Date(iso);
  return dt.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* --------------------------
   Handlers
-------------------------- */

searchInput.addEventListener("input", renderEvents);
sortSelect.addEventListener("change", renderEvents);
toggleUpcoming.addEventListener("change", renderEvents);

/* --------------------------
   Delete Event (Soft Delete)
-------------------------- */
eventsContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-event-btn");
  if (!btn) return;

  const eventId = btn.dataset.eventId;

  const ok = confirm("Are you sure you want to delete this event? This action can be undone, but it will disappear from public view.");
  if (!ok) return;

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    alert("Error deleting event. Check console.");
    console.error(error);
    return;
  }

  await loadEvents();
});

/* --------------------------
   Init
-------------------------- */

loadEvents();
