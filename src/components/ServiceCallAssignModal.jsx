import React, { useEffect, useState } from "react";
import { api } from "../api.js";

// ADDED: "Assign to" pop-up for Service Calls - ADMIN ONLY.
// Pick a telecaller and click Assign. "Unassign" removes the assignment.
// The server also checks that only an admin can assign (PUT /service-calls/assign).
export default function ServiceCallAssignModal({ call, onClose, onSaved }) {
  const [telecallers, setTelecallers] = useState([]);
  const [tcId, setTcId] = useState(call.assigned_to ? String(call.assigned_to) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/users")
      // active telecallers (an inactive one is still listed if this call is assigned to them)
      .then((rows) => setTelecallers((rows || []).filter((u) => u.role === "telecaller" && (u.status !== "inactive" || u.id === call.assigned_to))))
      .catch((e) => setError(e.message));
  }, []);

  const save = async (unassign = false) => {
    if (!unassign && !tcId) { setError("Please select a telecaller"); return; }
    setError("");
    setSaving(true);
    try {
      // api.js shows the success / error popup
      await api("/service-calls/assign", {
        method: "PUT",
        body: JSON.stringify({ ids: [call.id], telecaller_id: unassign ? null : Number(tcId) }),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal sc-assign-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>Assign service call</h3>
        <div className="sc-assign-who">
          <b>{call.name}</b>{call.category ? <span className="chip none">{call.category}</span> : null}
        </div>
        {call.assigned_to_name && (
          <div className="sc-assign-now">Currently assigned to <b>{call.assigned_to_name}</b>{call.assigned_on ? ` (since ${call.assigned_on})` : ""}</div>
        )}
        <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label>Assign to telecaller</label>
            <select value={tcId} onChange={(e) => setTcId(e.target.value)} autoFocus>
              <option value="">Select telecaller</option>
              {telecallers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.status === "inactive" ? " (inactive)" : ""}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
        <div className="actions">
          {call.assigned_to && (
            <button type="button" className="btn secondary" disabled={saving} onClick={() => save(true)}>Unassign</button>
          )}
          <button type="button" className="btn secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="button" className="btn" disabled={saving} onClick={() => save(false)}>{saving ? "Saving..." : "Assign"}</button>
        </div>
      </div>
    </div>
  );
}
