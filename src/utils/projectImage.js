import { getToken } from "../api.js";

// ADDED: "Image of project" - upload / show / remove. The image is sent as-is
// (not JSON); the server keeps JPG / PNG / WEBP up to 5 MB.
const API_BASE = process.env.REACT_APP_API_URL || "";
export const PROJECT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const PROJECT_IMAGE_MAX_MB = 5;

export async function uploadProjectImage(projectId, file) {
  if (!file) return null;
  if (file.size > PROJECT_IMAGE_MAX_MB * 1024 * 1024) throw new Error(`Image is too big - maximum ${PROJECT_IMAGE_MAX_MB} MB`);
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name || "Project image"),
    },
    body: file,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || "Failed to upload the image");
  return data;
}

export async function removeProjectImage(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/image`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Could not remove the image");
}

// image as a local URL for <img> (the request carries the login token).
// Kept in memory per project + file name, so cards don't download it again.
const cache = new Map();
export function projectImageUrl(projectId, imageName) {
  const key = `${projectId}|${imageName}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`${API_BASE}/api/projects/${projectId}/image`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no image"))))
      .then((b) => URL.createObjectURL(b))
      .catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}
