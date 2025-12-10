// admin-events.js
import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// Enforce admin login
requireAdmin();

// Module-scoped variables for DOM + data
let eventsContainer;
let searchInput;
let sortSelect;
let toggleUpcoming;

let allEvents = [];
let slotStats = {};

document.addEventListener("DOMContentLoaded", () => {
  // Wire logout
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }

  // Grab DOM elements
  eventsContainer = document.getElementById("adminEventsList");
  searchInput = document.getElementById("search-input");
  sortSelect = document.getElementById("sort-select");
  toggleUpcoming = document.getElementById("toggle-upcoming");

  // Event listeners
  searchInput?.addEventListener("input", renderEvents);
  sortSelect?.addEventListener("change", renderEvents);
  toggleUpcoming?.addEventListener("change", renderEvents);

  eventsContainer.addEventListener("click", handleEventsContainerClick);

  // Load data
  loadEvents();
});

async function loadEvents() {
  eventsContainer.innerHTML = "<p>Loading events…</p>";

  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (eventError) {
    console.error(eventError);
    eventsContainer.innerHTML = "<p>Error loading events.</p>";
    return;
  }

  allEvents = (events || []).filter((ev) => !ev.deleted_at);

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

function renderEvents() {
  if (!eventsContainer) return;

  let events = [...allEvents];
  const now = new Date();

  if (toggleUpcoming?.checked) {
    events = events.filter((ev) => new Date(ev.start_time) >= now);
  }

  const q = searchInput?.value.toLowerCase().trim();
  if (q) {
    events = events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        (ev.location || "").toLowerCase().includes(q)
    );
  }

  const sort = sortSelect?.value;
  events.sort((a, b) => {
    if (sort === "date-asc")
      return new Date(a.start_time) - new Date(b.start_time);
    if (sort === "date-desc")
      return new Date(b.start_time) - new Date(a.start_time);
    if (sort === "title-asc") return a.title.localeCompare(b.title);
    if (sort === "title-desc") return b.title.localeCompare(a.title);
    return 0;
  });

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
    card.className = "card";

    card.innerHTML = `
      <h2>${ev.title}</h2>
      <p><strong>${formatDate(ev.start_time)}</strong></p>
      <p>${ev.location || ""}</p>
      <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;">
      <p><strong>${stats.totalSlots}</strong> slots • <strong>${stats.totalSignups}</strong> signups • ${fillRate}% full</p>

      <div style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
        <a class="btn btn-primary" href="admin-edit-event.html?id=${ev.id}">Edit Event</a>
        <a class="btn btn-secondary" href="event.html?id=${ev.id}" target="_blank">View Public</a>
        <button class="btn btn-danger delete-event-btn" data-event-id="${ev.id}">
          Delete
        </button>
      </div>
    `;

    eventsContainer.appendChild(card);
  });
}

function handleEventsContainerClick(e) {
  const btn = e.target.closest(".delete-event-btn");
  if (!btn) return;

  const eventId = btn.dataset.eventId;
  if (!eventId) return;

  const ok = confirm(
    "Are you sure you want to delete this event? It will disappear from public view."
  );
  if (!ok) return;

  deleteEvent(eventId);
}

async function deleteEvent(eventId) {
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
