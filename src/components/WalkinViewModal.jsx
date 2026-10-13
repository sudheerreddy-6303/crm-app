import React from "react";

// ADDED: read-only "View" pop-up for a walk-in (admin only) - opened by the
// "View" button next to the name on the walk-in cards. Shows every saved
// detail. Nothing can be changed here (use Edit / Follow up for that).
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "-");
const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const val = (v) => (v === null || v === undefined || String(v).trim() === "" ? "-" : v);

export default function WalkinViewModal({ walkin: w, onClose }) {
  const sections = [
    ["Customer", [
      ["Name", val(w.name)], ["Phone number", val(w.phone)], ["Alt. mobile", val(w.alt_phone)],
      ["Project / villa", val(w.project_name)], ["Budget", val(w.budget)],
    ]],
    ["Visit", [
      ["Visit date", fmtDate(w.visit_date)], ["Purpose", val(w.purpose)], ["Experience centre", val(w.location)],
      ["Attended by", val(w.attended_by)], ["Remarks", val(w.remarks)],
    ]],
    ["Address", [
      ["Location", val(w.site_location)], ["City", val(w.city)], ["Address", val(w.address)],
    ]],
    ["Record", [
      ["Converted to lead", w.converted_lead_id ? "Yes" : "No"], ["Added by", val(w.created_by_name)],
      ["Created", fmtDateTime(w.created_at)], ["Last updated", fmtDateTime(w.updated_at)],
    ]],
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>Walk-in details — {w.name}</h3>
        {sections.map(([title, rows]) => (
          <div className="lv-section" key={title}>
            <div className="lv-title">{title}</div>
            <div className="lv-grid">
              {rows.map(([k, v]) => (<React.Fragment key={k}><span>{k}</span><b>{v}</b></React.Fragment>))}
            </div>
          </div>
        ))}
        <div className="actions"><button className="btn secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
