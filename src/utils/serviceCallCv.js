import { getToken } from "../api.js";

// ADDED: CV upload / view / remove for service calls (Interior Designers).
// The file is sent as-is (not JSON) so big PDFs work; the server keeps up to 5 MB.
const API_BASE = process.env.REACT_APP_API_URL || "";
export const CV_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
export const CV_MAX_MB = 5;

export async function uploadCv(serviceCallId, file) {
  if (!file) return null;
  if (file.size > CV_MAX_MB * 1024 * 1024) throw new Error(`CV is too big - maximum ${CV_MAX_MB} MB`);
  const res = await fetch(`${API_BASE}/api/service-calls/${serviceCallId}/cv`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name || "CV"),
    },
    body: file,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || "Failed to upload CV");
  return data;
}

// Opens the CV in a new tab (the request carries the login token)
export async function openCv(serviceCallId) {
  const win = window.open("", "_blank"); // open first so the browser does not block it
  try {
    const res = await fetch(`${API_BASE}/api/service-calls/${serviceCallId}/cv`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      let msg = "Could not open the CV";
      try { msg = (await res.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url; else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (win) win.close();
    throw e;
  }
}

export async function removeCv(serviceCallId) {
  const res = await fetch(`${API_BASE}/api/service-calls/${serviceCallId}/cv`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Could not remove the CV");
}
