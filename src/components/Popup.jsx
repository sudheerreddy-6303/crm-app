import React, { useEffect, useRef, useState } from "react";

// ADDED: app-wide popup for every save / update / delete / convert / assign.
// api.js fires a "crm-popup" event after each successful (or failed) change,
// and this component shows it. Mounted once in App.jsx, so every page and
// form gets it automatically - no change needed in each form.
//   success -> green ✓ popup, closes by itself after 2.5s (or tap OK)
//   error   -> red ✕ popup, stays until OK is tapped so it isn't missed
export function showPopup(type, text) {
  window.dispatchEvent(new CustomEvent("crm-popup", { detail: { type, text } }));
}

export default function Popup() {
  const [popup, setPopup] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const onPopup = (e) => {
      clearTimeout(timer.current);
      setPopup(e.detail);
      if (e.detail.type === "success") {
        timer.current = setTimeout(() => setPopup(null), 2500);
      }
    };
    window.addEventListener("crm-popup", onPopup);
    return () => { window.removeEventListener("crm-popup", onPopup); clearTimeout(timer.current); };
  }, []);

  if (!popup) return null;
  const ok = popup.type === "success";

  return (
    <div className="crm-popup-wrap" role="alertdialog" aria-live="assertive">
      <div className={`crm-popup ${ok ? "ok" : "err"}`}>
        <div className="crm-popup-icon">{ok ? "✓" : "✕"}</div>
        <div className="crm-popup-title">{ok ? "Saved successfully" : "Something went wrong"}</div>
        <div className="crm-popup-text">{popup.text}</div>
        <button className="btn" onClick={() => { clearTimeout(timer.current); setPopup(null); }}>OK</button>
      </div>
    </div>
  );
}
