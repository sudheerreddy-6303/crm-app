// ORIGINAL: import React, { useState } from "react";
import React, { useEffect, useRef, useState } from "react";
// ORIGINAL: import { api } from "../api.js";
import { api, getUser } from "../api.js";
// ADDED: State -> City -> Location (Telangana / Andhra Pradesh) - same in every form
import StateCityLocation from "./StateCityLocation.jsx";
// ADDED: locked phone box for telecallers (xxxxxxx789), normal box for admin
import PhoneInput from "./PhoneInput.jsx";
// ADDED: hide the number on the "already saved" card (xxxxxxx789)
import { cardPhone } from "../utils/maskPhone.js";

// ADDED: Walk-in add/edit modal - opened by the "+ Add walk-in" button on the
// Walk-ins page. Follows the same pattern as ServiceCallModal.
// To add more purposes later, add them here AND in
// backend/routes/walkins.js (WALKIN_PURPOSES).
export const WALKIN_PURPOSES = [
  "Modular Kitchen", "Wardrobe", "Full Home Interiors", "Living Room",
  "Bedroom", "Kids Room", "Pooja Unit", "TV Unit", "Office Interiors",
  "Renovation", "Just Enquiry", "Other",
];

// ADDED: form values from a saved walk-in (used when a typed number is already
// saved on a walk-in - its details are loaded into the form)
// ADDED: the walk-in form has the same fields as the Add lead form
// (same option lists as components/LeadModal.jsx)
const WL_CATEGORIES = ["NOT INTERESTED", "FOLLOW UP", "INTERESTED", "NOT ANSWERED"];
const WL_PROJECT_TYPES = ["2BHK", "3BHK", "4BHK", "Villa", "Commercial", "Others"];
const d10w = (v) => (v ? String(v).slice(0, 10) : "");
const leadFieldsFrom = (w) => ({
  project_type: w.project_type || "",
  assigned_to: w.assigned_to || "",
  first_calling_date: d10w(w.first_calling_date),
  second_calling_date: d10w(w.second_calling_date),
  third_calling_date: d10w(w.third_calling_date),
  call_category: w.call_category || "",
  quote_sent: w.quote_sent || "",
  order_booked: w.order_booked || "",
  revenue_booked: w.revenue_booked === null || w.revenue_booked === undefined ? "" : String(Number(w.revenue_booked)),
  whatsapp_sent_date: d10w(w.whatsapp_sent_date),
  whatsapp_category: w.whatsapp_category || "",
  next_call_date: d10w(w.next_call_date),
  priority: w.priority || "none",
  source: w.source || "",
  calling_remark: w.calling_remark || "",
  call_remark_1: w.call_remark_1 || "",
  call_remark_2: w.call_remark_2 || "",
  call_remark_3: w.call_remark_3 || "",
  whatsapp_date_1: d10w(w.whatsapp_date_1),
  whatsapp_date_2: d10w(w.whatsapp_date_2),
  whatsapp_date_3: d10w(w.whatsapp_date_3),
});

const fromWalkin = (w) => ({
  name: w.name || "", phone: w.phone || "", alt_phone: w.alt_phone || "", project_name: w.project_name || "",
  visit_date: w.visit_date ? String(w.visit_date).slice(0, 10) : "", purpose: w.purpose || "",
  location: w.location || "", site_location: w.site_location || "", city: w.city || "", state: w.state || "" /* ADDED */, address: w.address || "",
  budget: w.budget || "", attended_by: w.attended_by || "", remarks: w.remarks || "",
  ...leadFieldsFrom(w), // ADDED
});
const digitsOf = (v) => String(v || "").replace(/\D/g, "");

// ORIGINAL (Walk-in Location + City boxes) - replaced by <StateCityLocation /> (State -> City -> Location):
//           {/* ADDED: customer / site location */}
//           <div>
//             <label>Location</label>
//             <input value={form.site_location} onChange={(e) => set("site_location", e.target.value)} placeholder="Area / locality" />
//           </div>
//           {/* ADDED: city */}
//           <div>
//             <label>City</label>
//             <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
//           </div>

// ORIGINAL lines (before they were updated) - kept here word for word for reference:
//   location: w.location || "", site_location: w.site_location || "", city: w.city || "", address: w.address || "",

// ORIGINAL form layout (walk-in fields + "Lead details" section) - replaced so the walk-in form has
// exactly the same fields as the Add lead form. Kept word for word for reference.
// Removed from the form: Alternate mobile, Visit date, Purpose, Experience centre, Address, Budget,
// Attended by, Remarks (saved values stay in the database and are kept when a walk-in is edited).
//         <div className="form-grid">
//           <div>
//             <label>Name</label>
//             <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Customer name" />
//           </div>
//           <div>
//             <label>Phone number</label>
//             {/* ORIGINAL: <input value={form.phone} ... placeholder="Phone number" /> */}
//             <PhoneInput value={form.phone} original={walkin.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" />
//           </div>
//           {/* ADDED: alternate mobile number */}
//           <div>
//             <label>Alternate mobile number</label>
//             {/* ORIGINAL: <input value={form.alt_phone} ... placeholder="Alternate mobile number" /> */}
//             <PhoneInput value={form.alt_phone} original={walkin.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} placeholder="Alternate mobile number" />
//           </div>
//           {/* ADDED: project name / villa name */}
//           <div>
//             <label>Project name / villa name</label>
//             <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="e.g. Aparna Xenon / villa no." />
//           </div>
//           <div>
//             <label>Visit date</label>
//             <input type="date" value={form.visit_date} onChange={(e) => set("visit_date", e.target.value)} />
//           </div>
//           <div>
//             <label>Purpose</label>
//             <select value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>
//               <option value="">Select purpose</option>
//               {WALKIN_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
//             </select>
//           </div>
//           <div>
//             {/* UPDATED label: was "Experience centre / location" - now just the
//                 centre, since Location/City/Address below cover the customer's place */}
//             <label>Experience centre</label>
//             <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Which centre" />
//           </div>
//           {/* ADDED: State -> City -> Location of the customer (replaces the Location and City boxes; same saved values) */}
//           <StateCityLocation values={form} onChange={set} keys={{ location: "site_location" }} />
//           {/* ADDED: address (full width) */}
//           <div style={{ gridColumn: "1 / -1" }}>
//             <label>Address</label>
//             <textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
//           </div>
//           <div>
//             <label>Budget</label>
//             <input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 5-8 lakhs" />
//           </div>
//           <div>
//             <label>Attended by</label>
//             <input value={form.attended_by} onChange={(e) => set("attended_by", e.target.value)} placeholder="Designer / sales person" />
//           </div>
//           <div style={{ gridColumn: "1 / -1" }}>
//             <label>Remarks</label>
//             <textarea rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Remarks..." />
//           </div>
//         </div>
//
//         {/* ADDED: the same fields as the Add lead form (saved with the walk-in and
//             copied into the lead when the walk-in is converted) */}
//         <div className="wl-lead-title">📋 Lead details</div>
//         <div className="form-grid">
//           <div>
//             <label>Project type</label>
//             <select value={form.project_type} onChange={(e) => set("project_type", e.target.value)}>
//               <option value="">—</option>
//               {WL_PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
//             </select>
//           </div>
//           {isAdmin && (
//             <div>
//               <label>Assigned telecaller</label>
//               <select value={form.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
//                 <option value="">Unassigned</option>
//                 {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
//               </select>
//             </div>
//           )}
//           <div>
//             <label>1st calling date</label>
//             <input type="date" value={form.first_calling_date} onChange={(e) => set("first_calling_date", e.target.value)} />
//           </div>
//           <div>
//             <label>2nd calling date</label>
//             <input type="date" value={form.second_calling_date} onChange={(e) => set("second_calling_date", e.target.value)} />
//           </div>
//           <div>
//             <label>3rd calling date</label>
//             <input type="date" value={form.third_calling_date} onChange={(e) => set("third_calling_date", e.target.value)} />
//           </div>
//           <div>
//             <label>Call category</label>
//             <select value={form.call_category} onChange={(e) => set("call_category", e.target.value)}>
//               <option value="">—</option>
//               {WL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
//             </select>
//           </div>
//           <div>
//             <label>Quote sent</label>
//             <select value={form.quote_sent} onChange={(e) => set("quote_sent", e.target.value)}>
//               <option value="">—</option><option>Yes</option><option>No</option>
//             </select>
//           </div>
//           <div>
//             <label>Order booked</label>
//             <select value={form.order_booked} onChange={(e) => set("order_booked", e.target.value)}>
//               <option value="">—</option><option>Yes</option><option>No</option>
//             </select>
//           </div>
//           <div>
//             <label>Revenue booked (₹)</label>
//             <input type="text" inputMode="decimal" autoComplete="off" value={form.revenue_booked}
//                    onChange={(e) => set("revenue_booked", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
//                    placeholder="e.g. 250000" />
//           </div>
//           <div>
//             <label>WhatsApp message sent on</label>
//             <input type="date" value={form.whatsapp_sent_date} onChange={(e) => set("whatsapp_sent_date", e.target.value)} />
//           </div>
//           <div>
//             <label>WhatsApp category</label>
//             <input value={form.whatsapp_category} onChange={(e) => set("whatsapp_category", e.target.value)} placeholder="e.g. DECOR" />
//           </div>
//           <div>
//             <label>Next call date</label>
//             <input type="date" value={form.next_call_date} onChange={(e) => set("next_call_date", e.target.value)} />
//           </div>
//           <div>
//             <label>Priority</label>
//             <select className={`prio-select ${form.priority || "none"}`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
//               <option value="none">None</option>
//               <option value="hot">🔥 Hot</option>
//               <option value="warm">☀️ Warm</option>
//               <option value="cold">❄️ Cold</option>
//               <option value="dead">⚫ Dead</option>
//             </select>
//           </div>
//           {isAdmin && (
//             <div>
//               <label>Source</label>
//               <input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. JustDial, Website" />
//             </div>
//           )}
//           <div style={{ gridColumn: "1 / -1" }}>
//             <label>Calling remark</label>
//             <textarea rows={2} value={form.calling_remark} onChange={(e) => set("calling_remark", e.target.value)} placeholder="e.g. she wants designs (guntur 4bhk) (sent)" />
//           </div>
//           {[1, 2, 3].map((n) => (
//             <div key={`cr${n}`}>
//               <label>Call {n} remark</label>
//               <input value={form[`call_remark_${n}`]} onChange={(e) => set(`call_remark_${n}`, e.target.value)} placeholder={`Remark for call ${n}`} />
//             </div>
//           ))}
//           {[1, 2, 3].map((n) => (
//             <div key={`wa${n}`}>
//               <label>WhatsApp {n} sent date</label>
//               <input type="date" value={form[`whatsapp_date_${n}`]} onChange={(e) => set(`whatsapp_date_${n}`, e.target.value)} />
//             </div>
//           ))}
//         </div>

// ORIGINAL: export default function WalkinModal({ walkin, onClose, onSaved }) {
// ADDED: Delete inside the form (admin only) - the page passes onDelete; it asks to confirm
export default function WalkinModal({ walkin, onClose, onSaved, onDelete }) {
  // ORIGINAL: const isNew = !walkin.id;
  // UPDATED: when a typed number is already saved on a walk-in, the form
  // switches to editing THAT walk-in (existing.id) - saving updates it.
  const [existing, setExisting] = useState(null);
  const [existingCount, setExistingCount] = useState(0);
  const editId = walkin.id || (existing && existing.id) || null;
  const isNew = !editId;
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
    state: walkin.state || "", // ADDED
    address: walkin.address || "",
    budget: walkin.budget || "",
    attended_by: walkin.attended_by || "",
    remarks: walkin.remarks || "",
    ...leadFieldsFrom(walkin), // ADDED: same fields as the Add lead form
  });
  // ADDED: admin picks the telecaller (same as the lead form)
  const isAdmin = getUser()?.role === "admin";
  const [telecallers, setTelecallers] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    api("/users").then((rows) => setTelecallers((rows || []).filter((u) => u.role === "telecaller"))).catch(() => {});
  }, [isAdmin]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ADDED: in "Add walk-in", as soon as a full number (10+ digits) is typed in
  // Phone or Alternate mobile, check if it is already saved on a walk-in.
  // If yes, load that walk-in's details into the form.
  const [checking, setChecking] = useState(false);
  const lookupSeq = useRef(0);
  // ADDED: shown when the number check cannot reach the server (e.g. backend not updated yet)
  const [lookupWarn, setLookupWarn] = useState("");
  const checkedNumbers = useRef(new Set());
  const typedNumbers = [form.phone, form.alt_phone].map(digitsOf).filter((d) => d.length >= 10).join(",");
  useEffect(() => {
    if (walkin.id || existing || !typedNumbers) return undefined;
    const toCheck = typedNumbers.split(",").filter((d) => !checkedNumbers.current.has(d.slice(-10)));
    if (!toCheck.length) return undefined;
    const seq = ++lookupSeq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        for (const num of toCheck) {
          checkedNumbers.current.add(num.slice(-10));
          const d = await api(`/walkins/lookup?phone=${encodeURIComponent(num)}`);
          if (seq !== lookupSeq.current) return;
          if (d.found && d.walkin) {
            setExisting(d.walkin);
            setExistingCount(d.matches || 1);
            setForm(fromWalkin(d.walkin));
            setError("");
            return;
          }
        }
      } catch (e) {
        // UPDATED: tell the user instead of failing silently
        setLookupWarn("Could not check if this number is already saved. Please make sure the latest backend is deployed.");
        checkedNumbers.current = new Set(); // allow a retry when the number is typed again
      }
      finally { if (seq === lookupSeq.current) setChecking(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [typedNumbers, walkin.id, existing]);

  // ADDED: "Not this person? Start again"
  const clearExisting = () => {
    lookupSeq.current++;
    checkedNumbers.current = new Set();
    setExisting(null);
    setExistingCount(0);
    setForm(fromWalkin({}));
    setError("");
  };

  const save = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      return setError("Name and phone number are required");
    }
    setSaving(true);
    try {
      if (isNew) {
        // ORIGINAL: await api("/walkins", { method: "POST", body: JSON.stringify(form) });
        // UPDATED: Visit date is not in the form any more - a new walk-in gets today's date
        const t = new Date();
        const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
        await api("/walkins", { method: "POST", body: JSON.stringify({ ...form, visit_date: form.visit_date || today }) });
      } else {
        // ORIGINAL: await api(`/walkins/${walkin.id}`, { method: "PUT", body: JSON.stringify(form) });
        await api(`/walkins/${editId}`, { method: "PUT", body: JSON.stringify(form) });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    // ORIGINAL: <div className="modal-overlay" onClick={onClose}>
    // UPDATED: clicking the empty space outside the form no longer closes it
    // (so typed data isn't lost by accident). Close with Cancel or after Save.
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* ADDED: "X" close button (top-right) - closes the form without saving */}
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        {/* ORIGINAL: <h3>{isNew ? "Add walk-in" : `Edit walk-in — ${walkin.name}`}</h3> */}
        <h3>{isNew ? "Add walk-in" : `Edit walk-in — ${walkin.name || (existing && existing.name) || ""}`}</h3>
        {/* ADDED: number already saved on a walk-in -> its details are loaded below */}
        {existing && !walkin.id && (
          <>
            <div className="sc-dup">
              <div>
                <b>This phone number is already saved{existingCount > 1 ? ` on ${existingCount} walk-ins` : ""}.</b> The walk-in details are loaded below.
                Saving will <b>update this walk-in</b> - no duplicate will be created.
              </div>
              <button type="button" className="btn small secondary" onClick={clearExisting}>Not this person? Start again</button>
            </div>
            <div className="lead-card sc-found-card">
              <div className="lc-head">
                <div>
                  <div className="lc-name">🚶 {existing.name || "-"}</div>
                  <div className="lc-sub">Already visited{existing.visit_date ? ` on ${String(existing.visit_date).slice(0, 10)}` : ""}</div>
                </div>
                {existing.converted_lead_id ? <span className="chip yes">✓ Lead</span> : <span className="chip none">Walk-in</span>}
              </div>
              <div className="lc-grid">
                <span>Phone number</span><b>{cardPhone(existing.phone) || "-"}</b>
                {existing.alt_phone && (<><span>Alt. mobile</span><b>{cardPhone(existing.alt_phone)}</b></>)}
                <span>Project / villa</span><b>{existing.project_name || "-"}</b>
                <span>Purpose</span><b>{existing.purpose || "-"}</b>
                <span>Experience centre</span><b>{existing.location || "-"}</b>
                <span>Budget</span><b>{existing.budget || "-"}</b>
                <span>Attended by</span><b>{existing.attended_by || "-"}</b>
              </div>
              {existing.remarks && <div className="lc-remarks"><div><span>Remarks:</span> {existing.remarks}</div></div>}
            </div>
          </>
        )}
        {checking && !existing && <div className="sc-checking">Checking number…</div>}
        {lookupWarn && !existing && <div className="sc-checking" style={{ color: "var(--red-ink)" }}>⚠ {lookupWarn}</div>}
        {error && <div className="error-msg">{error}</div>}

        {/* UPDATED: the walk-in form now has exactly the same fields as the Add lead form,
            in the same order (old layout kept as a comment above the component) */}
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <label>Project name</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="Project name" />
          </div>
          <div>
            <label>Project type</label>
            <select value={form.project_type} onChange={(e) => set("project_type", e.target.value)}>
              <option value="">—</option>
              {WL_PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Primary phone</label>
            <PhoneInput value={form.phone} original={walkin.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" />
          </div>
          {isAdmin && (
            <div>
              <label>Assigned telecaller</label>
              <select value={form.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Unassigned</option>
                {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <StateCityLocation values={form} onChange={set} keys={{ location: "site_location" }} />
          <div>
            <label>1st calling date</label>
            <input type="date" value={form.first_calling_date} onChange={(e) => set("first_calling_date", e.target.value)} />
          </div>
          <div>
            <label>2nd calling date</label>
            <input type="date" value={form.second_calling_date} onChange={(e) => set("second_calling_date", e.target.value)} />
          </div>
          <div>
            <label>3rd calling date</label>
            <input type="date" value={form.third_calling_date} onChange={(e) => set("third_calling_date", e.target.value)} />
          </div>
          <div>
            <label>Call category</label>
            <select value={form.call_category} onChange={(e) => set("call_category", e.target.value)}>
              <option value="">—</option>
              {WL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Quote sent</label>
            <select value={form.quote_sent} onChange={(e) => set("quote_sent", e.target.value)}>
              <option value="">—</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div>
            <label>Order booked</label>
            <select value={form.order_booked} onChange={(e) => set("order_booked", e.target.value)}>
              <option value="">—</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div>
            <label>Revenue booked (₹)</label>
            <input type="text" inputMode="decimal" autoComplete="off" value={form.revenue_booked}
                   onChange={(e) => set("revenue_booked", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                   placeholder="e.g. 250000" />
          </div>
          <div>
            <label>WhatsApp message sent on</label>
            <input type="date" value={form.whatsapp_sent_date} onChange={(e) => set("whatsapp_sent_date", e.target.value)} />
          </div>
          <div>
            <label>WhatsApp category</label>
            <input value={form.whatsapp_category} onChange={(e) => set("whatsapp_category", e.target.value)} placeholder="e.g. DECOR" />
          </div>
          <div>
            <label>Next call date</label>
            <input type="date" value={form.next_call_date} onChange={(e) => set("next_call_date", e.target.value)} />
          </div>
          <div>
            <label>Priority</label>
            <select className={`prio-select ${form.priority || "none"}`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="none">None</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
              <option value="dead">⚫ Dead</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label>Source</label>
              <input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. JustDial, Website" />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Calling remark</label>
            <textarea rows={2} value={form.calling_remark} onChange={(e) => set("calling_remark", e.target.value)} placeholder="e.g. she wants designs (guntur 4bhk) (sent)" />
          </div>
          {[1, 2, 3].map((n) => (
            <div key={`cr${n}`}>
              <label>Call {n} remark</label>
              <input value={form[`call_remark_${n}`]} onChange={(e) => set(`call_remark_${n}`, e.target.value)} placeholder={`Remark for call ${n}`} />
            </div>
          ))}
          {[1, 2, 3].map((n) => (
            <div key={`wa${n}`}>
              <label>WhatsApp {n} sent date</label>
              <input type="date" value={form[`whatsapp_date_${n}`]} onChange={(e) => set(`whatsapp_date_${n}`, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="actions">
          {/* ADDED: Delete (admin only) - moved here from the card */}
          {onDelete && !isNew && (
            <button type="button" className="btn danger form-del-btn" onClick={() => onDelete({ ...walkin, ...form, id: editId })}>🗑 Delete</button>
          )}
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add walk-in" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
