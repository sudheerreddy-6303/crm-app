// UPDATED: useCallback added (for the call-history loader)
import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
// ADDED: call history with admin replies (same component as the lead form)
import CallHistory from "./CallHistory.jsx";

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
  // UPDATED: kept in a function so the list refreshes after a reply
  const loadLogs = useCallback(() => {
    api(`/leads/${lead.id}/logs`).then((rows) => setLogs(Array.isArray(rows) ? rows : [])).catch(() => setLogs([]));
  }, [lead.id]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

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
      // ADDED: Revenue booked (amount)
      ["Revenue booked", lead.revenue_booked === null || lead.revenue_booked === undefined || lead.revenue_booked === ""
        ? "-" : `₹ ${Number(lead.revenue_booked).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
      ["Next call", fmtDate(lead.next_call_date)],
    ]],
    ["Calls", [
      ["1st call date", fmtDate(lead.first_calling_date)],
      ["2nd call date", fmtDate(lead.second_calling_date)],
      // ADDED
      ["3rd call date", fmtDate(lead.third_calling_date)],
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
          {/* ORIGINAL: read-only list of logs (category, date, telecaller, remark).
              UPDATED: CallHistory - same details plus admin replies + Reply
              button (this pop-up is admin-only). */}
          <CallHistory leadId={lead.id} logs={logs} isAdmin={true} onChanged={loadLogs} />
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
