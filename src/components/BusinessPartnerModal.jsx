// ORIGINAL: import React, { useState } from "react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
// ADDED: locked phone box for telecallers (xxxxxxx789), normal box for admin
import PhoneInput from "./PhoneInput.jsx";
// ADDED: hide the number on the "already saved" card (xxxxxxx789)
import { cardPhone } from "../utils/maskPhone.js";
// ADDED: pop-up when a required field is missing
import { showPopup } from "./Popup.jsx";
// ADDED: Hyderabad areas for the Location dropdown
import { HYDERABAD_AREAS } from "../utils/hyderabadAreas.js";
const OTHER_LOCATION = "__other__";

// ADDED: Business Associates & Franchise add/edit modal - opened by the "+ Add"
// button on the Business Associates & Franchise page. Same pattern as WalkinModal.
// To add more categories later, add them here AND in
// backend/routes/businessPartners.js (PARTNER_CATEGORIES).
export const PARTNER_CATEGORIES = [
  "Business Associates", "Builders", "Contractors", "Franchise Prospect",
  // ADDED: new category
  "Sales",
  // ADDED: more categories
  "Freelance Interiors", "Architects", "Others",
];

// ADDED: form values from a saved record (used when a typed number is already saved)
const fromPartner = (p) => ({
  person_name: p.person_name || "", contact: p.contact || "", owner_name: p.owner_name || "",
  business_name: p.business_name || "", location: p.location || "", whatsapp: p.whatsapp || "",
  call_remark_1: p.call_remark_1 || "", call_remark_2: p.call_remark_2 || "", category: p.category || "",
  calling_date: p.calling_date ? String(p.calling_date).slice(0, 10) : "",
  whatsapp_sent_date: p.whatsapp_sent_date ? String(p.whatsapp_sent_date).slice(0, 10) : "",
  calling_date_2: p.calling_date_2 ? String(p.calling_date_2).slice(0, 10) : "",
  whatsapp_sent_date_2: p.whatsapp_sent_date_2 ? String(p.whatsapp_sent_date_2).slice(0, 10) : "",
});
const digitsOf = (v) => String(v || "").replace(/\D/g, "");

export default function BusinessPartnerModal({ partner, onClose, onSaved }) {
  // ORIGINAL: const isNew = !partner.id;
  // UPDATED: when a typed number is already saved, the form switches to editing
  // THAT record (existing.id) - saving updates it, no duplicate.
  const [existing, setExisting] = useState(null);
  const [existingCount, setExistingCount] = useState(0);
  const editId = partner.id || (existing && existing.id) || null;
  const isNew = !editId;
  // ADDED: true while "Other (type location)" is chosen in the Location dropdown
  const [locOther, setLocOther] = useState(false);
  const [form, setForm] = useState({
    person_name: partner.person_name || "",
    contact: partner.contact || "",
    // ADDED: owner's name
    owner_name: partner.owner_name || "",
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

  // ADDED: in "Add", as soon as a full number (10+ digits) is typed in Contact
  // number or WhatsApp number, check if it is already saved. If yes, load it.
  const [checking, setChecking] = useState(false);
  const lookupSeq = useRef(0);
  const [lookupWarn, setLookupWarn] = useState("");
  const checkedNumbers = useRef(new Set());
  const typedNumbers = [form.contact, form.whatsapp].map(digitsOf).filter((d) => d.length >= 10).join(",");
  useEffect(() => {
    if (partner.id || existing || !typedNumbers) return undefined;
    const toCheck = typedNumbers.split(",").filter((d) => !checkedNumbers.current.has(d.slice(-10)));
    if (!toCheck.length) return undefined;
    const seq = ++lookupSeq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        for (const num of toCheck) {
          checkedNumbers.current.add(num.slice(-10));
          const d = await api(`/business-partners/lookup?phone=${encodeURIComponent(num)}`);
          if (seq !== lookupSeq.current) return;
          if (d.found && d.partner) {
            setExisting(d.partner);
            setExistingCount(d.matches || 1);
            setForm(fromPartner(d.partner));
            setLocOther(false);
            setError("");
            setLookupWarn("");
            return;
          }
        }
      } catch (e) {
        setLookupWarn("Could not check if this number is already saved. Please make sure the latest backend is deployed.");
        checkedNumbers.current = new Set(); // allow a retry when the number is typed again
      } finally { if (seq === lookupSeq.current) setChecking(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [typedNumbers, partner.id, existing]);

  // ADDED: "Not this person? Start again"
  const clearExisting = () => {
    lookupSeq.current++;
    checkedNumbers.current = new Set();
    setExisting(null);
    setExistingCount(0);
    setForm(fromPartner({}));
    setLocOther(false);
    setError("");
  };

  const save = async () => {
    setError("");
    // UPDATED: required fields - Person name, Contact number, Business name,
    // Location (marked * in the form). A pop-up lists what is missing.
    // ORIGINAL: if (!form.person_name.trim() || !form.contact.trim()) {
    // ORIGINAL:   return setError("Person name and contact number are required");
    // ORIGINAL: }
    const missing = [
      ["Person name", form.person_name], ["Contact number", form.contact],
      // UPDATED: Business name is no longer required
      // ORIGINAL: ["Business name", form.business_name], ["Location", form.location],
      ["Location", form.location],
    ].filter(([, v]) => !String(v || "").trim()).map(([k]) => k);
    if (missing.length) {
      const text = `Please fill in: ${missing.join(", ")}`;
      showPopup("error", text, "Required fields missing");
      return setError(text);
    }
    setSaving(true);
    try {
      if (isNew) {
        await api("/business-partners", { method: "POST", body: JSON.stringify(form) });
      } else {
        // ORIGINAL: await api(`/business-partners/${partner.id}`, { method: "PUT", body: JSON.stringify(form) });
        await api(`/business-partners/${editId}`, { method: "PUT", body: JSON.stringify(form) });
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
        {/* ORIGINAL: <h3>{isNew ? "Add business associate / franchise" : `Edit — ${partner.person_name}`}</h3> */}
        <h3>{isNew ? "Add business associate / franchise" : `Edit — ${partner.person_name || (existing && existing.person_name) || ""}`}</h3>
        {/* ADDED: number already saved -> its details are loaded below */}
        {existing && !partner.id && (
          <>
            <div className="sc-dup">
              <div>
                <b>This phone number is already saved{existingCount > 1 ? ` on ${existingCount} records` : ""}.</b> The details are loaded below.
                Saving will <b>update this record</b> - no duplicate will be created.
              </div>
              <button type="button" className="btn small secondary" onClick={clearExisting}>Not this person? Start again</button>
            </div>
            <div className="lead-card sc-found-card">
              <div className="lc-head">
                <div>
                  <div className="lc-name">🤝 {existing.person_name || "-"}</div>
                  <div className="lc-sub">{[existing.business_name, existing.location].filter(Boolean).join(" · ") || "-"}</div>
                </div>
                {existing.category && <span className="chip none">{existing.category}</span>}
              </div>
              <div className="lc-grid">
                <span>Contact number</span><b>{cardPhone(existing.contact) || "-"}</b>
                <span>WhatsApp</span><b>{cardPhone(existing.whatsapp) || "-"}</b>
                <span>Owner name</span><b>{existing.owner_name || "-"}</b>
                <span>Call 1 date</span><b>{existing.calling_date ? String(existing.calling_date).slice(0, 10) : "-"}</b>
                <span>Added by</span><b>{existing.created_by_name || "-"}</b>
              </div>
              {existing.call_remark_1 && <div className="lc-remarks"><div><span>Call 1 remark:</span> {existing.call_remark_1}</div></div>}
            </div>
          </>
        )}
        {checking && !existing && <div className="sc-checking">Checking number…</div>}
        {lookupWarn && !existing && <div className="sc-checking" style={{ color: "var(--red-ink)" }}>⚠ {lookupWarn}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          <div>
            {/* UPDATED: * = required (it was already required) */}
            <label>Person name <span className="req">*</span></label>
            <input value={form.person_name} onChange={(e) => set("person_name", e.target.value)} placeholder="Contact person name" />
          </div>
          <div>
            <label>Contact number <span className="req">*</span></label>
            {/* ORIGINAL: <input value={form.contact} ... placeholder="Phone number" /> */}
            <PhoneInput value={form.contact} original={partner.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Phone number" />
          </div>
          {/* ADDED: Owner's name - right after the contact number */}
          <div>
            <label>Owner name</label>
            <input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="Owner's name" />
          </div>
          <div>
            {/* ORIGINAL: <label>Business name <span className="req">*</span></label>
                UPDATED: not required any more */}
            <label>Business name</label>
            <input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Company / firm name" />
          </div>
          <div>
            <label>Location <span className="req">*</span></label>
            {/* ORIGINAL: <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area / city" />
                UPDATED: Hyderabad areas dropdown. "Other" shows a text box for any
                other place - existing records with a full address keep working. */}
            <select
              value={locOther || (form.location && !HYDERABAD_AREAS.includes(form.location)) ? OTHER_LOCATION : form.location}
              onChange={(e) => {
                if (e.target.value === OTHER_LOCATION) { setLocOther(true); if (HYDERABAD_AREAS.includes(form.location)) set("location", ""); }
                else { setLocOther(false); set("location", e.target.value); }
              }}
            >
              <option value="">Select location</option>
              {HYDERABAD_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value={OTHER_LOCATION}>Other (type location)</option>
            </select>
            {(locOther || (form.location && !HYDERABAD_AREAS.includes(form.location))) && (
              <input style={{ marginTop: 8 }} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Type location / address" autoFocus={locOther && !form.location} />
            )}
          </div>
          <div>
            <label>WhatsApp number</label>
            {/* ORIGINAL: <input value={form.whatsapp} ... placeholder="WhatsApp number" /> */}
            <PhoneInput value={form.whatsapp} original={partner.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="WhatsApp number" />
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
