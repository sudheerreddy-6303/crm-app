import React, { useEffect, useState } from "react";
import { api } from "../api.js";

// ADDED: read-only "View" pop-up for a lead (admin only). Opened by the
// "View" button next to the name on the lead cards. Shows every saved detail
// of the lead plus its call history. Nothing can be changed here - it only
// READS data; editing is still done with the "Follow up" button as before.
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "-");
const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const val = (v) => (v === null || v === undefined || String(v).trim() === "" ? "-" : v);

export default function LeadViewModal({ lead, onClose }) {
  const [logs, setLogs] = useState([]);

  // call history (read-only, existing GET /api/leads/:id/logs endpoint)
  useEffect(() => {
    api(`/leads/${lead.id}/logs`).then((rows) => setLogs(Array.isArray(rows) ? rows : [])).catch(() => setLogs([]));
  }, [lead.id]);

  const sections = [
    ["Lead", [
      ["Name", val(lead.name)],
      ["Primary phone", val(lead.primary_phone)],
      ["Project", val(lead.project_name)],
      ["Project type", val(lead.project_type)],
      ["Priority", lead.priority && lead.priority !== "none" ? lead.priority : "-"],
      ["Source", val(lead.source)],
      ["Caller", val(lead.caller_name) === "-" ? "Unassigned" : lead.caller_name],
      ["Walk-in", val(lead.walkin)],
    ]],
    ["Status", [
      ["Call category", val(lead.call_category) === "-" ? "Fresh (not called)" : lead.call_category],
      ["Quote sent", val(lead.quote_sent)],
      ["Order booked", val(lead.order_booked)],
      ["Next call", fmtDate(lead.next_call_date)],
    ]],
    ["Calls", [
      ["1st call date", fmtDate(lead.first_calling_date)],
      ["2nd call date", fmtDate(lead.second_calling_date)],
      ["Call 1 remark", val(lead.call_remark_1)],
      ["Call 2 remark", val(lead.call_remark_2)],
      ["Call 3 remark", val(lead.call_remark_3)],
      ["Calling remark", val(lead.calling_remark)],
    ]],
    ["WhatsApp", [
      ["WhatsApp sent date", fmtDate(lead.whatsapp_sent_date)],
      ["WA category", val(lead.whatsapp_category)],
      ["WhatsApp 1 date", fmtDate(lead.whatsapp_date_1)],
      ["WhatsApp 2 date", fmtDate(lead.whatsapp_date_2)],
      ["WhatsApp 3 date", fmtDate(lead.whatsapp_date_3)],
    ]],
    ["Record", [
      ["Created", fmtDateTime(lead.created_at)],
      ["Last updated", fmtDateTime(lead.updated_at)],
    ]],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        <h3>Lead details — {lead.name}</h3>

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

        <div className="lv-section">
          <div className="lv-title">Call history ({logs.length})</div>
          {logs.length === 0 ? (
            <div className="lv-empty">No call history yet.</div>
          ) : (
            <div className="lv-logs">
              {logs.map((g) => (
                <div className="lv-log" key={g.id}>
                  <div className="lv-log-head">
                    <b>{g.category || "-"}</b>
                    <span>{fmtDateTime(g.log_date)}{g.user_name ? ` · ${g.user_name}` : ""}</span>
                  </div>
                  {g.remark && <div className="lv-log-remark">{g.remark}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
