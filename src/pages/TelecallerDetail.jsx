import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const fmt = (d) => (d ? String(d).slice(0, 10) : "-");

export default function TelecallerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // ADDED: calendar filter (from / to dates)
  const [range, setRange] = useState({ from: "", to: "" });
  // ADDED: project filter - when a project is picked, the cards, calls-per-day
  // table and leads list below reflect only this telecaller's work on it.
  const [project, setProject] = useState("");
  const [projects, setProjects] = useState([]); // dropdown options
  // hook called at the top, before any early return (Rules of Hooks)
  const navigate = useNavigate();

  // ADDED: load the project names for this telecaller (only projects that appear
  // on their assigned leads) to populate the filter dropdown.
  useEffect(() => {
    api(`/dashboard/projects?assigned=${id}`)
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    // ADDED: pass the selected project so the activity data is project-scoped
    if (project) q.set("project", project);
    api(`/users/${id}/activity${q.toString() ? `?${q}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id, range, project]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <div className="empty">Loading telecaller activity...</div>;

  const { user, daily, calls_today, totals, leads } = data;

  /* ORIGINAL CODE (static kpi-grid cards, not clickable):
  <div className="kpi-grid">
    <div className="kpi k-blue"><div className="label">Calls today</div><div className="value">{calls_today || 0}</div></div>
    ... (same data, moved into the CARDS array below)
  </div>
  REPLACED WITH: Bootstrap grid, 4 cards per row on desktop, clickable -
  each opens the Leads page filtered to this telecaller + that content. */
  const rangeActive = Boolean(range.from || range.to);
  // When a calendar range is selected, the first card shows total calls in that
  // period (sum of the daily table) instead of just today's calls
  const callsInRange = daily.reduce((sum, d) => sum + Number(d.calls || 0), 0);
  const CARDS = [
    rangeActive
      ? { label: "Calls in period", value: callsInRange, cls: "k-blue", link: null }
      : { label: "Calls today", value: calls_today, cls: "k-blue", link: null }, // scrolls to the daily table below
    { label: "Assigned leads", value: totals.total_leads, cls: "", link: `/leads?assigned=${user.id}` },
    { label: "Interested", value: totals.interested, cls: "k-green", link: `/leads?assigned=${user.id}&category=INTERESTED` },
    { label: "Follow up", value: totals.follow_up, cls: "k-blue", link: `/leads?assigned=${user.id}&category=FOLLOW UP` },
    { label: "Not interested", value: totals.not_interested, cls: "k-red", link: `/leads?assigned=${user.id}&category=NOT INTERESTED` },
    { label: "Not answered", value: totals.not_answered, cls: "k-amber", link: `/leads?assigned=${user.id}&category=NOT ANSWERED` },
    { label: "Quotes sent", value: totals.quotes_sent, cls: "k-blue", link: `/leads?assigned=${user.id}&quote=Yes` },
    { label: "Orders booked", value: totals.orders_booked, cls: "k-green", link: `/leads?assigned=${user.id}&order=Yes` },
  ];

  // ADDED: keep the project filter when drilling into the Leads page from a card
  const withProject = (link) => {
    if (!project || !link) return link;
    return link + (link.includes("?") ? "&" : "?") + `project=${encodeURIComponent(project)}`;
  };

  const cardClick = (c) => {
    if (c.link) navigate(withProject(c.link));
    else document.getElementById("calls-per-day")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <p className="page-sub"><Link to="/dashboard">← Back to dashboard</Link></p>
      <h1 className="page-title">{user.name}</h1>
      <p className="page-sub">
        {user.email} {user.phone ? `· ${user.phone}` : ""} ·{" "}
        <span className={`chip ${user.status === "active" ? "yes" : "no"}`}>{user.status}</span>
      </p>

      {/* ADDED: calendar filter - pick a date range to check the data for that period */}
      <div className="filters">
        {/* ADDED: project filter - rescopes this telecaller's cards and tables */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>Project</label>
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", minWidth: 160 }}
        >
          <option value="">Projects</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>From</label>
        <input type="date" value={range.from} max={range.to || undefined}
               onChange={(e) => setRange({ ...range, from: e.target.value })}
               style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>To</label>
        <input type="date" value={range.to} min={range.from || undefined}
               onChange={(e) => setRange({ ...range, to: e.target.value })}
               style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />
        <button className="btn small secondary"
                onClick={() => { const t = new Date().toISOString().slice(0, 10); setRange({ from: t, to: t }); }}>
          Today
        </button>
        <button className="btn small secondary" onClick={() => setRange({ from: "", to: "" })}>
          Clear
        </button>
        {(range.from || range.to) && (
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Showing data {range.from ? `from ${range.from}` : ""} {range.to ? `to ${range.to}` : ""}
          </span>
        )}
      </div>

      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3" style={{ marginBottom: 22 }}>
        {CARDS.map((c) => (
          <div className="col" key={c.label}>
            <div
              className={`kpi kpi-lg clickable ${c.cls}`}
              onClick={() => cardClick(c)}
              title={c.link ? `View ${user.name}'s ${c.label.toLowerCase()}` : "View calls per day"}
            >
              <div className="label">{c.label}</div>
              <div className="value">{c.value || 0}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" id="calls-per-day">
        <h3>Calls per day {range.from || range.to ? "(selected dates)" : "(last 30 days)"}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Total calls</th><th>Interested</th>
                <th>Follow up</th><th>Not interested</th><th>Not answered</th>
              </tr>
            </thead>
            <tbody>
              {daily.length === 0 && (
                <tr><td colSpan="6" className="empty">
                  No calls logged yet. A call is counted every time {user.name} updates a
                  lead's call category or remark.
                </td></tr>
              )}
              {daily.map((d) => (
                <tr key={d.day}>
                  <td><strong>{fmt(d.day)}</strong></td>
                  <td><strong>{d.calls}</strong></td>
                  <td>{d.interested || 0}</td>
                  <td>{d.follow_up || 0}</td>
                  <td>{d.not_interested || 0}</td>
                  <td>{d.not_answered || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 16px 0" }}><h3>All leads assigned to {user.name} ({leads.length})</h3></div>
        {/* ORIGINAL: <div className="table-wrap"> - sticky-scroll keeps the
            horizontal scrollbar always visible for this wide table too */}
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>1st call</th><th>Category</th>
                <th>Quote</th><th>Order</th><th>2nd call</th><th>WA date</th>
                <th>WA category</th><th>Remark</th>
                {/* ADDED: 3 call remarks + 3 WhatsApp sent Yes/No */}
                <th>Call 1 remark</th><th>Call 2 remark</th><th>Call 3 remark</th>
                <th>WhatsApp 1</th><th>WhatsApp 2</th><th>WhatsApp 3</th>
                <th>Next call</th><th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan="18" className="empty">No leads assigned yet. Assign from the Leads page.</td></tr>
              )}
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><span className={`dot ${l.priority || "none"}`}></span><strong>{l.name}</strong></td>
                  <td><a className="wa-link" href={`https://wa.me/91${l.primary_phone}`} target="_blank" rel="noreferrer">{l.primary_phone}</a></td>
                  <td>{fmt(l.first_calling_date)}</td>
                  <td>{l.call_category
                    ? <span className={`chip ${l.call_category.replaceAll(" ", "_")}`}>{l.call_category}</span>
                    : <span className="chip none">Fresh</span>}</td>
                  <td>{l.quote_sent ? <span className={`chip ${l.quote_sent.toLowerCase()}`}>{l.quote_sent}</span> : "-"}</td>
                  <td>{l.order_booked ? <span className={`chip ${l.order_booked.toLowerCase()}`}>{l.order_booked}</span> : "-"}</td>
                  <td>{fmt(l.second_calling_date)}</td>
                  <td>{fmt(l.whatsapp_sent_date)}</td>
                  <td>{l.whatsapp_category || "-"}</td>
                  <td className="remark">{l.calling_remark || "-"}</td>
                  {/* ADDED: 3 call remarks + 3 WhatsApp sent Yes/No */}
                  <td className="remark">{l.call_remark_1 || "-"}</td>
                  <td className="remark">{l.call_remark_2 || "-"}</td>
                  <td className="remark">{l.call_remark_3 || "-"}</td>
                  {[1, 2, 3].map((n) => (
                    <td key={`wa${n}`}>{l[`whatsapp_sent_${n}`]
                      ? <span className={`chip ${l[`whatsapp_sent_${n}`].toLowerCase()}`}>{l[`whatsapp_sent_${n}`]}</span>
                      : "-"}</td>
                  ))}
                  <td>{fmt(l.next_call_date)}</td>
                  <td>{fmt(l.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
