// admin.js - Fixed version for Create Event
import { supabase } from "./supabaseClient.js";
import { requireAdmin, logoutAdmin } from "./auth.js";

// Enforce admin login
requireAdmin();

document.addEventListener("DOMContentLoaded", () => {
  // Logout wiring
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutAdmin);
  }

  const form = document.getElementById("createEventForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // MATCHED to HTML IDs
    const title = document.getElementById("title").value.trim();
    const start_time = document.getElementById("start_time").value;
    const location = document.getElementById("location").value.trim();
    const description = document.getElementById("description").value.trim();
    const is_public = document.getElementById("is_public").checked;

    // Basic validation
    if (!title || !start_time) {
      alert("Title and start time are required.");
      return;
    }

    // Insert into Supabase
    const { error } = await supabase.from("events").insert({
      title,
      start_time,
      location: location || null,
      description: description || null,
      is_public
    });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      alert("Error creating event. Check console.");
      return;
    }

    alert("Event created successfully!");
    window.location.href = "admin-events.html";
  });
});
