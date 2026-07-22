import React, { useState } from "react";
import { api } from "../api.js";

// ADDED: Walk-in add/edit modal - opened by the "+ Add walk-in" button on the
// Walk-ins page. Follows the same pattern as ServiceCallModal.
// To add more purposes later, add them here AND in
// backend/routes/walkins.js (WALKIN_PURPOSES).
export const WALKIN_PURPOSES = [
  "Modular Kitchen", "Wardrobe", "Full Home Interiors", "Living Room",
  "Bedroom", "Kids Room", "Pooja Unit", "TV Unit", "Office Interiors",
  "Renovation", "Just Enquiry", "Other",
];

export default function WalkinModal({ walkin, onClose, onSaved }) {
  const isNew = !walkin.id;
  const [form, setForm] = useState({
    name: walkin.name || "",
    phone: walkin.phone || "",
    alt_phone: walkin.alt_phone || "",
    project_name: walkin.project_name || "",
    // date input needs YYYY-MM-DD; slice in case the API returns a full timestamp
    visit_date: walkin.visit_date ? String(walkin.visit_date).slice(0, 10) : "",
    purpose: walkin.purpose || "",
    location: walkin.location || "",
    site_location: walkin.site_location || "",
    city: walkin.city || "",
    address: walkin.address || "",
    budget: walkin.budget || "",
    attended_by: walkin.attended_by || "",
    remarks: walkin.remarks || "",
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
        await api("/walkins", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/walkins/${walkin.id}`, { method: "PUT", body: JSON.stringify(form) });
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
        <h3>{isNew ? "Add walk-in" : `Edit walk-in — ${walkin.name}`}</h3>
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
          {/* ADDED: alternate mobile number */}
          <div>
            <label>Alternate mobile number</label>
            <input value={form.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} placeholder="Alternate mobile number" />
          </div>
          {/* ADDED: project name / villa name */}
          <div>
            <label>Project name / villa name</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="e.g. Aparna Xenon / villa no." />
          </div>
          <div>
            <label>Visit date</label>
            <input type="date" value={form.visit_date} onChange={(e) => set("visit_date", e.target.value)} />
          </div>
          <div>
            <label>Purpose</label>
            <select value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>
              <option value="">Select purpose</option>
              {WALKIN_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            {/* UPDATED label: was "Experience centre / location" - now just the
                centre, since Location/City/Address below cover the customer's place */}
            <label>Experience centre</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Which centre" />
          </div>
          {/* ADDED: customer / site location */}
          <div>
            <label>Location</label>
            <input value={form.site_location} onChange={(e) => set("site_location", e.target.value)} placeholder="Area / locality" />
          </div>
          {/* ADDED: city */}
          <div>
            <label>City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
          </div>
          {/* ADDED: address (full width) */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label>Budget</label>
            <input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 5-8 lakhs" />
          </div>
          <div>
            <label>Attended by</label>
            <input value={form.attended_by} onChange={(e) => set("attended_by", e.target.value)} placeholder="Designer / sales person" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Remarks</label>
            <textarea rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Remarks..." />
          </div>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add walk-in" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
