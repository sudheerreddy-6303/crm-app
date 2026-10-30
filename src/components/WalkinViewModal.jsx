import React from "react";
// ADDED: Hot / Warm / Cold / Dead label
import PriorityBadge from "./PriorityBadge.jsx";
// ADDED: phone numbers hidden for telecallers (xxxxxxx789), full for admin
// UPDATED: phone numbers hidden for everyone here (cardPhone). PREVIOUS: import { phoneText } ...
import { cardPhone } from "../utils/maskPhone.js";

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

// ORIGINAL: export default function WalkinViewModal({ walkin: w, onClose }) {
// ADDED: Delete inside the form (admin only) - the page passes onDelete; it asks to confirm
export default function WalkinViewModal({ walkin: w, onClose, onDelete }) {
  const sections = [
    ["Customer", [
      ["Name", val(w.name)], ["Phone number", val(cardPhone(w.phone))], ["Alt. mobile", val(cardPhone(w.alt_phone))], /* PREVIOUS: phoneText */ // ORIGINAL: val(w.phone), val(w.alt_phone)
      ["Project / villa", val(w.project_name)], ["Budget", val(w.budget)],
    ]],
    ["Visit", [
      ["Visit date", fmtDate(w.visit_date)], ["Purpose", val(w.purpose)], ["Experience centre", val(w.location)],
      ["Attended by", val(w.attended_by)], ["Remarks", val(w.remarks)],
    ]],
    ["Address", [
      // ORIGINAL: ["Location", val(w.site_location)], ["City", val(w.city)], ["Address", val(w.address)],
      // UPDATED: + State (order State -> City -> Location like the form)
      ["State", val(w.state)], ["City", val(w.city)], ["Location", val(w.site_location)], ["Address", val(w.address)],
    ]],
    // ADDED: same fields as the Add lead form
    ["Lead details", [
      ["Project type", val(w.project_type)], ["Assigned telecaller", val(w.assigned_to_name)],
      ["1st calling date", fmtDate(w.first_calling_date)], ["2nd calling date", fmtDate(w.second_calling_date)], ["3rd calling date", fmtDate(w.third_calling_date)],
      ["Call category", val(w.call_category)], ["Quote sent", val(w.quote_sent)], ["Order booked", val(w.order_booked)],
      ["Revenue booked (₹)", w.revenue_booked !== null && w.revenue_booked !== undefined && w.revenue_booked !== "" ? Number(w.revenue_booked).toLocaleString("en-IN") : "-"],
      ["WhatsApp message sent on", fmtDate(w.whatsapp_sent_date)], ["WhatsApp category", val(w.whatsapp_category)],
      ["Next call date", fmtDate(w.next_call_date)],
      ["Priority", w.priority && w.priority !== "none" ? <PriorityBadge priority={w.priority} /> : "-"],
      ["Source", val(w.source)], ["Calling remark", val(w.calling_remark)],
      ["Call 1 remark", val(w.call_remark_1)], ["Call 2 remark", val(w.call_remark_2)], ["Call 3 remark", val(w.call_remark_3)],
      ["WhatsApp 1 sent date", fmtDate(w.whatsapp_date_1)], ["WhatsApp 2 sent date", fmtDate(w.whatsapp_date_2)], ["WhatsApp 3 sent date", fmtDate(w.whatsapp_date_3)],
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
        {/* ORIGINAL: <div className="actions"><button className="btn secondary" onClick={onClose}>Close</button></div> */}
        <div className="actions">
          {/* ADDED: Delete (admin only) - moved here from the walk-in card */}
          {onDelete && <button type="button" className="btn danger form-del-btn" onClick={() => onDelete(w)}>🗑 Delete</button>}
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
