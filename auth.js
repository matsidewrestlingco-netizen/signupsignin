// auth.js
export function requireAdmin() {
  const authed = localStorage.getItem("matside_admin");
  if (authed !== "true") {
    window.location.href = "admin-login.html";
  }
}

export function logoutAdmin() {
  localStorage.removeItem("matside_admin");
  window.location.href = "admin-login.html";
}
