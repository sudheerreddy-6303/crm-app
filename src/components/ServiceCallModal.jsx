// ORIGINAL: import React, { useState } from "react";
import React, { useEffect, useRef, useState } from "react";
// ORIGINAL: import { api } from "../api.js";
// ADDED: State -> City -> Location (Telangana / Andhra Pradesh) - same in every form
import StateCityLocation from "./StateCityLocation.jsx";
import { api, getUser } from "../api.js";
// ADDED: locked phone box for telecallers (xxxxxxx789), normal box for admin
import PhoneInput from "./PhoneInput.jsx";
// ADDED: hide the number on the "already saved" card (xxxxxxx789)
import { cardPhone } from "../utils/maskPhone.js";
// ADDED: Interior Designer extra details (CV upload, pop-ups, Hyderabad areas)
import { uploadCv, openCv, removeCv, CV_ACCEPT, CV_MAX_MB } from "../utils/serviceCallCv.js";
import { showPopup } from "./Popup.jsx";
import { HYDERABAD_AREAS } from "../utils/hyderabadAreas.js";
// ADDED: Telangana + Andhra Pradesh cities, and areas of each city for Location
// ORIGINAL (not needed now - moved into StateCityLocation): import { TS_CITIES, AP_CITIES, areasFor } from "../utils/apTsCities.js";

// ADDED: extra section shown only when Category = "Interior Designer"
export const DESIGNER_CATEGORY = "Interior Designer";
export const EXP_RANGES = ["0-1", "1-2", "2-3", "3-4", "4+"];
const d10 = (v) => (v ? String(v).slice(0, 10) : "");

// ADDED: City dropdown = "Hyderabad" + all Hyderabad areas; "Other" lets you type
// any other city (existing values like "anantapur" keep working).
// ORIGINAL: const CITY_OPTIONS = ["Hyderabad", ...HYDERABAD_AREAS];
// UPDATED: all Telangana (TS) + Andhra Pradesh (AP) cities. Old records saved with a
// Hyderabad area as the city still show it (as "Other"), nothing is lost.
// REPLACED by <StateCityLocation /> (kept for reference):
// const CITY_OPTIONS = [...TS_CITIES, ...AP_CITIES];
// // ADDED: "Other (type location)" value in the Location dropdown
// const LOC_OTHER = "__other_location__";
// const CITY_OTHER = "__other__";
// // match ignoring capitals / spaces, so a saved "hyderabad" selects "Hyderabad"
// const cityMatch = (v) => CITY_OPTIONS.find((c) => c.toLowerCase() === String(v || "").trim().toLowerCase()) || "";
const toDesigner = (c) => ({
  exp_range: c.exp_range || "",
  // ORIGINAL: interview_attended: c.interview_attended || "",
  // UPDATED: "Attended interview?" is "No" by default for Interior Designers
  interview_attended: c.interview_attended || "No",
  current_location: c.current_location || "",
  company_name: c.company_name || "",
  designation: c.designation || "",
  salary: c.salary || "",
  followup1_date: d10(c.followup1_date), followup1_remark: c.followup1_remark || "",
  followup2_date: d10(c.followup2_date), followup2_remark: c.followup2_remark || "",
  followup3_date: d10(c.followup3_date), followup3_remark: c.followup3_remark || "",
});

// ADDED: Service Call add/edit modal - opened by the "+ Add service call"
// button on the Service Calls page. Follows the same pattern as LeadModal.
// To add more categories later, add them here AND in
// backend/routes/serviceCalls.js (SERVICE_CATEGORIES).
export const SERVICE_CATEGORIES = [
  "Painter", "Electrician", "Designer", "Sales",
  "Carpenter", "Plumber", "Deep Cleaning", "Other",
  // ADDED: more service categories
  "Glass Work", "Marbles Work", "Tele Callers", "Sales Executive",
  "Interior Designer", "Builders", "False Ceiling", "AC Repair",
  "Printer Repair", "Chair Repair", "Site Managers",
  // ADDED
  "Architects",
];

// ADDED: categories hidden from the Add / Edit service call dropdown only
// (kept in SERVICE_CATEGORIES so old records, filters and Excel import still work)
const FORM_HIDDEN_CATEGORIES = ["Designer"];
// ADDED: value of the "+ Add new category" item in the Category dropdown
const NEW_CATEGORY = "__new_category__";

// ADDED: form values from a saved record (used for the duplicate-number auto-fill)
const toForm = (c, phone) => ({
  name: c.name || "",
  phone: phone !== undefined ? phone : c.phone || "",
  category: c.category || "",
  location: c.location || "",
  city: c.city || "",
  state: c.state || "", // ADDED
  experience: c.experience || "",
  remarks: c.remarks || "",
});

// ORIGINAL (Service call City + Location fields) - replaced by <StateCityLocation /> (State -> City -> Location):
//           <div>
//             <label>City</label>
//             {/* ORIGINAL: <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
//                 UPDATED: Hyderabad areas dropdown + "Other" to type any city */}
//             <select
//               value={cityIsOther ? CITY_OTHER : cityMatch(form.city)}
//               onChange={(e) => {
//                 if (e.target.value === CITY_OTHER) { setCityOther(true); if (cityMatch(form.city)) set("city", ""); }
//                 // ORIGINAL: else { setCityOther(false); set("city", e.target.value); }
//                 else { setCityOther(false); onCityPicked(e.target.value); }
//               }}
//             >
//               {/* ORIGINAL: <option value="">Select city / area</option> */}
//               <option value="">Select city</option>
//               {/* ORIGINAL: {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)} */}
//               {/* UPDATED: grouped by state */}
//               <optgroup label="Telangana">
//                 {TS_CITIES.map((c) => <option key={`ts-${c}`} value={c}>{c}</option>)}
//               </optgroup>
//               <optgroup label="Andhra Pradesh">
//                 {AP_CITIES.map((c) => <option key={`ap-${c}`} value={c}>{c}</option>)}
//               </optgroup>
//               <option value={CITY_OTHER}>Other (type city)</option>
//             </select>
//             {cityIsOther && (
//               <input style={{ marginTop: 8 }} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Type city" autoFocus={cityOther && !form.city} />
//             )}
//           </div>
//           <div>
//             <label>Location</label>
//             {/* ORIGINAL: <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Location / area" /> */}
//             {/* UPDATED: areas of the chosen city (when we have a list for it) */}
//             {locAreas.length > 0 ? (
//               <>
//                 <select
//                   value={locIsOther ? LOC_OTHER : locMatch}
//                   onChange={(e) => {
//                     if (e.target.value === LOC_OTHER) { setLocOther(true); if (locMatch) set("location", ""); }
//                     else { setLocOther(false); set("location", e.target.value); }
//                   }}
//                 >
//                   <option value="">Select location in {cityMatch(form.city)}</option>
//                   {locAreas.map((a) => <option key={a} value={a}>{a}</option>)}
//                   <option value={LOC_OTHER}>Other (type location)</option>
//                 </select>
//                 {locIsOther && (
//                   <input style={{ marginTop: 8 }} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Type location" autoFocus={locOther && !form.location} />
//                 )}
//               </>
//             ) : (
//               <input value={form.location} onChange={(e) => set("location", e.target.value)}
//                 placeholder={form.city ? `Location / area in ${form.city}` : "Select city first, or type location"} />
//             )}
//           </div>

// ORIGINAL lines (before they were updated) - kept here word for word for reference:
//   setLocOther(false); // ADDED

// ORIGINAL: export default function ServiceCallModal({ call, onClose, onSaved }) {
// ADDED: Delete inside the form (admin only) - the page passes onDelete; it asks to confirm
export default function ServiceCallModal({ call, onClose, onSaved, onDelete }) {
  // ORIGINAL: const isNew = !call.id;
  // UPDATED: when the typed number already exists, the form switches to
  // editing THAT record (existing.id) - so saving updates it, no duplicate.
  const [existing, setExisting] = useState(null);
  const editId = call.id || (existing && existing.id) || null;
  const isNew = !editId;
  const [form, setForm] = useState({
    name: call.name || "",
    phone: call.phone || "",
    category: call.category || "",
    location: call.location || "",
    // ADDED: city + experience (also populated by the Excel import)
    city: call.city || "",
    state: call.state || "", // ADDED
    experience: call.experience || "",
    remarks: call.remarks || "",
  });
  // ADDED: checking the number while it is typed (only in "Add service call")
  const [checking, setChecking] = useState(false);
  const lookupSeq = useRef(0);
  // ADDED: shown when the number check cannot reach the server (e.g. backend not updated yet)
  const [lookupWarn, setLookupWarn] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ADDED: categories added from the app (+ Add new category). Anyone can add;
  // only admin can remove an added category from the list.
  const isAdmin = getUser()?.role === "admin";
  const [customCats, setCustomCats] = useState([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const loadCustomCats = () =>
    api("/service-calls/categories").then((d) => setCustomCats(d.custom || [])).catch(() => {});
  useEffect(() => { loadCustomCats(); }, []);
  const onCategoryChange = (v) => {
    if (v === NEW_CATEGORY) { setAddingCat(true); setNewCat(""); return; }
    set("category", v);
  };
  const addCategory = async () => {
    const name = newCat.replace(/\s+/g, " ").trim();
    if (!name) { showPopup("error", "Please type the new category name.", "Category name missing"); return; }
    setCatBusy(true);
    try {
      const d = await api("/service-calls/categories", { method: "POST", body: JSON.stringify({ name }) });
      await loadCustomCats();
      set("category", d.name);
      setAddingCat(false); setNewCat("");
    } catch (e) {
      // already in the list -> just select it
      const same = [...SERVICE_CATEGORIES, ...customCats.map((c) => c.name)].find((c) => c.toLowerCase() === name.toLowerCase());
      if (same) { set("category", same); setAddingCat(false); setNewCat(""); }
    } finally {
      setCatBusy(false);
    }
  };
  const removeCategory = async (c) => {
    if (!window.confirm(`Remove "${c.name}" from the category list?\nService calls already saved with it keep it.`)) return;
    try {
      await api(`/service-calls/categories/${c.id}`, { method: "DELETE" });
      loadCustomCats();
    } catch { /* popup already shown */ }
  };
  const customNames = customCats.map((c) => c.name);

  // REPLACED by <StateCityLocation /> (kept for reference):
//   // ADDED: true while "Other (type city)" is chosen in the City dropdown
//   const [cityOther, setCityOther] = useState(false);
//   const cityIsOther = cityOther || (form.city && !cityMatch(form.city));
//   // ADDED: Location follows the City - a dropdown of that city's areas
//   // (Hyderabad, Secunderabad, Visakhapatnam, Vijayawada, Guntur, Tirupati, Warangal);
//   // other cities keep the normal text box. "Other" lets you type any location.
//   const locAreas = cityIsOther ? [] : areasFor(form.city);
//   const [locOther, setLocOther] = useState(false);
//   const locMatch = locAreas.find((a) => a.toLowerCase() === String(form.location || "").trim().toLowerCase()) || "";
//   const locIsOther = locOther || Boolean(form.location && !locMatch);
//   // when the City changes, a location from the old city's list is cleared
//   const onCityPicked = (city) => {
//     set("city", city);
//     setLocOther(false);
//     const newAreas = areasFor(city);
//     const cur = String(form.location || "").trim().toLowerCase();
//     if (cur && newAreas.length && !newAreas.some((a) => a.toLowerCase() === cur)) set("location", "");
//   };

  // ADDED: Interior Designer details (kept separate from the original form fields)
  const [designer, setDesigner] = useState(() => toDesigner(call));
  const setD = (k, v) => setDesigner((d) => ({ ...d, [k]: v }));
  const isDesigner = form.category === DESIGNER_CATEGORY;
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState(call.cv_name || "");
  const pickCv = (file) => {
    if (file && file.size > CV_MAX_MB * 1024 * 1024) {
      showPopup("error", `This file is ${(file.size / 1048576).toFixed(1)} MB. The CV must be ${CV_MAX_MB} MB or smaller.`, "CV too big");
      return;
    }
    setCvFile(file || null);
  };
  const viewCv = async () => {
    try { await openCv(editId); } catch (e) { showPopup("error", e.message, "Could not open CV"); }
  };
  const deleteCv = async () => {
    if (!window.confirm("Remove this CV?")) return;
    try { await removeCv(editId); setCvName(""); showPopup("success", "The CV was removed.", "CV removed"); }
    catch (e) { showPopup("error", e.message, "Could not remove CV"); }
  };

  // ADDED: as soon as a full number (10+ digits) is typed in a NEW service call,
  // look it up. If it is already saved, load that record's details into the
  // form and show a notice - saving will then update it instead of adding a copy.
  const digits = String(form.phone || "").replace(/\D/g, "");
  useEffect(() => {
    if (call.id || existing || digits.length < 10) return undefined;
    const seq = ++lookupSeq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const d = await api(`/service-calls/lookup?phone=${encodeURIComponent(digits)}`);
        if (seq !== lookupSeq.current) return; // a newer number was typed
        if (d.found && d.call) {
          setExisting(d.call);
          setForm((f) => toForm(d.call, f.phone));
          // ADDED: load the saved Interior Designer details + CV too
          setDesigner(toDesigner(d.call));
          setCvName(d.call.cv_name || "");
          setError("");
        }
      } catch (e) {
        // UPDATED: tell the user instead of failing silently
        setLookupWarn("Could not check if this number is already saved. Please make sure the latest backend is deployed.");
      }
      finally { if (seq === lookupSeq.current) setChecking(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [digits, call.id, existing]);

  // ADDED: "Not this person? Start again" - clears the loaded record
  const clearExisting = () => {
    lookupSeq.current++;
    setExisting(null);
    setForm(toForm({}, ""));
    // ADDED
    setDesigner(toDesigner({}));
    setCvName("");
    setCvFile(null);
    // REPLACED (StateCityLocation keeps its own state): setCityOther(false); setLocOther(false);
    setError("");
  };

  const save = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      return setError("Name and phone number are required");
    }
    setSaving(true);
    try {
      // ORIGINAL: if (isNew) POST ... else PUT /service-calls/${call.id}
      // UPDATED: editId = this record, or the existing record found by number
      // ADDED: Interior Designer details are sent only for that category
      // ORIGINAL: const body = isDesigner ? { ...form, ...designer } : form;
      // UPDATED: every other category sends its 3 follow-ups too
      const followups = {};
      [1, 2, 3].forEach((n) => {
        followups[`followup${n}_date`] = designer[`followup${n}_date`];
        followups[`followup${n}_remark`] = designer[`followup${n}_remark`];
      });
      const body = isDesigner ? { ...form, ...designer } : { ...form, ...followups };
      // ORIGINAL: await api("/service-calls", { method: "POST", body: JSON.stringify(form) });
      // ORIGINAL: await api(`/service-calls/${editId}`, { method: "PUT", body: JSON.stringify(form) });
      let savedId = editId;
      if (isNew) {
        const d = await api("/service-calls", { method: "POST", body: JSON.stringify(body) });
        savedId = d && d.id;
      } else {
        await api(`/service-calls/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      }
      // ADDED: upload the chosen CV after the record is saved
      if (isDesigner && cvFile && savedId) {
        try {
          await uploadCv(savedId, cvFile);
          showPopup("success", `${cvFile.name} was uploaded.`, "Saved with CV");
        } catch (e) {
          showPopup("error", `The details were saved, but the CV could not be uploaded: ${e.message}`, "CV not uploaded");
        }
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
        {/* ORIGINAL: <h3>{isNew ? "Add service call" : `Edit service call — ${call.name}`}</h3> */}
        <h3>{isNew ? "Add service call" : `Edit service call — ${call.name || (existing && existing.name) || ""}`}</h3>
        {error && <div className="error-msg">{error}</div>}
        {/* ADDED: number already saved -> its details are loaded below */}
        {existing && !call.id && (
          <div className="sc-dup">
            <div>
              <b>This phone number is already saved.</b> Its details are loaded below
              {existing.created_by_name ? ` (added by ${existing.created_by_name})` : ""}.
              Saving will <b>update this record</b> - no duplicate will be created.
            </div>
            <button type="button" className="btn small secondary" onClick={clearExisting}>Not this person? Start again</button>
          </div>
        )}
        {/* ADDED: the saved person shown as a card (same style as the other cards) */}
        {existing && !call.id && (
          <div className="lead-card sc-found-card">
            <div className="lc-head">
              <div>
                <div className="lc-name">👤 {existing.name || "-"}</div>
                <div className="lc-sub">Already in the database</div>
              </div>
              {existing.category && <span className="chip none">{existing.category}</span>}
            </div>
            <div className="lc-grid">
              <span>Phone number</span><b>{cardPhone(existing.phone) || "-"}</b>
              <span>City</span><b>{existing.city || "-"}</b>
              <span>Location</span><b>{existing.location || "-"}</b>
              <span>Experience</span><b>{existing.experience || "-"}</b>
              <span>Added by</span><b>{existing.created_by_name || "-"}</b>
              <span>Added on</span><b>{existing.created_at ? String(existing.created_at).slice(0, 10) : "-"}</b>
            </div>
            {existing.remarks && (
              <div className="lc-remarks"><div><span>Remarks:</span> {existing.remarks}</div></div>
            )}
          </div>
        )}
        {checking && !existing && <div className="sc-checking">Checking number…</div>}
        {lookupWarn && !existing && <div className="sc-checking" style={{ color: "var(--red-ink)" }}>⚠ {lookupWarn}</div>}

        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <label>Phone number</label>
            {/* ORIGINAL: <input value={form.phone} ... placeholder="Phone number" /> */}
            <PhoneInput value={form.phone} original={call.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label>Category</label>
            {/* ORIGINAL: <select value={form.category} onChange={(e) => set("category", e.target.value)}> */}
            <select value={form.category} onChange={(e) => onCategoryChange(e.target.value)}>
              <option value="">Select category</option>
              {/* ORIGINAL: {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)} */}
              {/* UPDATED: "Designer" removed from this dropdown (use "Interior Designer").
                  Still shown when editing an old record that is already "Designer". */}
              {SERVICE_CATEGORIES.filter((c) => !FORM_HIDDEN_CATEGORIES.includes(c) || form.category === c)
                .map((c) => <option key={c} value={c}>{c}</option>)}
              {/* ADDED: categories added from the app */}
              {/* ORIGINAL: {customNames.map((c) => <option key={`c-${c}`} value={c}>{c}</option>)} */}
              {/* UPDATED: skip an added category that is now also in the built-in list (e.g. Architects) */}
              {customNames.filter((c) => !SERVICE_CATEGORIES.some((s) => s.toLowerCase() === c.toLowerCase()))
                .map((c) => <option key={`c-${c}`} value={c}>{c}</option>)}
              {/* ADDED: old record whose category is no longer in any list - keep it visible */}
              {form.category && !SERVICE_CATEGORIES.includes(form.category) && !customNames.includes(form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              <option value={NEW_CATEGORY}>➕ Add new category…</option>
            </select>
            {/* ADDED: add a new category to the dropdown */}
            {addingCat && (
              <div className="sc-newcat">
                <div className="sc-newcat-row">
                  <input autoFocus value={newCat} maxLength={60} placeholder="New category name"
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
                  <button type="button" className="btn small" disabled={catBusy} onClick={addCategory}>{catBusy ? "Adding..." : "Add"}</button>
                  <button type="button" className="btn small secondary" disabled={catBusy} onClick={() => { setAddingCat(false); setNewCat(""); }}>Cancel</button>
                </div>
                {isAdmin && customCats.length > 0 && (
                  <div className="sc-newcat-list">
                    <span>Added categories (admin can remove):</span>
                    {customCats.map((c) => (
                      <span key={c.id} className="sc-newcat-chip">{c.name}
                        <button type="button" onClick={() => removeCategory(c)} aria-label={`Remove ${c.name}`} title="Remove from list">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ADDED: State -> City -> Location (replaces the City and Location fields; same saved values) */}
          <StateCityLocation values={form} onChange={set} />
          {/* REMOVED from the form on request (saved values are kept; Interior Designers still have "Experience (years)"):
          <div>
            <label>Experience</label>
            <input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 3 years" />
          </div> */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Remarks</label>
            <textarea rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Remarks..." />
          </div>
        </div>

        {/* ADDED: Interior Designer details - only when Category = Interior Designer */}
        {isDesigner && (
          <div className="sc-designer">
            <div className="sc-designer-title">🎨 Interior Designer details</div>
            <div className="form-grid">
              <div>
                <label>Experience (years)</label>
                <select value={designer.exp_range} onChange={(e) => setD("exp_range", e.target.value)}>
                  <option value="">Select experience</option>
                  {EXP_RANGES.map((x) => <option key={x} value={x}>{x} years</option>)}
                </select>
              </div>
              <div>
                <label>Attended interview?</label>
                <select value={designer.interview_attended} onChange={(e) => setD("interview_attended", e.target.value)}>
                  <option value="">—</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label>Currently working location</label>
                <input list="sc-hyd-areas" value={designer.current_location} onChange={(e) => setD("current_location", e.target.value)} placeholder="Area / city" />
                <datalist id="sc-hyd-areas">
                  {HYDERABAD_AREAS.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div>
                <label>Company name</label>
                <input value={designer.company_name} onChange={(e) => setD("company_name", e.target.value)} placeholder="Current company" />
              </div>
              <div>
                <label>Designation</label>
                <input value={designer.designation} onChange={(e) => setD("designation", e.target.value)} placeholder="e.g. Junior Designer" />
              </div>
              <div>
                <label>Salary (₹)</label>
                <input value={designer.salary} onChange={(e) => setD("salary", e.target.value)} placeholder="e.g. 25000 per month" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Attach CV (PDF, Word, JPG or PNG - max {CV_MAX_MB} MB)</label>
                {cvName && !cvFile && (
                  <div className="sc-cv-row">
                    <span>📄 {cvName}</span>
                    <button type="button" className="btn small secondary" onClick={viewCv}>View CV</button>
                    <button type="button" className="btn small danger" onClick={deleteCv}>Remove</button>
                  </div>
                )}
                <input type="file" accept={CV_ACCEPT} onChange={(e) => pickCv(e.target.files && e.target.files[0])} />
                {cvFile && <div className="sc-cv-note">📎 {cvFile.name} will be uploaded when you save{cvName ? " (replaces the current CV)" : ""}.</div>}
              </div>
              {[1, 2, 3].map((n) => (
                <React.Fragment key={n}>
                  <div>
                    <label>Follow-up {n} date</label>
                    <input type="date" value={designer[`followup${n}_date`]} onChange={(e) => setD(`followup${n}_date`, e.target.value)} />
                  </div>
                  <div>
                    <label>Follow-up {n} remark</label>
                    <input value={designer[`followup${n}_remark`]} onChange={(e) => setD(`followup${n}_remark`, e.target.value)} placeholder={`What happened in follow-up ${n}?`} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ADDED: 3 follow-ups for EVERY other category (same as in Interior Designer details) */}
        {!isDesigner && (
          <div className="sc-designer sc-followups">
            <div className="sc-designer-title">📞 Follow-ups</div>
            <div className="form-grid">
              {[1, 2, 3].map((n) => (
                <React.Fragment key={n}>
                  <div>
                    <label>Follow-up {n} date</label>
                    <input type="date" value={designer[`followup${n}_date`]} onChange={(e) => setD(`followup${n}_date`, e.target.value)} />
                  </div>
                  <div>
                    <label>Follow-up {n} remark</label>
                    <input value={designer[`followup${n}_remark`]} onChange={(e) => setD(`followup${n}_remark`, e.target.value)} placeholder={`What happened in follow-up ${n}?`} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="actions">
          {/* ADDED: Delete (admin only) - moved here from the card */}
          {onDelete && !isNew && (
            <button type="button" className="btn danger form-del-btn" onClick={() => onDelete({ ...call, ...form, id: editId })}>🗑 Delete</button>
          )}
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add service call" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
