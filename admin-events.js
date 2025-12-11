import { supabase } from "./supabaseClient.js";

const eventsList = document.getElementById("eventsList");

async function loadEvents() {
  eventsList.innerHTML = `<p>Loading events...</p>`;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error loading events:", error);
    eventsList.innerHTML = `<p class="error">Unable to load events.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    eventsList.innerHTML = `<p>No events found.</p>`;
    return;
  }

  eventsList.innerHTML = data.map(renderEventCard).join("");
}

function renderEventCard(event) {
  const date = new Date(event.start_time).toLocaleString();

  return `
    <div class="event-card">
      <h3>${event.title}</h3>

      <div class="event-meta">
        <strong>Date:</strong> ${date}<br>
        <strong>Location:</strong> ${event.location || "—"}
      </div>

      <div class="event-card-actions">
        <button class="btn-small primary"
          onclick="window.location.href='admin-edit-event.html?id=${event.id}'">
          Edit Event
        </button>

        <button class="btn-small secondary"
          onclick="deleteEvent('${event.id}')">
          Delete
        </button>
      </div>
    </div>
  `;
}

// DELETE EVENT
window.deleteEvent = async function (eventId) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    console.error("Delete failed:", error);
    alert("Error deleting event.");
    return;
  }

  loadEvents();
};

loadEvents();
