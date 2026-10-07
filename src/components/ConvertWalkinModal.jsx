import React, { useEffect, useState } from "react";
import { api, getUser } from "../api.js";

// ADDED: "Convert to lead" pop-up for a walk-in. Opened from the Walk-ins page
// and from the walk-in table on the Data page. Creates a lead in Data from the
// walk-in details; the walk-in itself is KEPT and marked "Lead".
// Admin chooses which telecaller gets the lead; a telecaller's conversion is
// assigned to themselves automatically.
export default function ConvertWalkinModal({ walkin, onClose, onConverted }) {
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const [telecallers, setTelecallers] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      api("/users").then((rows) => setTelecallers(rows.filter((r) => r.role === "telecaller"))).catch(() => {});
    }
  }, [isAdmin]);

  const convert = async () => {
    setError("");
    setSaving(true);
    try {
      const data = await api(`/walkins/${walkin.id}/convert`, {
        method: "POST",
        body: JSON.stringify({ assigned_to: assignTo || null }),
      });
      onConverted(data.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const row = (label, value) => (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
      <span style={{ width: 110, flexShrink: 0, color: "var(--ink-soft)", fontWeight: 600 }}>{label}</span>
      <span>{value || "-"}</span>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>Convert walk-in to lead</h3>
        {error && <div className="error-msg">{error}</div>}

        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
          This adds <strong>{walkin.name}</strong> to Data (Leads) so a telecaller can follow up.
          The walk-in record stays on the Walk-ins page.
        </p>

        {row("Name", walkin.name)}
        {row("Phone", walkin.phone)}
        {row("Project", walkin.project_name)}
        {row("Purpose", walkin.purpose)}
        {row("Remarks", walkin.remarks)}

        {isAdmin && (
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div>
              <label>Assign to telecaller</label>
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Unassigned</option>
                {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={convert} disabled={saving}>
            {saving ? "Converting..." : "Convert to lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
