// admin.js - Create Event page

import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// Enforce admin login immediately
requireAdmin();

document.addEventListener("DOMContentLoaded", () => {
  // Wire logout
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }

  const form = document.getElementById("createEventForm");
  const msgEl = document.getElementById("createEventMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgEl.textContent = "";

    const title = document.getElementById("event-title").value.trim();
    const start = document.getElementById("event-start").value;
    const location = document.getElementById("event-location").value.trim();
    const description =
      document.getElementById("event-description").value.trim();
    const isPublic = document.getElementById("event-public").checked;

    if (!title || !start) {
      msgEl.textContent = "Title and start time are required.";
      return;
    }

    const { error } = await supabase.from("events").insert({
      title,
      start_time: start,
      location: location || null,
      description: description || null,
      is_public: isPublic,
    });

    if (error) {
      console.error(error);
      msgEl.textContent = "Error creating event. Check console.";
      return;
    }

    msgEl.textContent = "Event created successfully!";
    form.reset();
    document.getElementById("event-public").checked = true;
  });
});
