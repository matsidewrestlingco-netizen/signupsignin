// admin-edit-event.js
import { supabase } from "./supabaseClient.js";

// Extract ?id= from URL
const url = new URL(window.location.href);
const eventId = url.searchParams.get("id");

// ----------------------------
// Utility: Convert HH:MM → HH:MM:00
// ----------------------------
function toPgTime(t) {
    return t ? `${t}:00` : null;
}

// ----------------------------
// Load Event Details
// ----------------------------
async function loadEvent() {
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (error) {
        console.error("Error loading event:", error);
        return;
    }

    // Populate form
    document.querySelector("#title").value = data.title || "";
    document.querySelector("#description").value = data.description || "";
    document.querySelector("#location").value = data.location || "";

    // Convert 2025-01-10T08:00:00Z → 2025-01-10
    document.querySelector("#date").value = data.start_time?.split("T")[0] || "";

    // Convert to HH:MM local values
    if (data.start_time) {
        const d = new Date(data.start_time);
        document.querySelector("#start_time").value = d.toISOString().slice(11, 16);
    }
    if (data.end_time) {
        const d = new Date(data.end_time);
        document.querySelector("#end_time").value = d.toISOString().slice(11, 16);
    }
}

// ----------------------------
// Load Existing Slots
// ----------------------------
async function loadSlots() {
    const container = document.querySelector("#existing-slots");
    container.innerHTML = "Loading…";

    const { data, error } = await supabase
        .from("slots")
        .select("*")
        .eq("event_id", eventId)
        .order("start_time", { ascending: true });

    if (error) {
        console.error("Error loading slots:", error);
        container.innerHTML = "<p>Error loading slots.</p>";
        return;
    }

    if (!data.length) {
        container.innerHTML = "<p>No slots created yet.</p>";
        return;
    }

    container.innerHTML = "";

    data.forEach(slot => {
        const slotDiv = document.createElement("div");
        slotDiv.className = "slot-card";

        slotDiv.innerHTML = `
            <div class="slot-header">
                <strong>${slot.name}</strong>
                <button class="delete-slot" data-id="${slot.id}">Delete</button>
            </div>
            <p>${slot.description || ""}</p>
            <p><strong>Qty:</strong> ${slot.quantity_total}</p>
            <p><strong>Time:</strong> 
                ${slot.start_time || "—"} 
                to 
                ${slot.end_time || "—"}
            </p>
            <p><strong>Category:</strong> ${slot.category || "—"}</p>
        `;

        container.appendChild(slotDiv);
    });

    // Attach delete listeners
    document.querySelectorAll(".delete-slot").forEach(btn => {
        btn.addEventListener("click", async e => {
            const slotId = e.target.dataset.id;
            await deleteSlot(slotId);
        });
    });
}

// ----------------------------
// Add New Slot
// ----------------------------
async function addSlot() {
    const name = document.querySelector("#slot-name").value.trim();
    const description = document.querySelector("#slot-description").value.trim();
    const qty = parseInt(document.querySelector("#slot-qty").value, 10);
    const start = document.querySelector("#slot-start").value;
    const end = document.querySelector("#slot-end").value;
    const category = document.querySelector("#slot-category").value;

    if (!name || !qty) {
        alert("Name and quantity are required.");
        return;
    }

    const payload = {
        event_id: eventId,
        name,
        description: description || null,
        quantity_total: qty,
        start_time: toPgTime(start),
        end_time: toPgTime(end),
        category: category || null
    };

    console.log("Adding slot:", payload);

    const { error } = await supabase
        .from("slots")
        .insert(payload);

    if (error) {
        console.error("Error adding slot:", error);
        alert("Error adding slot.");
        return;
    }

    alert("Slot added!");
    loadSlots();
}

// ----------------------------
// Delete Slot
// ----------------------------
async function deleteSlot(slotId) {
    const { error } = await supabase
        .from("slots")
        .delete()
        .eq("id", slotId);

    if (error) {
        console.error("Error deleting slot:", error);
        alert("Could not delete slot.");
        return;
    }

    loadSlots();
}

// ----------------------------
// Save Event Changes
// ----------------------------
async function saveEvent() {
    const title = document.querySelector("#title").value.trim();
    const description = document.querySelector("#description").value.trim();
    const location = document.querySelector("#location").value.trim();
    const date = document.querySelector("#date").value;
    const start = document.querySelector("#start_time").value;
    const end = document.querySelector("#end_time").value;

    const startTimestamp = date && start ? `${date}T${start}:00` : null;
    const endTimestamp = date && end ? `${date}T${end}:00` : null;

    const payload = {
        title,
        description,
        location,
        start_time: startTimestamp,
        end_time: endTimestamp
    };

    console.log("Saving event update:", payload);

    const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", eventId);

    if (error) {
        console.error("Error updating event:", error);
        alert("Could not save event.");
        return;
    }

    alert("Event updated!");
}

// ----------------------------
// Attach Button Listeners
// ----------------------------
document.querySelector("#save-event-btn").addEventListener("click", saveEvent);
document.querySelector("#add-slot-btn").addEventListener("click", addSlot);

// ----------------------------
// INITIAL LOAD
// ----------------------------
loadEvent();
loadSlots();
