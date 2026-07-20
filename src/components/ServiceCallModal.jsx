import React, { useState } from "react";
import { api } from "../api.js";

// ADDED: Service Call add/edit modal - opened by the "+ Add service call"
// button on the Service Calls page. Follows the same pattern as LeadModal.
// To add more categories later, add them here AND in
// backend/routes/serviceCalls.js (SERVICE_CATEGORIES).
export const SERVICE_CATEGORIES = [
  "Painter", "Electrician", "Designer", "Sales",
  "Carpenter", "Plumber", "Deep Cleaning", "Other",
];

export default function ServiceCallModal({ call, onClose, onSaved }) {
  const isNew = !call.id;
  const [form, setForm] = useState({
    name: call.name || "",
    phone: call.phone || "",
    category: call.category || "",
    location: call.location || "",
    remarks: call.remarks || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      return setError("Name and phone number are required");
    }
    setSaving(true);
    try {
      if (isNew) {
        await api("/service-calls", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/service-calls/${call.id}`, { method: "PUT", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Add service call" : `Edit service call — ${call.name}`}</h3>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <label>Phone number</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Location</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Location / area" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Remarks</label>
            <textarea rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Remarks..." />
          </div>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add service call" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
