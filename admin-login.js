// admin-login.js

const ADMIN_PASSWORD = "SAWATitans2026!"; // update here if needed

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("admin-login-form");
  const input = document.getElementById("admin-password");
  const errorEl = document.getElementById("login-error");

  // If already logged in, skip to admin
  if (localStorage.getItem("matside_admin") === "true") {
    window.location.href = "admin-events.html";
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const value = input.value.trim();

    if (value === ADMIN_PASSWORD) {
      localStorage.setItem("matside_admin", "true");
      window.location.href = "admin-events.html";
    } else {
      errorEl.textContent = "Incorrect password.";
      errorEl.style.display = "block";
    }
  });
});
