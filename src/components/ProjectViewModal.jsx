import React from "react";

// ADDED: read-only "View" pop-up for a project. Opened by the "View" button
// next to the project name on the Project Details cards. Shows every saved
// detail of the project. Nothing can be changed here - editing is still done
// with the "Edit" button as before. Uses the same look as LeadViewModal.
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "-");
const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const val = (v) => (v === null || v === undefined || String(v).trim() === "" ? "-" : v);

function waNumber(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}
// phone shown as a WhatsApp link, same as the cards/table
const phone = (v) =>
  v ? <a className="wa-link" href={`https://wa.me/${waNumber(v)}`} target="_blank" rel="noreferrer">{v}</a> : "-";

export default function ProjectViewModal({ project: p, onClose }) {
  const sections = [
    ["Project", [
      ["Project name", val(p.project_name)],
      ["Type", val(p.type)],
      ["Status", val(p.status)],
      ["Location", val(p.location)],
      ["Address", val(p.address)],
    ]],
    ["Contacts", [
      ["Owner contact", phone(p.owner_contact)],
      ["Secondary no.", phone(p.secondary_number)],
      ["Sales executive", val(p.sales_executive)],
      ["Phone 1", phone(p.phone1)],
      ["Phone 2", phone(p.phone2)],
    ]],
    ["Sales / interiors", [
      ["Data in CRM", val(p.data_in_crm)],
      ["Marketing", val(p.marketing)],
      ["Rounds called", p.rounds_called ?? 0],
      ["Last call", fmtDate(p.last_calling_date)],
      ["Units booked (interiors)", p.units_booked_interiors ?? 0],
      ["Units sold", p.units_sold ?? 0],
    ]],
    ["Record", [
      ["Added by", val(p.created_by_name)],
      ["Created", fmtDateTime(p.created_at)],
      ["Last updated", fmtDateTime(p.updated_at)],
    ]],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>Project details — {p.project_name}</h3>

        {sections.map(([title, rows]) => (
          <div className="lv-section" key={title}>
            <div className="lv-title">{title}</div>
            <div className="lv-grid">
              {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                  <span>{k}</span><b>{v}</b>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
