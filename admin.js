// CHANGE THIS TO YOUR REAL ADMIN PASSWORD:
export const ADMIN_PASSWORD = "SAWATitans2026!";

// Redirects user to login page if NOT authenticated
export function requireAdmin() {
  const loggedIn = localStorage.getItem("matside_admin");
  if (!loggedIn) {
    window.location.href = "admin.html";
  }
}
