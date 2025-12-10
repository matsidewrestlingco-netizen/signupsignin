import { supabase } from "./supabaseClient.js";

// Extract event if included (optional QR filtering)
const url = new URL(window.location.href);
const eventId = url.searchParams.get("event") || null;

const lastNameInput = document.querySelector("#last-name");
const emailInput = document.querySelector("#email");
const searchBtn = document.querySelector("#checkin-search-btn");
const resultsDiv = document.querySelector("#matching-signups");

searchBtn.addEventListener("click", async () => {
  const last = lastNameInput.value.trim().toLowerCase();
  const email = emailInput.value.trim().toLowerCase();

  if (!last || !email) {
    alert("Please enter last name and email.");
    return;
  }

  resultsDiv.innerHTML = "Searching…";

  // Search signups using last name + email
  let query = supabase
    .from("signups")
    .select(`id, full_name, email, checked_in, checked_in_at, slot:slots(name,event_id,start_time,end_time)`)
    .eq("email", email);

  if (eventId) {
    // restrict to a specific event
    query = query.eq("slot.event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    resultsDiv.innerHTML = `<p style="color:red">Error searching signups.</p>`;
    return;
  }

  // Filter last names manually (Supabase can't reliably do contains match on composite name)
  const matches = data.filter(s => {
    const ln = s.full_name.split(" ").slice(-1)[0].toLowerCase();
    return ln.startsWith(last);
  });

  if (matches.length === 0) {
    resultsDiv.innerHTML = `<p>No matching signups found.</p>`;
    return;
  }

  // Render each signup card
  resultsDiv.innerHTML = "";

  matches.forEach(signup => {
    const card = document.createElement("div");
    card.className = "signup-card";

    const isChecked = signup.checked_in;

    card.innerHTML = `
      <h3>${signup.slot.name}</h3>
      <p><strong>Parent:</strong> ${signup.full_name}</p>
      <p><strong>Email:</strong> ${signup.email}</p>
      <p><strong>Time:</strong> ${signup.slot.start_time || ""} - ${signup.slot.end_time || ""}</p>
      <p><strong>Status:</strong> 
        ${isChecked 
          ? `<span style="color:green;font-weight:bold;">Checked In</span>` 
          : `<span style="color:red;font-weight:bold;">Not Checked In</span>`
        }
      </p>

      ${
        isChecked
          ? `<div class="checkin-success">You checked in at ${new Date(signup.checked_in_at).toLocaleTimeString()}</div>`
          : `<button class="checkin-list-btn" data-id="${signup.id}">Check In</button>`
      }
    `;

    resultsDiv.appendChild(card);
  });

  // Attach check-in button logic
  document.querySelectorAll(".checkin-list-btn").forEach(btn => {
    btn.addEventListener("click", () => checkIn(btn.dataset.id));
  });
});

// Perform check-in
async function checkIn(signupId) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("signups")
    .update({
      checked_in: true,
      checked_in_at: now
    })
    .eq("id", signupId);

  if (error) {
    console.error(error);
    alert("Error checking in.");
    return;
  }

  // Reload results
  document.querySelector("#checkin-search-btn").click();
}
