// In production set REACT_APP_API_URL to your backend URL (e.g. https://your-backend.up.railway.app)
// ORIGINAL (Vite): const BASE = import.meta.env.VITE_API_URL || "";
// ADDED (CRA): Create React App reads env variables from process.env.REACT_APP_*
const BASE = process.env.REACT_APP_API_URL || "";

// ADDED: success / error popup after every save, update, delete, convert,
// assign and import. Shown by components/Popup.jsx (mounted in App.jsx).
// Not shown for: reading data (GET), logging in, and the leads Excel import
// (that page already has its own "Import Successful!" popup).
function firePopup(type, text) {
  window.dispatchEvent(new CustomEvent("crm-popup", { detail: { type, text } }));
}
const NO_POPUP_PATHS = ["/auth/login", "/leads/import"];

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
  // ORIGINAL: if (!res.ok) throw new Error((data && data.error) || "Request failed");
  // ORIGINAL: return data;
  // UPDATED: same behaviour, plus the popup for changes (POST / PUT / DELETE)
  const method = String(options.method || "GET").toUpperCase();
  const showsPopup = method !== "GET" && !NO_POPUP_PATHS.some((p) => path.startsWith(p));
  if (!res.ok) {
    const errText = (data && data.error) || "Request failed";
    if (showsPopup) firePopup("error", errText);
    throw new Error(errText);
  }
  if (showsPopup) {
    const fallback = method === "DELETE" ? "Deleted successfully" : "Saved successfully";
    firePopup("success", (data && data.message) || fallback);
  }
  return data;
}
