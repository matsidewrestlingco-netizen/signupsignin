const ADMIN_PASSWORD = "SAWATitans2026!"; // update when needed

document.getElementById("login-button").addEventListener("click", () => {
  const input = document.getElementById("admin-password").value.trim();

  if (input === ADMIN_PASSWORD) {
    localStorage.setItem("admin-auth", "true");
    window.location.href = "admin.html";
  } else {
    document.getElementById("login-error").style.display = "block";
  }
});
