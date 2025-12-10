// admin-login.js

const ADMIN_PASSWORD = "SAWATitans2026!"; // your password

document
  .getElementById("admin-login-form")
  .addEventListener("submit", (e) => {
    e.preventDefault();

    const input = document.getElementById("admin-password").value.trim();
    const errorEl = document.getElementById("login-error");

    if (input === ADMIN_PASSWORD) {
      localStorage.setItem("matside_admin", "true");
      window.location.href = "admin-events.html";
    } else {
      errorEl.textContent = "Incorrect password.";
      errorEl.style.display = "block";
    }
  });
