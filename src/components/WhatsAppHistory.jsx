import React, { useEffect, useState } from "react";
import { api, getUser } from "../api.js";
// admin-only "Export to Excel" (same shared helper as the other pages)
import ExportButton from "./ExportButton.jsx";
import { downloadExcel } from "../utils/exportExcel.js";

// ADDED: history of saved WhatsApp requests, shown under the form on the
// Meta WhatsApp / Bulk WhatsApp pages (cards, latest first).
//  - Telecaller: only their own requests.
//  - Admin: everyone's, with a Telecaller filter and Export to Excel.
const fmtDate = (ymd) => (ymd ? String(ymd).slice(0, 10).split("-").reverse().join("-") : "");
// ORIGINAL (showed the wrong time - 5:30 hrs behind - when MySQL returns UTC):
// const fmtDateTime = (v) => {
//   if (!v) return "";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return String(v);
//   return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
// };
// FIXED: uses created_ts (exact epoch seconds from the backend) and always
// shows India time (IST). Falls back to created_at for safety.
const fmtDateTime = (v, ts) => {
  const d = ts != null && ts !== "" && !Number.isNaN(Number(ts)) ? new Date(Number(ts) * 1000) : v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return v ? String(v) : "";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function WhatsAppHistory({ channel, channelKey, reloadKey }) {
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telecallers, setTelecallers] = useState([]);
  const [tcFilter, setTcFilter] = useState("");
  // ADDED: more filters (worked on the loaded history)
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api("/users").then((r) => setTelecallers((r || []).filter((u) => u.role === "telecaller"))).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ channel: channelKey });
    if (isAdmin && tcFilter) q.set("telecaller", tcFilter);
    api(`/whatsapp?${q}`)
      .then((d) => { setRows(d.requests || []); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [channelKey, isAdmin, tcFilter, reloadKey]);

  const today = todayStr();
  // ADDED: filters applied to the history
  const projectOptions = [...new Set(rows.flatMap((r) => r.projects || []))].sort((a, b) => a.localeCompare(b));
  const shown = rows.filter((r) => {
    if (projectFilter && !(r.projects || []).includes(projectFilter)) return false;
    if (statusFilter === "scheduled" && !(r.send_date >= today)) return false;
    if (statusFilter === "passed" && !(r.send_date < today)) return false;
    if (dateFrom && r.send_date < dateFrom) return false;
    if (dateTo && r.send_date > dateTo) return false;
    return true;
  });
  const anyFilter = Boolean(tcFilter || projectFilter || statusFilter || dateFrom || dateTo);
  const clearFilters = () => { setTcFilter(""); setProjectFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); };
  const exportRows = () => downloadExcel([{
    name: `${channel} history`,
    // UPDATED: exports what the filters show; "Saved on" in India time
    // ORIGINAL: rows: rows.map((r) => ({ "Saved on": fmtDateTime(r.created_at),
    rows: shown.map((r) => ({
      "Saved on": fmtDateTime(r.created_at, r.created_ts),
      "Telecaller": r.telecaller_name,
      "Projects": (r.projects || []).join(", "),
      "No. of projects": Number(r.project_count || 0),
      "Count": Number(r.count || 0),
      "Sending date": fmtDate(r.send_date),
      "Saved by": r.created_by_name,
    })),
    numberCols: ["No. of projects", "Count"],
  }], `${channel.replace(/\s+/g, "_")}_history`);

  return (
    <div className="wa-history">
      <div className="wa-history-head">
        <h2 className="wa-history-title">🕘 History {/* ORIGINAL: {rows.length} */}<span className="wa-history-count">{anyFilter ? `${shown.length} / ${rows.length}` : rows.length}</span></h2>
        <div className="wa-history-tools">
          {/* MOVED: the "All telecallers" filter is now in the filters bar below */}
          {isAdmin && <ExportButton onExport={exportRows} />}
        </div>
      </div>

      {/* ADDED: filters bar */}
      <div className="wa-filters">
        {isAdmin && (
          <div>
            <label>Telecaller</label>
            <select value={tcFilter} onChange={(e) => setTcFilter(e.target.value)} aria-label="Filter by telecaller">
              <option value="">All telecallers</option>
              {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label>Project</label>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project">
            <option value="">All projects</option>
            {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="passed">Date passed</option>
          </select>
        </div>
        <div>
          <label>Sending date from</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label>Sending date to</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {anyFilter && (
          <div className="wa-filters-clear">
            <button type="button" className="btn secondary small" onClick={clearFilters}>✕ Clear filters</button>
          </div>
        )}
      </div>

      {error ? (
        <div className="error-msg">{error}</div>
      ) : loading ? (
        <div className="empty">Loading history...</div>
      ) : rows.length === 0 ? (
        <div className="empty">No {channel} requests saved yet.</div>
      ) : shown.length === 0 ? (
        <div className="empty">No requests match these filters.</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {/* ORIGINAL: {rows.map((r) => { */}
          {shown.map((r) => {
            const upcoming = r.send_date >= today;
            return (
              <div className="col" key={r.id}>
                <div className="card wa-hcard">
                  <div className="wa-hcard-top">
                    <div className="wa-hcard-name">👤 {r.telecaller_name || "—"}</div>
                    <span className={`wa-status ${upcoming ? "up" : "past"}`}>{upcoming ? "Scheduled" : "Date passed"}</span>
                  </div>
                  <div className="wa-hcard-grid">
                    <div><span>Sending date</span><b>📅 {fmtDate(r.send_date)}</b></div>
                    <div><span>Count</span><b>{r.count}</b></div>
                  </div>
                  <div className="wa-hcard-label">Projects ({r.project_count || (r.projects || []).length})</div>
                  <div className="wa-chips wa-chips-sm">
                    {(r.projects || []).map((p) => <span key={p} className="wa-chip">{p}</span>)}
                  </div>
                  <div className="wa-hcard-foot">Saved {fmtDateTime(r.created_at, r.created_ts)}{r.created_by_name ? ` by ${r.created_by_name}` : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
