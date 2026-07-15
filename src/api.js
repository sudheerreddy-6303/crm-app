// In production set VITE_API_URL to your backend URL (e.g. https://your-backend.up.railway.app)
const BASE = import.meta.env.VITE_API_URL || "";

export function getToken() {
  return localStorage.getItem("telecrm_token");
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem("telecrm_user")); } catch { return null; }
}
export function setSession(token, user) {
  localStorage.setItem("telecrm_token", token);
  localStorage.setItem("telecrm_user", JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem("telecrm_token");
  localStorage.removeItem("telecrm_user");
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  // ORIGINAL CODE (bug: redirected/reloaded page even when the login form itself
  // got a 401 for wrong password, so the error message never showed):
  // if (res.status === 401) {
  //   clearSession();
  //   window.location.href = "/login";
  //   throw new Error("Session expired. Please log in again.");
  // }
  // FIXED: only force-redirect for expired sessions on OTHER endpoints,
  // never for the login endpoint itself
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}
