import React, { useState } from "react";
import { api } from "../api.js";

// ADDED: Business Associates & Franchise add/edit modal - opened by the "+ Add"
// button on the Business Associates & Franchise page. Same pattern as WalkinModal.
// To add more categories later, add them here AND in
// backend/routes/businessPartners.js (PARTNER_CATEGORIES).
export const PARTNER_CATEGORIES = [
  "Business Associates", "Builders", "Contractors", "Franchise Prospect",
  // ADDED: new category
  "Sales",
];

export default function BusinessPartnerModal({ partner, onClose, onSaved }) {
  const isNew = !partner.id;
  const [form, setForm] = useState({
    person_name: partner.person_name || "",
    contact: partner.contact || "",
    business_name: partner.business_name || "",
    location: partner.location || "",
    whatsapp: partner.whatsapp || "",
    call_remark_1: partner.call_remark_1 || "",
    call_remark_2: partner.call_remark_2 || "",
    category: partner.category || "",
    // ADDED: calling date + WhatsApp sent date (date input needs YYYY-MM-DD)
    calling_date: partner.calling_date ? String(partner.calling_date).slice(0, 10) : "",
    whatsapp_sent_date: partner.whatsapp_sent_date ? String(partner.whatsapp_sent_date).slice(0, 10) : "",
    // ADDED: 2nd call date + 2nd WhatsApp sent date
    calling_date_2: partner.calling_date_2 ? String(partner.calling_date_2).slice(0, 10) : "",
    whatsapp_sent_date_2: partner.whatsapp_sent_date_2 ? String(partner.whatsapp_sent_date_2).slice(0, 10) : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (!form.person_name.trim() || !form.contact.trim()) {
      return setError("Person name and contact number are required");
    }
    setSaving(true);
    try {
      if (isNew) {
        await api("/business-partners", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/business-partners/${partner.id}`, { method: "PUT", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    // Clicking outside does not close the form (same as the other forms),
    // so typed data isn't lost by accident. Close with Cancel / X or after Save.
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>{isNew ? "Add business associate / franchise" : `Edit — ${partner.person_name}`}</h3>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          <div>
            <label>Person name</label>
            <input value={form.person_name} onChange={(e) => set("person_name", e.target.value)} placeholder="Contact person name" />
          </div>
          <div>
            <label>Contact number</label>
            <input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label>Business name</label>
            <input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Company / firm name" />
          </div>
          <div>
            <label>Location</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area / city" />
          </div>
          <div>
            <label>WhatsApp number</label>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="WhatsApp number" />
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category</option>
              {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* ADDED: calling date + WhatsApp sent date
              UPDATED labels: "Calling date" -> "Call 1 date",
              "WhatsApp sent date" -> "WhatsApp 1 sent date" (same saved data) */}
          <div>
            <label>Call 1 date</label>
            <input type="date" value={form.calling_date} onChange={(e) => set("calling_date", e.target.value)} />
          </div>
          {/* ADDED: 2nd call date */}
          <div>
            <label>Call 2 date</label>
            <input type="date" value={form.calling_date_2} onChange={(e) => set("calling_date_2", e.target.value)} />
          </div>
          <div>
            <label>WhatsApp 1 sent date</label>
            <input type="date" value={form.whatsapp_sent_date} onChange={(e) => set("whatsapp_sent_date", e.target.value)} />
          </div>
          {/* ADDED: 2nd WhatsApp sent date */}
          <div>
            <label>WhatsApp 2 sent date</label>
            <input type="date" value={form.whatsapp_sent_date_2} onChange={(e) => set("whatsapp_sent_date_2", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Call 1 remark</label>
            <textarea rows={2} value={form.call_remark_1} onChange={(e) => set("call_remark_1", e.target.value)} placeholder="Remark for call 1..." />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Call 2 remark</label>
            <textarea rows={2} value={form.call_remark_2} onChange={(e) => set("call_remark_2", e.target.value)} placeholder="Remark for call 2..." />
          </div>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
