// event.js
// Public event page: load event, group slots, handle signup

import { supabase } from "./supabaseClient.js";

/* ------------------ Helpers ------------------ */

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const CATEGORY_LABELS = {
  volunteer: "Volunteers",
  food: "Food Donations",
  concessions: "Concessions",
  admissions: "Admissions / Front Desk",
  matcrew: "Mat Crew",
  other: "Other",
  uncategorized: "Other",
};

const CATEGORY_ORDER = [
  "volunteer",
  "concessions",
  "food",
  "admissions",
  "matcrew",
  "other",
  "uncategorized",
];

function formatDateTime(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  return dt.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------ DOM refs ------------------ */

const headerTitle = document.getElementById("event-title");
const headerDatetime = document.getElementById("event-datetime");
const headerLocation = document.getElementById("event-location");
const headerDesc = document.getElementById("event-description");
const headerStatus = document.getElementById("event-status-message");

const slotsContainer = document.getElementById("slots-container");
const slotsSection = document.getElementById("slots-section");

const signupSelectedLabel = document.getElementById("signup-selected-label");
const signupForm = document.getElementById("signup-form");
const signupSlotIdInput = document.getElementById("signup-slot-id");
const signupNameInput = document.getElementById("signup-name");
const signupEmailInput = document.getElementById("signup-email");
const signupNoteInput = document.getElementById("signup-note");
const signupStatus = document.getElementById("signup-status");

let currentSlots = []; // cached slots for re-render after signup

/* ---- Aggregate totals ---- */
const totalCapacity = currentSlots.reduce(
  (sum, s) => sum + (s.quantity_total || 0),
  0
);
const totalSignups = currentSlots.reduce(
  (sum, s) => sum + (s.signups?.length || 0),
  0
);
const fillRate =
  totalCapacity > 0
    ? Math.round((totalSignups / totalCapacity) * 100)
    : 0;

/* Update event stats in header */
const statsEl = document.getElementById("event-stats");
statsEl.textContent = `${totalSignups} signups • ${totalCapacity} total spots (${fillRate}% full)`;

/* ------------------ Load Event + Slots ------------------ */

async function loadEvent() {
  if (!eventId) {
    headerTitle.textContent = "Event not found.";
    headerStatus.textContent = "No event ID provided in the link.";
    slotsSection.style.display = "none";
    return;
  }

  headerTitle.textContent = "Loading event…";

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    console.error("Error loading event:", error);
    headerTitle.textContent = "Event not found.";
    headerStatus.textContent =
      "We couldn’t load this event. It may have been removed.";
    slotsSection.style.display = "none";
    return;
  }

  // Fill in header info
  headerTitle.textContent = event.title || "Untitled event";
  headerDatetime.textContent = event.start_time
    ? formatDateTime(event.start_time)
    : "";

  headerLocation.textContent = event.location
    ? event.location
    : "";

  headerDesc.textContent = event.description || "";

  // Load slots
  await loadSlots();
}

async function loadSlots() {
  slotsContainer.innerHTML = "<p>Loading slots…</p>";

  const { data: slots, error } = await supabase
    .from("slots")
    .select("*, signups(id)")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error loading slots:", error);
    slotsContainer.innerHTML =
      "<p>We couldn’t load slots for this event.</p>";
    return;
  }

  currentSlots = slots || [];
  renderSlots();
}

/* ------------------ Render Slots ------------------ */

function renderSlots() {
  if (!currentSlots.length) {
    slotsContainer.innerHTML = "<p>No slots have been created yet.</p>";
    return;
  }

  // Enrich slots with filled/remaining and safe category
  const enriched = currentSlots.map((slot) => {
    const filled = slot.signups?.length || 0;
    const remaining = Math.max(
      0,
      (slot.quantity_total || 0) - filled
    );
    return {
      ...slot,
      filled,
      remaining,
      category: slot.category || "uncategorized",
    };
  });

  // Group by category
  const grouped = {};
  for (const slot of enriched) {
    const key = slot.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  // Build ordered category list
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]?.length),
    ...Object.keys(grouped).filter(
      (c) => !CATEGORY_ORDER.includes(c)
    ),
  ];

  slotsContainer.innerHTML = "";

  orderedCategories.forEach((catKey) => {
    const list = grouped[catKey];
    if (!list || !list.length) return;

    // Sort inside category: by start_time then name
    list.sort((a, b) => {
      const at = a.start_time || "";
      const bt = b.start_time || "";
      if (at && bt && at !== bt) return at.localeCompare(bt);
      return (a.name || "").localeCompare(b.name || "");
    });

    const section = document.createElement("div");
    section.className = "slot-category-group";

    const heading = document.createElement("h4");
    heading.className = "slot-category-heading";
    heading.textContent =
      CATEGORY_LABELS[catKey] || catKey || "Other";
    section.appendChild(heading);

    const listContainer = document.createElement("div");
    listContainer.className = "slot-card-grid";

    list.forEach((slot) => {
      const card = document.createElement("article");
      card.className = "card slot-card";

      const title = document.createElement("h5");
      title.className = "slot-card-title";
      title.textContent = slot.name || "Untitled slot";

      const meta = document.createElement("p");
      meta.className = "slot-card-meta";
      const parts = [];

      if (slot.start_time) {
        const start = formatTime(slot.start_time);
        const end = slot.end_time ? formatTime(slot.end_time) : "";
        parts.push(end ? `${start} – ${end}` : start);
      }

      if (parts.length) {
        meta.textContent = parts.join(" · ");
      } else {
        meta.textContent = "";
      }

      const desc = document.createElement("p");
      desc.className = "slot-card-desc";
      desc.textContent = slot.description || "";

      const stats = document.createElement("p");
      stats.className = "slot-card-stats";
      stats.textContent = `${slot.filled}/${slot.quantity_total || 0} filled`;
      const badge = document.createElement("span");
      badge.className =
        "slot-card-badge " +
        (slot.remaining > 0 ? "badge-open" : "badge-full");
      badge.textContent =
        slot.remaining > 0
          ? `${slot.remaining} spots left`
          : "Full";

      const footer = document.createElement("div");
      footer.className = "slot-card-footer";

      const left = document.createElement("div");
      left.appendChild(stats);
      left.appendChild(badge);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-primary slot-signup-btn";

      if (slot.remaining > 0) {
        btn.textContent = "Sign up";
        btn.dataset.slotId = slot.id;
        btn.dataset.slotName = slot.name || "";
      } else {
        btn.textContent = "Full";
        btn.disabled = true;
        btn.classList.add("slot-btn-full");
      }

      footer.appendChild(left);
      footer.appendChild(btn);

      card.appendChild(title);
      if (meta.textContent) card.appendChild(meta);
      if (desc.textContent) card.appendChild(desc);
      card.appendChild(footer);

      listContainer.appendChild(card);
    });

    section.appendChild(listContainer);
    slotsContainer.appendChild(section);
  });
}

/* ------------------ Handle Slot Selection ------------------ */

slotsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".slot-signup-btn");
  if (!btn || btn.disabled) return;

  const slotId = btn.dataset.slotId;
  const slotName = btn.dataset.slotName || "Selected slot";

  signupSlotIdInput.value = slotId;
  signupSelectedLabel.textContent = `Signing up for: ${slotName}`;
  signupSelectedLabel.classList.add("signup-selected-active");

  // Scroll to signup section
  document
    .getElementById("signup-section")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ------------------ Handle Signup Submit ------------------ */

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupStatus.textContent = "";
  signupStatus.className = "status-message status-info";

  const slotId = signupSlotIdInput.value;
  const full_name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const note = signupNoteInput.value.trim();

  if (!slotId) {
    signupStatus.textContent =
      "Please select a slot above before submitting.";
    signupStatus.className = "status-message status-error";
    return;
  }

  if (!full_name || !email) {
    signupStatus.textContent =
      "Name and email are required to sign up.";
    signupStatus.className = "status-message status-error";
    return;
  }

  signupStatus.textContent = "Saving your signup…";

  const { error } = await supabase.from("signups").insert({
    slot_id: slotId,
    full_name,
    email,
    note: note || null,
  });

  if (error) {
    console.error("Error creating signup:", error);
    signupStatus.textContent =
      "There was an issue saving your signup. Please try again.";
    signupStatus.className = "status-message status-error";
    return;
  }

  signupStatus.textContent = "You’re signed up. Thank you!";
  signupStatus.className = "status-message status-success";

  // Clear only the note; keep name/email so they can sign up for more
  signupNoteInput.value = "";

  // Reload slots to update counts & full/remaining
  await loadSlots();
});

/* ------------------ Init ------------------ */

loadEvent();
