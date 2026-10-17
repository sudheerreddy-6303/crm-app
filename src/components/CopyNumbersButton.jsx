import React, { useState } from "react";
import { getUser } from "../api.js";
import { showPopup } from "./Popup.jsx";

// ADDED: "Copy numbers" button - ADMIN ONLY (not shown to telecallers).
// Copies the phone numbers of ALL records that match the page's current
// search / filters (every page, not only the 50 on screen), one per line,
// duplicates removed (same number written differently counts once).
//   getRows : async () => array of records (all pages, current filters)
//   fields  : which fields hold phone numbers, e.g. ["phone", "alt_phone"]
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall back below */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "-1000px";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export default function CopyNumbersButton({ getRows, fields, className = "btn secondary", label = "📋 Copy numbers" }) {
  const [copying, setCopying] = useState(false);
  if (getUser()?.role !== "admin") return null; // admin only

  const copy = async () => {
    setCopying(true);
    try {
      const rows = (await getRows()) || [];
      const seen = new Set();
      const numbers = [];
      rows.forEach((r) => fields.forEach((f) => {
        const v = String(r[f] || "").trim();
        const key = v.replace(/\D/g, "").slice(-10);
        if (v && key && !seen.has(key)) { seen.add(key); numbers.push(v); }
      }));
      if (numbers.length === 0) { showPopup("error", "There are no phone numbers to copy.", "Nothing to copy"); return; }
      const ok = await copyToClipboard(numbers.join("\n"));
      const word = `number${numbers.length === 1 ? "" : "s"}`;
      if (ok) showPopup("success", `${numbers.length} phone ${word} copied. You can paste ${numbers.length === 1 ? "it" : "them"} anywhere now.`, "Numbers copied");
      else showPopup("error", "Your browser blocked copying. Please try again.", "Could not copy");
    } catch (e) {
      showPopup("error", e.message, "Could not copy");
    } finally {
      setCopying(false);
    }
  };

  return (
    <button type="button" className={className} onClick={copy} disabled={copying}
            title="Copy all phone numbers matching the current search / filters (admin only)">
      {copying ? "Copying..." : label}
    </button>
  );
}
