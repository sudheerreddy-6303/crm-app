import React, { useState } from "react";
import { api } from "../api.js";

// ADDED: Project add/edit modal - opened by "+ Add project" on the Project
// Details page. Follows the same pattern as WalkinModal.
// To add more options later, extend these lists here AND in
// backend/routes/projects.js (PROJECT_TYPES / PROJECT_STATUSES).
export const PROJECT_TYPES = ["Open Land", "Flats", "Villas", "Highrise"];
export const PROJECT_STATUSES = ["Handovering for Interior", "Construction State", "Pre Launch"];

export default function ProjectModal({ project, onClose, onSaved }) {
  const isNew = !project.id;
  const [form, setForm] = useState({
    project_name: project.project_name || "",
    owner_contact: project.owner_contact || "",
    secondary_number: project.secondary_number || "",
    location: project.location || "",
    address: project.address || "",
    type: project.type || "",
    sales_executive: project.sales_executive || "",
    phone1: project.phone1 || "",
    phone2: project.phone2 || "",
    status: project.status || "",
    data_in_crm: project.data_in_crm || "",
    marketing: project.marketing || "",
    // counters default to 0
    rounds_called: project.rounds_called ?? 0,
    last_calling_date: project.last_calling_date ? String(project.last_calling_date).slice(0, 10) : "",
    units_booked_interiors: project.units_booked_interiors ?? 0,
    units_sold: project.units_sold ?? 0,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (!form.project_name.trim()) {
      return setError("Project name is required");
    }
    setSaving(true);
    try {
      if (isNew) {
        await api("/projects", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/projects/${project.id}`, { method: "PUT", body: JSON.stringify(form) });
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
        <h3>{isNew ? "Add project" : `Edit project — ${project.project_name}`}</h3>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Project name</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="Project / building name" />
          </div>
          <div>
            <label>Contact number (owner)</label>
            <input value={form.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} placeholder="Owner's number" />
          </div>
          <div>
            <label>Secondary number</label>
            <input value={form.secondary_number} onChange={(e) => set("secondary_number", e.target.value)} placeholder="Secondary number" />
          </div>
          <div>
            <label>Location</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area / locality" />
          </div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Select type</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label>Sales executive name</label>
            <input value={form.sales_executive} onChange={(e) => set("sales_executive", e.target.value)} placeholder="Sales executive" />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">Select status</option>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Phone number 1</label>
            <input value={form.phone1} onChange={(e) => set("phone1", e.target.value)} placeholder="Phone number 1" />
          </div>
          <div>
            <label>Phone number 2</label>
            <input value={form.phone2} onChange={(e) => set("phone2", e.target.value)} placeholder="Phone number 2" />
          </div>
          <div>
            <label>Data in CRM</label>
            <select value={form.data_in_crm} onChange={(e) => set("data_in_crm", e.target.value)}>
              <option value="">—</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label>Marketing</label>
            <select value={form.marketing} onChange={(e) => set("marketing", e.target.value)}>
              <option value="">—</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label>Number of rounds called</label>
            <input type="number" min="0" value={form.rounds_called} onChange={(e) => set("rounds_called", e.target.value)} />
          </div>
          <div>
            <label>Last calling date</label>
            <input type="date" value={form.last_calling_date} onChange={(e) => set("last_calling_date", e.target.value)} />
          </div>
          <div>
            <label>Units booked for interiors</label>
            <input type="number" min="0" value={form.units_booked_interiors} onChange={(e) => set("units_booked_interiors", e.target.value)} />
          </div>
          <div>
            <label>Units sold</label>
            <input type="number" min="0" value={form.units_sold} onChange={(e) => set("units_sold", e.target.value)} />
          </div>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add project" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
