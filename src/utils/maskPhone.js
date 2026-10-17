import { getUser } from "../api.js";

// ADDED: hide a phone number - only the last 3 digits are shown,
// e.g. "9849973789" -> "xxxxxxx789". The full number is still saved in the
// database and still used for the WhatsApp / call links.
export function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return String(value || "");
  if (digits.length <= 3) return digits;
  return "x".repeat(digits.length - 3) + digits.slice(-3);
}

// ADDED: phone numbers are hidden for telecallers everywhere in the app;
// admin always sees the full number.
export function hidePhones() {
  return getUser()?.role !== "admin";
}

// ADDED: phone number on a CARD - hidden for everyone (admin too): "xxxxxxx789".
// Full number is still shown in the Edit / Follow up forms.
export function cardPhone(value) {
  if (value === null || value === undefined || String(value).trim() === "") return value;
  return maskPhone(value);
}

// ADDED: what to SHOW for a phone number (masked for telecallers, full for admin)
export function phoneText(value) {
  if (value === null || value === undefined || String(value).trim() === "") return value;
  return hidePhones() ? maskPhone(value) : value;
}
