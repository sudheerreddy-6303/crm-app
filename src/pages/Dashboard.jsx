import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getUser } from "../api.js";
// ADDED: phone numbers hidden for telecallers (xxxxxxx789), full for admin
import { phoneText } from "../utils/maskPhone.js";
// ADDED: admin "Export to Excel" (shared helper + button)
import ExportButton from "../components/ExportButton.jsx";
// ADDED: WhatsApp history cards (same cards as the Meta / Bulk WhatsApp pages)
import WhatsAppHistory from "../components/WhatsAppHistory.jsx";
import { downloadExcel, d10 } from "../utils/exportExcel.js";

// UPDATED: optional asUser prop ({ id, name }). When the admin opens a
// telecaller (Telecallers page -> name), this same dashboard is shown "as"
// that telecaller - exactly the cards and follow-ups they see when they log
// in. Without the prop (normal Dashboard page) nothing changes.
// ORIGINAL: export default function Dashboard() {
// ORIGINAL:   const user = getUser();
export default function Dashboard({ asUser = null } = {}) {
  // ADDED: "Telecaller" filter (top-right, admin's own dashboard only). When a
  // telecaller is picked, the whole dashboard shows that telecaller's data -
  // the same view as the admin's telecaller page / the telecaller's own login.
  const realUser = getUser();
  const realIsAdmin = !asUser && realUser?.role === "admin";
  // ADDED: WhatsApp section on the dashboard - Meta / Bulk tab
  const [waTab, setWaTab] = useState("meta");
  // remembered for this browser tab, so the choice is kept after Back
  const [tcId, setTcIdState] = useState(() => {
    try { return (!asUser && sessionStorage.getItem("dash_tc")) || ""; } catch (e) { return ""; }
  });                                               // "" = All telecallers
  const setTcId = (v) => {
    setTcIdState(v);
    try { if (v) sessionStorage.setItem("dash_tc", v); else sessionStorage.removeItem("dash_tc"); } catch (e) { /* ignore */ }
  };
  const [telecallers, setTelecallers] = useState([]);
  const selectedTc = tcId ? telecallers.find((t) => String(t.id) === String(tcId)) : null;
  // whose dashboard is shown: the asUser prop, else the picked telecaller, else nobody
  const viewAs = asUser || (selectedTc ? { id: selectedTc.id, name: selectedTc.name } : null);
  // ORIGINAL: const user = asUser ? { ...asUser, role: "telecaller" } : getUser();
  const user = viewAs ? { ...viewAs, role: "telecaller" } : realUser;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // ADDED: calendar filter (from / to dates) - all dashboard data follows it
  const [range, setRange] = useState({ from: "", to: "" });
  // ADDED: project filter - when a project is picked, every card, the telecaller
  // performance table and the follow-ups list below reflect only that project.
  const [project, setProject] = useState("");
  const [projects, setProjects] = useState([]); // dropdown options
  // MOVED UP (hooks fix): useNavigate must be called before any early return,
  // otherwise React throws "change in the order of Hooks" - it was previously
  // below the `if (error) return ...` lines
  const navigate = useNavigate();

  // ADDED: id of the telecaller whose dashboard is shown (admin view), else null
  // UPDATED: also set by the "Telecaller" filter
  // ORIGINAL: const asUserId = asUser ? asUser.id : null;
  const asUserId = viewAs ? viewAs.id : null;

  // ADDED: telecaller list for the "Telecaller" filter (admin only)
  useEffect(() => {
    if (!realIsAdmin) return;
    api("/users").then((rows) => setTelecallers((rows || []).filter((r) => r.role === "telecaller"))).catch(() => {});
  }, [realIsAdmin]);

  // ADDED: load the list of project names once for the filter dropdown
  useEffect(() => {
    // ORIGINAL: api("/dashboard/projects") - UPDATED: as a telecaller, only their projects
    api(asUserId ? `/dashboard/projects?assigned=${asUserId}` : "/dashboard/projects")
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, [asUserId]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    // ADDED: pass the selected project so the returned totals are project-scoped
    if (project) q.set("project", project);
    // ADDED: telecaller view for the admin (backend returns that telecaller's dashboard)
    if (asUserId) q.set("as_user", asUserId);
    api(`/dashboard${q.toString() ? `?${q}` : ""}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [range, project, asUserId]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <div className="empty">Loading dashboard...</div>;

  const t = data.totals;
  // ORIGINAL (bug): const navigate = useNavigate(); was here - AFTER the early
  // returns above, which violates the Rules of Hooks. Moved to the top of the
  // component with the other hooks.

  /* ORIGINAL CODE (static cards, auto-fill grid, not clickable):
  <div className="kpi-grid">
    <div className="kpi"><div className="label">Total database</div><div className="value">{t.total_leads || 0}</div></div>
    <div className="kpi k-green"><div className="label">Interested</div><div className="value">{t.interested || 0}</div></div>
    ... (all cards, unchanged data, moved into the CARDS array below)
  </div>
  REPLACED WITH: Bootstrap grid (5 per row on desktop, 3 on tablet, 2 on mobile),
  bigger cards, each clickable - opens the Leads page filtered to that content. */
  const CARDS = [
    { label: "Total database", value: t.total_leads, cls: "", link: "/leads" },
    // ADDED: Leads = priority warm/cold OR interested OR quotation sent Yes
    { label: "Leads", value: t.leads, cls: "k-green", link: "/leads?stage=leads" },
    { label: "Interested", value: t.interested, cls: "k-green", link: "/leads?category=INTERESTED" },
    { label: "Follow up", value: t.follow_up, cls: "k-blue", link: "/leads?category=FOLLOW UP" },
    { label: "Not interested", value: t.not_interested, cls: "k-red", link: "/leads?category=NOT INTERESTED" },
    { label: "Not answered", value: t.not_answered, cls: "k-amber", link: "/leads?category=NOT ANSWERED" },
    // ADDED: Not interested + Not answered (total of the two cards above)
    // ORIGINAL label: "Not interested + Not answered"  - RENAMED to "Connected calls" (same count)
    // ORIGINAL (full line): { label: "Not interested + Not answered", value: Number(t.not_interested || 0) + Number(t.not_answered || 0), cls: "k-red", link: "/leads?category=NI_NA" },
    { label: "Connected calls", value: Number(t.not_interested || 0) + Number(t.not_answered || 0), cls: "k-red", link: "/leads?category=NI_NA" },
    // ORIGINAL label: "Fresh (not called)"  - UPDATED name: "Not attempt" (same count, same link)
    { label: "Not attempt", value: t.fresh, cls: "", link: "/leads?category=FRESH" },
    { label: "Quotes sent", value: t.quotes_sent, cls: "k-blue", link: "/leads?quote=Yes" },
    { label: "Orders booked", value: t.orders_booked, cls: "k-green", link: "/leads?order=Yes" },
    { label: "Calls due today", value: t.due_today, cls: "k-amber", link: "/leads?due=today" },
    // ADDED: telecaller's walk-ins = their leads marked Walk-in = Yes
    // (telecaller dashboard + admin's view of a telecaller; admin's own
    // dashboard keeps the existing "Walk-ins visited" card instead)
    ...(user.role !== "admin"
      ? [{ label: "Walk-ins", value: t.walkin_leads, cls: "k-green", link: "/leads?walkin=Yes" }]
      : []),
    ...(user.role === "admin"
      ? [
          { label: "Unassigned leads", value: data.unassigned, cls: "k-red", link: "/leads?assigned=unassigned" },
          // ADDED: total walk-ins visited (admin only) - opens the Walk-ins page
          { label: "Walk-ins visited", value: data.walkins, cls: "k-green", link: "/walkins" },
          // ADDED: total projects in the database (admin only) - opens the project cards grid
          { label: "Total projects", value: data.projects_count, cls: "k-blue", link: "/project-cards" },
        ]
      : []),
  ];

  // ADDED: display order of the dashboard cards. Same cards, same numbers and
  // links as CARDS above - only the order they are shown in changes:
  // 1. Total database, 2. Walk-ins visited, 3. Quotes sent, 4. Follow up,
  // 5. Leads, then all remaining cards in their original order.
  // (Walk-ins visited is admin-only, so telecallers simply skip it.)
  // UPDATED: "Walk-ins" (telecaller card) takes the same 2nd place as the admin's "Walk-ins visited"
  // ORIGINAL: const CARD_ORDER = ["Total database", "Walk-ins visited", "Quotes sent", "Follow up", "Leads"];
  // UPDATED order: 1. Total database, 2. Walk-ins, 3. Quotes sent, 4. Leads, 5. Follow up
  // PREVIOUS: const CARD_ORDER = ["Total database", "Walk-ins visited", "Walk-ins", "Quotes sent", "Follow up", "Leads"];
  const CARD_ORDER = ["Total database", "Walk-ins visited", "Walk-ins", "Quotes sent", "Leads", "Follow up"];
  // ADDED: cards hidden from the dashboard. "Interested" is hidden because
  // interested leads are already counted in the "Leads" card (and listed when
  // it is clicked). The card itself is kept in CARDS above - to show it again
  // just remove it from this list.
  const HIDDEN_CARDS = ["Interested"];
  // ORIGINAL ORDERED_CARDS (unchanged) - the hidden cards are filtered out after
  const ORDERED_CARDS_ALL = [
    ...CARD_ORDER.map((label) => CARDS.find((c) => c.label === label)).filter(Boolean),
    ...CARDS.filter((c) => !CARD_ORDER.includes(c.label)),
  ];
  const ORDERED_CARDS = ORDERED_CARDS_ALL.filter((c) => !HIDDEN_CARDS.includes(c.label));

  // ADDED: keeps the project filter when drilling into the Leads page from a
  // card, so the leads shown there match the (project-filtered) card number.
  // Only lead cards carry it; the Walk-ins card is left untouched.
  // ORIGINAL withProject (kept, renamed):
  const withProjectOnly = (link) => {
    if (!project || !link || !link.startsWith("/leads")) return link;
    return link + (link.includes("?") ? "&" : "?") + `project=${encodeURIComponent(project)}`;
  };
  // UPDATED: in the telecaller view, card clicks also keep that telecaller
  // (assigned=<id>) so the admin sees only that telecaller's leads.
  // UPDATED: also when a telecaller is picked in the "Telecaller" filter
  const withProject = (link) => {
    const l = withProjectOnly(link);
    if (!viewAs || !l || !l.startsWith("/leads")) return l;
    return l + (l.includes("?") ? "&" : "?") + `assigned=${viewAs.id}`;
  };

  return (
    <div>
      {/* ORIGINAL title kept for the normal Dashboard page */}
      {asUser ? (
        <>
          <h3 style={{ margin: "4px 0 4px" }}>{user.name}'s dashboard</h3>
          <p className="page-sub">Exactly what {user.name} sees on their own dashboard</p>
        </>
      ) : (
      <>
      {/* UPDATED: title row - the "Telecaller" filter sits on the right (admin) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        {/* UPDATED: names the picked telecaller when the filter is used */}
        {selectedTc
          ? `Showing ${selectedTc.name}'s data — exactly what ${selectedTc.name} sees on their dashboard`
          : user.role === "admin"
          ? "Overview of all leads and telecaller performance"
          : `Your assigned leads at a glance, ${user.name}`}
      </p>
      </div>
      {realIsAdmin && (
        <div className="tc-filter">
          <label htmlFor="tc-filter">Telecaller</label>
          <select id="tc-filter" value={tcId} onChange={(e) => { setTcId(e.target.value); setProject(""); }}>
            <option value="">All telecallers</option>
            {telecallers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}{tc.status && tc.status !== "active" ? ` (${tc.status})` : ""}</option>)}
          </select>
          {tcId && <button type="button" className="btn small secondary" onClick={() => { setTcId(""); setProject(""); }} title="Show all telecallers">✕</button>}
        </div>
      )}
      </div>
      </>
      )}

      {/* ADDED: calendar filter - all cards, performance and follow-ups follow it */}
      <div className="filters">
        {/* ADDED: project filter - selecting a project rescopes all the data below */}
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
        {/* ADDED: Export to Excel (admin's own dashboard) - cards, telecaller
            performance and upcoming follow-ups, for the selected project / dates */}
        {/* UPDATED: shown on the admin's dashboard also while a telecaller is picked */}
        {/* ORIGINAL: {!asUser && user.role === "admin" && <ExportButton ... */}
        {realIsAdmin && <ExportButton className="btn small secondary" onExport={async () => {
          const period = [range.from && `from ${range.from}`, range.to && `to ${range.to}`].filter(Boolean).join(" ") || "All dates";
          return downloadExcel([
            { name: "Dashboard", rows: [
              { "Card": "Filter - telecaller", "Value": selectedTc ? selectedTc.name : "All telecallers" },
              { "Card": "Filter - project", "Value": project || "All projects" },
              { "Card": "Filter - dates", "Value": period },
              ...ORDERED_CARDS.map((c) => ({ "Card": c.label, "Value": Number(c.value || 0) })),
            ], numberCols: ["Value"] },
            { name: "Telecaller performance", rows: (data.performance || []).map((p) => ({
              "Telecaller": p.name, "Status": p.status, "Leads": Number(p.total_leads || 0), "Interested": Number(p.interested || 0),
              "Follow up": Number(p.follow_up || 0), "Not interested": Number(p.not_interested || 0),
              "Not answered": Number(p.not_answered || 0), "Quotes": Number(p.quotes_sent || 0), "Orders": Number(p.orders_booked || 0),
            })), numberCols: ["Leads", "Interested", "Follow up", "Not interested", "Not answered", "Quotes", "Orders"] },
            { name: "Upcoming follow-ups", rows: (data.followups || []).map((f) => ({
              "Lead": f.name, "Phone": f.primary_phone || "", "Next call": d10(f.next_call_date),
              "Category": f.call_category || "Not attempt" /* ORIGINAL: "Fresh" */, "Telecaller": f.caller_name || "Unassigned",
            })) },
          ], ["Dashboard", selectedTc && selectedTc.name, project].filter(Boolean).join("_"));
        }} />}
        {(range.from || range.to) && (
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Showing data {range.from ? `from ${range.from}` : ""} {range.to ? `to ${range.to}` : ""}
          </span>
        )}
      </div>

      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3" style={{ marginBottom: 22 }}>
        {/* ORIGINAL: {CARDS.map((c) => (  - UPDATED: uses the new card order */}
        {ORDERED_CARDS.map((c) => (
          <div className="col" key={c.label}>
            <div
              className={`kpi kpi-lg clickable ${c.cls}`}
              onClick={() => navigate(withProject(c.link))}
              title={`View ${c.label.toLowerCase()}`}
            >
              <div className="label">{c.label}</div>
              <div className="value">{c.value || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ADDED: WhatsApp cards on the dashboard, right below the number cards (Meta / Bulk) - same cards, filters,
          Read/Delivered/Failed and Export as the WhatsApp pages */}
      <div className="card dash-wa">
        <div className="dash-wa-head">
          <h3 style={{ margin: 0 }}>💬 WhatsApp</h3>
          <div className="view-toggle" role="group" aria-label="WhatsApp type">
            <button type="button" className={`btn small ${waTab === "meta" ? "" : "secondary"}`} onClick={() => setWaTab("meta")}>Meta WhatsApp</button>
            <button type="button" className={`btn small ${waTab === "bulk" ? "" : "secondary"}`} onClick={() => setWaTab("bulk")}>Bulk WhatsApp</button>
          </div>
          <Link className="dash-wa-open" to={waTab === "meta" ? "/whatsapp/meta" : "/whatsapp/bulk"}>+ New {waTab === "meta" ? "Meta" : "Bulk"} request →</Link>
        </div>
        <WhatsAppHistory
          key={waTab}
          channel={waTab === "meta" ? "Meta WhatsApp" : "Bulk WhatsApp"}
          channelKey={waTab}
          reloadKey={0}
          // admin viewing one telecaller's dashboard -> only that telecaller's requests
          fixedTelecallerId={realIsAdmin || asUser ? (viewAs ? viewAs.id : null) : null}
        />
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
                  <td><a className="wa-link" href={`https://wa.me/91${f.primary_phone}`} target="_blank" rel="noreferrer">{phoneText(f.primary_phone) /* ORIGINAL: {f.primary_phone} */}</a></td>
                  <td>{f.next_call_date ? String(f.next_call_date).slice(0, 10) : "-"}</td>
                  <td>{f.call_category ? <span className={`chip ${f.call_category.replaceAll(" ", "_")}`}>{f.call_category}</span> : <span className="chip none">Not attempt</span> /* ORIGINAL text: Fresh */}</td>
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
