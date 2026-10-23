// ORIGINAL: import React, { useState } from "react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
// ADDED: locked phone box for telecallers (xxxxxxx789), normal box for admin
import PhoneInput from "./PhoneInput.jsx";
// ADDED: hide the number on the "already saved" card (xxxxxxx789)
import { cardPhone } from "../utils/maskPhone.js";

// ADDED: Project add/edit modal - opened by "+ Add project" on the Project
// Details page. Follows the same pattern as WalkinModal.
// To add more options later, extend these lists here AND in
// backend/routes/projects.js (PROJECT_TYPES / PROJECT_STATUSES).
export const PROJECT_TYPES = ["Open Land", "Flats", "Villas", "Highrise"];
export const PROJECT_STATUSES = ["Handovering for Interior", "Construction State", "Pre Launch"];

// ADDED: form values from a saved project (used when a typed phone number is
// already saved on a project - its details are loaded into the form)
const fromProject = (p) => ({
  project_name: p.project_name || "", owner_contact: p.owner_contact || "", secondary_number: p.secondary_number || "",
  location: p.location || "", address: p.address || "", type: p.type || "", sales_executive: p.sales_executive || "",
  sales_exec1_phone: p.sales_exec1_phone || "", sales_exec2_name: p.sales_exec2_name || "", sales_exec2_phone: p.sales_exec2_phone || "",
  phone1: p.phone1 || "", phone2: p.phone2 || "", status: p.status || "", data_in_crm: p.data_in_crm || "", marketing: p.marketing || "",
  rounds_called: p.rounds_called ?? 0, last_calling_date: p.last_calling_date ? String(p.last_calling_date).slice(0, 10) : "",
  units_booked_interiors: p.units_booked_interiors ?? 0, units_sold: p.units_sold ?? 0,
  total_towers: p.total_towers ?? 0, total_flats: p.total_flats ?? 0, crm_data_count: p.crm_data_count ?? 0,
});
const digitsOf = (v) => String(v || "").replace(/\D/g, "");

export default function ProjectModal({ project, onClose, onSaved }) {
  // ORIGINAL: const isNew = !project.id;
  // UPDATED: when a typed number is already saved on a project, the form
  // switches to editing THAT project (existing.id) - saving updates it.
  const [existing, setExisting] = useState(null);
  const [existingCount, setExistingCount] = useState(0);
  const editId = project.id || (existing && existing.id) || null;
  const isNew = !editId;
  const [form, setForm] = useState({
    project_name: project.project_name || "",
    owner_contact: project.owner_contact || "",
    secondary_number: project.secondary_number || "",
    location: project.location || "",
    address: project.address || "",
    type: project.type || "",
    sales_executive: project.sales_executive || "",
    // ADDED: sales executive 1 phone + sales executive 2 name / phone
    sales_exec1_phone: project.sales_exec1_phone || "",
    sales_exec2_name: project.sales_exec2_name || "",
    sales_exec2_phone: project.sales_exec2_phone || "",
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
    // ADDED: how many towers / flats, how much data in CRM
    total_towers: project.total_towers ?? 0,
    total_flats: project.total_flats ?? 0,
    crm_data_count: project.crm_data_count ?? 0,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ADDED: "How much data in CRM" fills in automatically = number of leads in
  // the CRM with this project name (same count as the Projects summary cards).
  // It updates as the Project name is typed; it can still be changed by hand.
  const [crmAuto, setCrmAuto] = useState(null);
  const crmTouched = useRef(false);
  const crmSeq = useRef(0);
  useEffect(() => {
    const name = form.project_name.trim();
    const seq = ++crmSeq.current;
    if (!name) { setCrmAuto(null); return undefined; }
    const t = setTimeout(() => {
      api(`/projects/crm-count?name=${encodeURIComponent(name)}`)
        .then((d) => {
          if (seq !== crmSeq.current) return;
          const n = Number(d.count) || 0;
          setCrmAuto(n);
          if (!crmTouched.current) setForm((f) => ({ ...f, crm_data_count: String(n) }));
        })
        .catch(() => { if (seq === crmSeq.current) setCrmAuto(null); });
    }, 400);
    return () => clearTimeout(t);
  }, [form.project_name]);

  // ADDED: in "Add project", as soon as a full number (10+ digits) is typed in
  // Owner contact / Secondary number / Phone 1 / Phone 2, check if it is
  // already saved on a project. If yes, load that project's details.
  const [checking, setChecking] = useState(false);
  const lookupSeq = useRef(0);
  // ADDED: shown when the number check cannot reach the server (e.g. backend not updated yet)
  const [lookupWarn, setLookupWarn] = useState("");
  const checkedNumbers = useRef(new Set());
  const typedNumbers = [form.owner_contact, form.secondary_number, form.phone1, form.phone2]
    .map(digitsOf).filter((d) => d.length >= 10).join(",");
  useEffect(() => {
    if (project.id || existing || !typedNumbers) return undefined;
    const toCheck = typedNumbers.split(",").filter((d) => !checkedNumbers.current.has(d.slice(-10)));
    if (!toCheck.length) return undefined;
    const seq = ++lookupSeq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        for (const num of toCheck) {
          checkedNumbers.current.add(num.slice(-10));
          const d = await api(`/projects/lookup?phone=${encodeURIComponent(num)}`);
          if (seq !== lookupSeq.current) return;
          if (d.found && d.project) {
            setExisting(d.project);
            setExistingCount(d.matches || 1);
            setForm(fromProject(d.project));
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
  }, [typedNumbers, project.id, existing]);

  // ADDED: "Not this project? Start again"
  const clearExisting = () => {
    lookupSeq.current++;
    checkedNumbers.current = new Set();
    setExisting(null);
    setExistingCount(0);
    setForm(fromProject({}));
    setError("");
  };

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
        // ORIGINAL: await api(`/projects/${project.id}`, { method: "PUT", body: JSON.stringify(form) });
        await api(`/projects/${editId}`, { method: "PUT", body: JSON.stringify(form) });
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
        {/* ORIGINAL: <h3>{isNew ? "Add project" : `Edit project — ${project.project_name}`}</h3> */}
        <h3>{isNew ? "Add project" : `Edit project — ${project.project_name || (existing && existing.project_name) || ""}`}</h3>
        {/* ADDED: number already saved on a project -> its details are loaded below */}
        {existing && !project.id && (
          <>
            <div className="sc-dup">
              <div>
                <b>This phone number is already saved{existingCount > 1 ? ` on ${existingCount} projects` : ""}.</b> The project details are loaded below.
                Saving will <b>update this project</b> - no duplicate will be created.
              </div>
              <button type="button" className="btn small secondary" onClick={clearExisting}>Not this project? Start again</button>
            </div>
            <div className="lead-card sc-found-card">
              <div className="lc-head">
                <div>
                  <div className="lc-name">🏗️ {existing.project_name || "-"}</div>
                  <div className="lc-sub">{existing.location || "Location not added"}</div>
                </div>
                {existing.type && <span className="chip none">{existing.type}</span>}
              </div>
              <div className="lc-grid">
                <span>Owner contact</span><b>{cardPhone(existing.owner_contact) || "-"}</b>
                <span>Phone 1</span><b>{cardPhone(existing.phone1) || "-"}</b>
                <span>Sales exec 1</span><b>{existing.sales_executive || "-"}</b>
                <span>Sales exec 2</span><b>{existing.sales_exec2_name || "-"}</b>
                <span>Status</span><b>{existing.status || "-"}</b>
                <span>Towers / Flats</span><b>{existing.total_towers ?? 0} / {existing.total_flats ?? 0}</b>
                <span>Added by</span><b>{existing.created_by_name || "-"}</b>
              </div>
              {existing.address && <div className="lc-remarks"><div><span>Address:</span> {existing.address}</div></div>}
            </div>
          </>
        )}
        {checking && !existing && <div className="sc-checking">Checking number…</div>}
        {lookupWarn && !existing && <div className="sc-checking" style={{ color: "var(--red-ink)" }}>⚠ {lookupWarn}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="form-grid">
          {/* UPDATED: Project name (left) + Type (right) on the same row
              ORIGINAL: <div style={{ gridColumn: "1 / -1" }}> Project name (full width) </div> */}
          <div>
            <label>Project name</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="Project / building name" />
          </div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Select type</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Contact number (owner)</label>
            {/* ORIGINAL: <input value={form.owner_contact} ... /> */}
            <PhoneInput value={form.owner_contact} original={project.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} placeholder="Owner's number" />
          </div>
          <div>
            <label>Secondary number</label>
            {/* ORIGINAL: <input value={form.secondary_number} ... /> */}
            <PhoneInput value={form.secondary_number} original={project.secondary_number} onChange={(e) => set("secondary_number", e.target.value)} placeholder="Secondary number" />
          </div>
          {/* UPDATED: Location now uses the full row (Type moved up next to Project name)
              ORIGINAL: <div> ... Location ... </div> (half width) */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Location</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area / locality" />
          </div>
          {/* MOVED: "Type" is now next to the Project name (same dropdown, unchanged) */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
          </div>
          <div>
            {/* ORIGINAL label: Sales executive name (same field, now "Sales executive 1 name") */}
            <label>Sales executive 1 name</label>
            <input value={form.sales_executive} onChange={(e) => set("sales_executive", e.target.value)} placeholder="Sales executive" />
          </div>
          {/* ADDED: sales executive 1 phone + sales executive 2 name / phone */}
          <div>
            <label>Sales executive 1 phone</label>
            <PhoneInput value={form.sales_exec1_phone} original={project.sales_exec1_phone} onChange={(e) => set("sales_exec1_phone", e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label>Sales executive 2 name</label>
            <input value={form.sales_exec2_name} onChange={(e) => set("sales_exec2_name", e.target.value)} placeholder="Sales executive" />
          </div>
          <div>
            <label>Sales executive 2 phone</label>
            <PhoneInput value={form.sales_exec2_phone} original={project.sales_exec2_phone} onChange={(e) => set("sales_exec2_phone", e.target.value)} placeholder="Phone number" />
          </div>
          {/* UPDATED: Status now uses the full row (ORIGINAL: half width, next to Sales executive name) */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">Select status</option>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Phone number 1</label>
            {/* ORIGINAL: <input value={form.phone1} ... /> */}
            <PhoneInput value={form.phone1} original={project.phone1} onChange={(e) => set("phone1", e.target.value)} placeholder="Phone number 1" />
          </div>
          <div>
            <label>Phone number 2</label>
            {/* ORIGINAL: <input value={form.phone2} ... /> */}
            <PhoneInput value={form.phone2} original={project.phone2} onChange={(e) => set("phone2", e.target.value)} placeholder="Phone number 2" />
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
          {/* REMOVED from the form on request (the saved value is kept and re-saved unchanged):
          <div>
            <label>Units sold</label>
            <input type="number" min="0" value={form.units_sold} onChange={(e) => set("units_sold", e.target.value)} />
          </div>
          */}
          {/* ADDED: how many towers, how many flats, how much data in CRM
              (plain number boxes - digits only, no up/down arrows) */}
          <div>
            {/* ORIGINAL label: How many towers */}
            <label>No. of towers</label>
            <input type="text" inputMode="numeric" value={form.total_towers} onChange={(e) => set("total_towers", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 4" />
          </div>
          <div>
            {/* ORIGINAL label: How many flats */}
            <label>No. of flats</label>
            <input type="text" inputMode="numeric" value={form.total_flats} onChange={(e) => set("total_flats", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 600" />
          </div>
          <div>
            <label>How much data in CRM</label>
            {/* ORIGINAL: <input ... onChange={(e) => set("crm_data_count", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 350" /> */}
            <input type="text" inputMode="numeric" value={form.crm_data_count} onChange={(e) => { crmTouched.current = true; set("crm_data_count", e.target.value.replace(/\D/g, "")); }} placeholder="e.g. 350" />
            {/* ADDED: where the number came from */}
            {crmAuto !== null && (
              String(crmAuto) === String(form.crm_data_count)
                ? <div className="wa-count-hint">Auto: <b>{crmAuto}</b> leads in CRM for this project</div>
                : <div className="wa-count-hint changed">In CRM now: <b>{crmAuto}</b> <button type="button" onClick={() => { crmTouched.current = false; set("crm_data_count", String(crmAuto)); }}>use {crmAuto}</button></div>
            )}
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
