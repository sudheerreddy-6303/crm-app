import React, { useEffect, useRef, useState } from "react";
import { api, getUser } from "../api.js";
import { showPopup } from "./Popup.jsx";

// ADDED: form shown on both WhatsApp pages (Meta WhatsApp and Bulk WhatsApp).
// Fields: Telecaller name, Projects (multi-select dropdown) and Count (number).
//  - Admin picks any telecaller. A telecaller sees their own name (fixed).
//  - Projects list = projects on that telecaller's leads (all projects when
//    no telecaller is picked). Several projects can be ticked.
//  - Count = plain number box (no up/down arrows), digits only.
// ADDED: Sending date (required, today or later).
// UPDATED: telecaller cannot edit the Telecaller name (locked field).
// "Continue" checks the required fields and shows a popup with the selection.
// UPDATED: Continue now saves the request in the database (POST /api/whatsapp)
// and tells the page (onSaved) so the history list below refreshes.
// ORIGINAL: export default function WhatsAppForm({ channel }) {
export default function WhatsAppForm({ channel, channelKey, onSaved }) {
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const [telecallers, setTelecallers] = useState([]);
  const [telecallerId, setTelecallerId] = useState(isAdmin ? "" : String(user?.id || ""));
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState("");
  // ADDED: sending date (yyyy-mm-dd); earliest allowed = today
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const [sendDate, setSendDate] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  // ADDED: saving state (button disabled while saving)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api("/users").then((rows) => setTelecallers((rows || []).filter((r) => r.role === "telecaller"))).catch(() => {});
  }, [isAdmin]);

  // Projects follow the chosen telecaller (backend already limits a telecaller to their own)
  useEffect(() => {
    const q = isAdmin && telecallerId ? `?assigned=${telecallerId}` : "";
    api(`/dashboard/projects${q}`)
      .then((d) => {
        const list = d.projects || [];
        setProjects(list);
        setSelected((sel) => sel.filter((p) => list.includes(p)));
      })
      .catch(() => setProjects([]));
  }, [isAdmin, telecallerId]);

  // close the dropdown when tapping outside it
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const toggle = (p) => setSelected((sel) => (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]));
  const allSelected = projects.length > 0 && selected.length === projects.length;
  const toggleAll = () => setSelected(allSelected ? [] : [...projects]);

  const tcName = isAdmin
    ? telecallers.find((t) => String(t.id) === String(telecallerId))?.name || ""
    : user?.name || "";

  // ORIGINAL: const submit = (e) => {
  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const missing = [];
    if (!telecallerId) missing.push("Telecaller name");
    if (selected.length === 0) missing.push("Projects");
    if (!count || Number(count) <= 0) missing.push("Count");
    if (!sendDate) missing.push("Sending date");
    if (missing.length) {
      showPopup("error", `Please fill: ${missing.join(", ")}`, "Required fields missing");
      return;
    }
    // ADDED: sending date can't be in the past
    if (sendDate < todayStr) {
      showPopup("error", "Sending date cannot be a past date. Please pick today or a later date.", "Check sending date");
      return;
    }
    const niceDate = sendDate.split("-").reverse().join("-");
    // ORIGINAL (only showed a popup, nothing saved):
    // showPopup("success", `${channel}: ... · Sending date ${niceDate}`, "Selection ready");
    // UPDATED: save in the database, then popup + refresh history + clear the form
    setSaving(true);
    try {
      await api("/whatsapp", {
        method: "POST",
        body: JSON.stringify({ channel: channelKey, telecaller_id: Number(telecallerId), projects: selected, count: Number(count), send_date: sendDate }),
      });
      showPopup(
        "success",
        `${channel}: ${tcName} · ${selected.length} project${selected.length > 1 ? "s" : ""} (${selected.join(", ")}) · Count ${count} · Sending date ${niceDate}`,
        "Saved successfully"
      );
      setSelected([]);
      setCount("");
      setSendDate("");
      if (onSaved) onSaved();
    } catch {
      // api.js already shows the red error popup
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card wa-form" onSubmit={submit}>
      <div className="form-grid">
        <div>
          <label>Telecaller name <span className="req">*</span></label>
          {isAdmin ? (
            <select value={telecallerId} onChange={(e) => setTelecallerId(e.target.value)}>
              <option value="">Select telecaller</option>
              {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : (
            // ORIGINAL: <input value={user?.name || ""} readOnly />
            // UPDATED: locked for telecallers - cannot be edited, focused or changed
            <input className="wa-locked" value={user?.name || ""} readOnly disabled title="Telecaller name cannot be changed" />
          )}
        </div>

        <div className="wa-ms" ref={boxRef}>
          <label>Projects <span className="req">*</span></label>
          <button type="button" className={`wa-ms-btn${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span className={selected.length ? "" : "wa-ms-ph"}>
              {selected.length === 0 ? "Select projects"
                : selected.length <= 2 ? selected.join(", ")
                : `${selected.length} projects selected`}
            </span>
            <span className="wa-ms-caret">▾</span>
          </button>
          {open && (
            <div className="wa-ms-menu">
              {projects.length === 0 ? (
                <div className="wa-ms-empty">No projects found</div>
              ) : (
                <>
                  <label className="wa-ms-opt wa-ms-all">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all ({projects.length})
                  </label>
                  {projects.map((p) => (
                    <label key={p} className="wa-ms-opt">
                      <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} /> {p}
                    </label>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <label>Count <span className="req">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter number"
          />
        </div>

        {/* ADDED: Sending date */}
        <div>
          <label>Sending date <span className="req">*</span></label>
          <input type="date" value={sendDate} min={todayStr} onChange={(e) => setSendDate(e.target.value)} />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="wa-chips">
          {selected.map((p) => (
            <span key={p} className="wa-chip">{p}<button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p}`}>×</button></span>
          ))}
        </div>
      )}

      <div className="wa-actions">
        {/* ORIGINAL: <button type="submit" className="btn">Continue</button> */}
        <button type="submit" className="btn" disabled={saving}>{saving ? "Saving..." : "Continue"}</button>
      </div>
    </form>
  );
}
