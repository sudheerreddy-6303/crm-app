import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getUser } from "../api.js";

export default function Dashboard() {
  const user = getUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // ADDED: calendar filter (from / to dates) - all dashboard data follows it
  const [range, setRange] = useState({ from: "", to: "" });
  // MOVED UP (hooks fix): useNavigate must be called before any early return,
  // otherwise React throws "change in the order of Hooks" - it was previously
  // below the `if (error) return ...` lines
  const navigate = useNavigate();

  useEffect(() => {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    api(`/dashboard${q.toString() ? `?${q}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [range]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <div className="empty">Loading dashboard...</div>;

  const t = data.totals;
  // ORIGINAL (bug): const navigate = useNavigate(); was here - AFTER the early
  // returns above, which violates the Rules of Hooks. Moved to the top of the
  // component with the other hooks.

  /* ORIGINAL CODE (static cards, auto-fill grid, not clickable):
  <div className="kpi-grid">
    <div className="kpi"><div className="label">Total leads</div><div className="value">{t.total_leads || 0}</div></div>
    <div className="kpi k-green"><div className="label">Interested</div><div className="value">{t.interested || 0}</div></div>
    ... (all cards, unchanged data, moved into the CARDS array below)
  </div>
  REPLACED WITH: Bootstrap grid (5 per row on desktop, 3 on tablet, 2 on mobile),
  bigger cards, each clickable - opens the Leads page filtered to that content. */
  const CARDS = [
    { label: "Total leads", value: t.total_leads, cls: "", link: "/leads" },
    { label: "Interested", value: t.interested, cls: "k-green", link: "/leads?category=INTERESTED" },
    { label: "Follow up", value: t.follow_up, cls: "k-blue", link: "/leads?category=FOLLOW UP" },
    { label: "Not interested", value: t.not_interested, cls: "k-red", link: "/leads?category=NOT INTERESTED" },
    { label: "Not answered", value: t.not_answered, cls: "k-amber", link: "/leads?category=NOT ANSWERED" },
    { label: "Fresh (not called)", value: t.fresh, cls: "", link: "/leads?category=FRESH" },
    { label: "Quotes sent", value: t.quotes_sent, cls: "k-blue", link: "/leads?quote=Yes" },
    { label: "Orders booked", value: t.orders_booked, cls: "k-green", link: "/leads?order=Yes" },
    { label: "Calls due today", value: t.due_today, cls: "k-amber", link: "/leads?due=today" },
    ...(user.role === "admin"
      ? [{ label: "Unassigned leads", value: data.unassigned, cls: "k-red", link: "/leads?assigned=unassigned" }]
      : []),
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        {user.role === "admin"
          ? "Overview of all leads and telecaller performance"
          : `Your assigned leads at a glance, ${user.name}`}
      </p>

      {/* ADDED: calendar filter - all cards, performance and follow-ups follow it */}
      <div className="filters">
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

      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3" style={{ marginBottom: 22 }}>
        {CARDS.map((c) => (
          <div className="col" key={c.label}>
            <div
              className={`kpi kpi-lg clickable ${c.cls}`}
              onClick={() => navigate(c.link)}
              title={`View ${c.label.toLowerCase()}`}
            >
              <div className="label">{c.label}</div>
              <div className="value">{c.value || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {user.role === "admin" && (
        <div className="card">
          <h3>Telecaller performance</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Telecaller</th><th>Status</th><th>Leads</th><th>Interested</th>
                  <th>Follow up</th><th>Not interested</th><th>Not answered</th>
                  <th>Quotes</th><th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {data.performance.length === 0 && (
                  <tr><td colSpan="9" className="empty">No telecallers yet. Add them from the Telecallers page.</td></tr>
                )}
                {data.performance.map((p) => (
                  <tr key={p.id}>
                    {/* ORIGINAL: <td><strong>{p.name}</strong></td> */}
                    {/* Name is now a link to the telecaller's daily-calls detail page */}
                    <td><Link to={`/telecallers/${p.id}`} style={{ color: "var(--brand)", fontWeight: 700 }}>{p.name}</Link></td>
                    <td><span className={`chip ${p.status === "active" ? "yes" : "no"}`}>{p.status}</span></td>
                    <td>{p.total_leads}</td>
                    <td>{p.interested || 0}</td>
                    <td>{p.follow_up || 0}</td>
                    <td>{p.not_interested || 0}</td>
                    <td>{p.not_answered || 0}</td>
                    <td>{p.quotes_sent || 0}</td>
                    <td><strong>{p.orders_booked || 0}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Upcoming follow-ups {range.from || range.to ? "(selected dates)" : "(next 3 days)"}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Lead</th><th>Phone</th><th>Next call</th><th>Category</th>{user.role === "admin" && <th>Telecaller</th>}</tr>
            </thead>
            <tbody>
              {data.followups.length === 0 && (
                <tr><td colSpan="5" className="empty">
                  {range.from || range.to ? "No follow-ups in the selected dates." : "No follow-ups due in the next 3 days."}
                </td></tr>
              )}
              {data.followups.map((f) => (
                <tr key={f.id}>
                  <td><strong>{f.name}</strong></td>
                  <td><a className="wa-link" href={`https://wa.me/91${f.primary_phone}`} target="_blank" rel="noreferrer">{f.primary_phone}</a></td>
                  <td>{f.next_call_date ? String(f.next_call_date).slice(0, 10) : "-"}</td>
                  <td>{f.call_category ? <span className={`chip ${f.call_category.replaceAll(" ", "_")}`}>{f.call_category}</span> : <span className="chip none">Fresh</span>}</td>
                  {user.role === "admin" && <td>{f.caller_name || "Unassigned"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
