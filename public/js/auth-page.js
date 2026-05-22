import { api } from "./api.js";

const form = document.getElementById("auth-form");
const errorEl = document.getElementById("auth-error");
const submitBtn = document.getElementById("auth-submit");
const mode = document.body.dataset.authMode;

async function redirectIfLoggedIn() {
  try {
    await api("/api/auth/me");
    window.location.href = "/dashboard";
  } catch {
    /* not logged in */
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  submitBtn.disabled = true;

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    if (mode === "register") {
      await api("/api/auth/register", {
        method: "POST",
        body: { username, password },
      });
    } else {
      await api("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
    }
    window.location.href = "/dashboard";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

redirectIfLoggedIn();
