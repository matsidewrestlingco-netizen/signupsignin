import { requireAdmin, logoutAdmin } from "./auth.js";

// Require login
requireAdmin();

// Enable log out
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }
});

// CHANGE THIS TO YOUR REAL ADMIN PASSWORD:
export const ADMIN_PASSWORD = "SAWATitans2026!";

// Redirects user to login page if NOT authenticated
export function requireAdmin() {
  const loggedIn = localStorage.getItem("matside_admin");
  if (!loggedIn) {
    window.location.href = "admin.html";
  }
}

// Handles "Create Event" form on admin.html

import { supabase } from "./supabaseClient.js";

const form = document.getElementById("create-event-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");

if (!form) {
  console.error("Create event form not found on page.");
}

// Utility: show status to the user
function setStatus(message, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
}

// Utility: build ISO strings from date + time inputs
function buildDateTimeISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

async function handleSubmit(e) {
  e.preventDefault();
  setStatus("", "info");

  const title = form.title.value.trim();
  const location = form.location.value.trim();
  const description = form.description.value.trim();
  const date = form.date.value;
  const startTime = form.startTime.value;
  const endTime = form.endTime.value;
  const isPublic = form.isPublic.checked;

  if (!title || !date || !startTime) {
    setStatus("Event name, date, and start time are required.", "error");
    return;
  }

  const start_iso = buildDateTimeISO(date, startTime);
  const end_iso = endTime ? buildDateTimeISO(date, endTime) : null;

  if (!start_iso) {
    setStatus("Could not parse start time. Please check your inputs.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const payload = {
      title,
      location: location || null,
      description: description || null,
      start_time: start_iso,
      end_time: end_iso,
      is_public: isPublic,
      // optional flags if your table has these:
      // deleted: false,
    };

    const { data, error } = await supabase
      .from("events")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      setStatus("Error creating event. Check console for details.", "error");
      return;
    }

    console.log("Event created:", data);

    setStatus("✅ Event created successfully!", "success");

    // Optionally, clear form for the next event
    form.reset();
    form.isPublic.checked = true;

    // Optionally, show link to admin events / public event
    if (data && data.id) {
      const adminEventsUrl = new URL("admin-events.html", window.location.href);
      const publicEventUrl = new URL("event.html", window.location.href);
      publicEventUrl.searchParams.set("id", data.id);

      const extra = document.createElement("div");
      extra.className = "status-links";
      extra.innerHTML = `
        <a href="${adminEventsUrl.toString()}">Go to Manage Events</a>
        <span> · </span>
        <a href="${publicEventUrl.toString()}" target="_blank">View Public Event</a>
      `;
      statusEl.appendChild(extra);
    }
  } catch (err) {
    console.error("Unexpected error creating event:", err);
    setStatus("Unexpected error creating event.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create event";
  }
}

// Reset button
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    form.reset();
    form.isPublic.checked = true;
    setStatus("");
  });
}

if (form) {
  form.addEventListener("submit", handleSubmit);
}
