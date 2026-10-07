import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getUser } from "../api.js";
import LeadModal from "../components/LeadModal.jsx";
// ADDED: same Walk-in form as the Walk-ins page, for the walk-in leads table
import WalkinModal from "../components/WalkinModal.jsx";
// ADDED: "Convert to lead" pop-up for the walk-in table
import ConvertWalkinModal from "../components/ConvertWalkinModal.jsx";

const CATEGORIES = ["NOT INTERESTED", "FOLLOW UP", "INTERESTED", "NOT ANSWERED"];

// ADDED: WhatsApp helpers.
// Builds a wa.me link that opens WhatsApp (mobile app on phones, WhatsApp Web /
// Desktop on computers) with the lead's number selected and a greeting message
// pre-typed. The message is sent from whichever WhatsApp account is logged in on
// that device/browser - i.e. your company WhatsApp when it is the active account.
// NOTE: WhatsApp does not allow a link to auto-press "Send"; the user taps send.
function waNumber(rawPhone) {
  // keep digits only
  let digits = String(rawPhone || "").replace(/\D/g, "");
  // A plain 10-digit Indian mobile needs the 91 country code.
  // Numbers that already include a country code (11-15 digits) are used as-is.
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}
function waMessage(lead) {
  const name = lead.name ? ` ${lead.name}` : "";
  const project = lead.project_name ? ` regarding *${lead.project_name}*` : "";
  // Customise this greeting to whatever your team should send.
  return `Hello${name}, this is Deeraj Interiors${project}. Thank you for your interest - how can we help you today?`;
}
function openWhatsApp(lead) {
  const num = waNumber(lead.primary_phone);
  if (!num || num.length < 11) {
    alert("This lead does not have a valid phone number for WhatsApp.");
    return;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(waMessage(lead))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Small inline WhatsApp glyph so we don't add an icon dependency.
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.001C24.6 28.8 30 23.4 30 16.8 30 9.4 24.6 3 16 3zm.02 22.3c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.9 1 1-4.8-.3-.4C5.4 18.6 5 16.8 5 15c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-8.98 10.3zm5.5-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"/>
    </svg>
  );
}

export default function Leads() {
  const user = getUser();
  const isAdmin = user.role === "admin";

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [telecallers, setTelecallers] = useState([]);
  // ORIGINAL: const [filters, setFilters] = useState({ search: "", category: "", assigned: "", quote: "", order: "" });
  // EXTENDED: filters now initialise from the URL query string, so clicking a
  // dashboard card (e.g. /leads?category=INTERESTED) opens the leads already
  // filtered to that content. Also added the "due" filter for "Calls due today".
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: "",
    category: searchParams.get("category") || "",
    assigned: searchParams.get("assigned") || "",
    quote: searchParams.get("quote") || "",
    order: searchParams.get("order") || "",
    due: searchParams.get("due") || "",
    // ADDED: project filter, initialised from the URL so a project-filtered
    // dashboard card opens the leads already scoped to that project.
    project: searchParams.get("project") || "",
    // ADDED: stage=leads comes from the dashboard "Leads" card
    stage: searchParams.get("stage") || "",
  });
  // ADDED: project names for the filter dropdown
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [modalLead, setModalLead] = useState(null); // null closed, {} new, {..} edit
  const [msg, setMsg] = useState({ type: "", text: "" });
  // ADDED: card view for the dashboard "Leads" card (stage=leads). Cards are the
  // default there; the Cards / Table switch shows the original tables again.
  const [viewMode, setViewMode] = useState("cards");

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ ...filters, page, limit }).toString();
      const data = await api(`/leads?${q}`);
      setLeads(data.leads);
      setTotal(data.total);
      setSelected([]);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdmin) {
      api("/users").then((rows) => setTelecallers(rows.filter((r) => r.role === "telecaller"))).catch(() => {});
    }
  }, [isAdmin]);

  // ADDED: walk-ins shown (read-only) under the leads when the page is opened
  // from the dashboard "Leads" card (stage=leads). Admin only, same as the
  // Walk-ins card. Respects the project filter.
  const [walkinLeads, setWalkinLeads] = useState([]);
  // ADDED: Edit / Delete for walk-ins here, same as the Walk-ins page
  const [modalWalkin, setModalWalkin] = useState(null);
  // ADDED: walk-in being converted to a lead
  const [convertWalkin, setConvertWalkin] = useState(null);
  const loadWalkinLeads = useCallback(() => {
    if (!isAdmin || filters.stage !== "leads") { setWalkinLeads([]); return; }
    const q = filters.project ? `?project=${encodeURIComponent(filters.project)}` : "";
    api(`/dashboard/walkin-leads${q}`).then((d) => setWalkinLeads(d.walkins || [])).catch(() => setWalkinLeads([]));
  }, [isAdmin, filters.stage, filters.project]);
  useEffect(() => { loadWalkinLeads(); }, [loadWalkinLeads]);
  const removeWalkin = async (w) => {
    if (!window.confirm(`Delete walk-in for "${w.name}"?`)) return;
    try {
      await api(`/walkins/${w.id}`, { method: "DELETE" });
      setMsg({ type: "success", text: "Walk-in deleted" });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      loadWalkinLeads();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  // ADDED: load project names (admin: all; telecaller: only their own leads' projects)
  useEffect(() => {
    api("/dashboard/projects").then((d) => setProjects(d.projects || [])).catch(() => {});
  }, []);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3500);
  };

  const inlineUpdate = async (id, field, value) => {
    try {
      await api(`/leads/${id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    } catch (e) {
      flash("error", e.message);
    }
  };

  const bulkAssign = async () => {
    if (selected.length === 0) return flash("error", "Select at least one lead first");
    try {
      const data = await api("/leads/assign", {
        method: "POST",
        body: JSON.stringify({ lead_ids: selected, assigned_to: assignTo || null }),
      });
      flash("success", data.message);
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  const removeLead = async (id) => {
    if (!window.confirm("Delete this lead permanently?")) return;
    try {
      await api(`/leads/${id}`, { method: "DELETE" });
      flash("success", "Lead deleted");
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelected((prev) => (prev.length === leads.length ? [] : leads.map((l) => l.id)));

  const pages = Math.max(1, Math.ceil(total / limit));
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");
  // ADDED: true when the card view is showing (only in the "Leads" card view)
  // ORIGINAL: const showCards = filters.stage === "leads" && viewMode === "cards";
  // UPDATED: cards also for the dashboard "Follow up" card (opened with
  // ?category=FOLLOW UP). If the category filter is changed on the page, the
  // normal table comes back.
  const fromFollowUpCard = searchParams.get("category") === "FOLLOW UP";
  const cardsAllowed = filters.stage === "leads" || (fromFollowUpCard && filters.category === "FOLLOW UP");
  const showCards = cardsAllowed && viewMode === "cards";

  return (
    <div>
      <h1 className="page-title">Leads</h1>
      <p className="page-sub">
        {isAdmin ? `All leads across the team (${total} total)` : `Leads assigned to you (${total})`}
      </p>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name or phone..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          {/* ADDED: matches the "Fresh (not called)" dashboard card */}
          <option value="FRESH">FRESH (NOT CALLED)</option>
        </select>
        <select value={filters.quote} onChange={(e) => { setPage(1); setFilters({ ...filters, quote: e.target.value }); }}>
          <option value="">Quote sent?</option><option>Yes</option><option>No</option>
        </select>
        <select value={filters.order} onChange={(e) => { setPage(1); setFilters({ ...filters, order: e.target.value }); }}>
          <option value="">Order booked?</option><option>Yes</option><option>No</option>
        </select>
        {/* ADDED: project filter - also set automatically when arriving from a
            project-filtered dashboard card (via ?project= in the URL) */}
        <select value={filters.project} onChange={(e) => { setPage(1); setFilters({ ...filters, project: e.target.value }); }}>
          <option value="">Projects</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && (
          <select value={filters.assigned} onChange={(e) => { setPage(1); setFilters({ ...filters, assigned: e.target.value }); }}>
            <option value="">Telecallers</option>
            <option value="unassigned">Unassigned</option>
            {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {/* ADDED: shown when opened from the dashboard "Leads" card; click to remove */}
        {filters.stage === "leads" && (
          <button className="btn small secondary" title="Remove this filter"
                  onClick={() => { setPage(1); setFilters({ ...filters, stage: "" }); }}>
            {/* UPDATED label: walk-in = Yes leads are included too */}
            Leads only (warm/cold, interested, quote sent, walk-in) ✕
          </button>
        )}
        {/* ADDED: Cards / Table switch for the "Leads" card view */}
        {/* ORIGINAL: {filters.stage === "leads" && ( - UPDATED: also for Follow up */}
        {cardsAllowed && (
          <div className="view-toggle" role="group" aria-label="View">
            <button className={`btn small ${viewMode === "cards" ? "" : "secondary"}`} onClick={() => setViewMode("cards")}>▦ Cards</button>
            <button className={`btn small ${viewMode === "table" ? "" : "secondary"}`} onClick={() => setViewMode("table")}>☰ Table</button>
          </div>
        )}
        {/* ORIGINAL: {isAdmin && <button className="btn" onClick={() => setModalLead({})}>+ Add lead</button>}
            UPDATED: telecallers can also add a single lead (auto-assigned to them) */}
        <button className="btn" onClick={() => setModalLead({})}>+ Add lead</button>
      </div>

      {isAdmin && (
        <div className="filters">
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{selected.length} selected</span>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Unassign</option>
            {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn small secondary" onClick={bulkAssign}>Assign selected</button>
        </div>
      )}

      {/* ADDED: lead cards (shown instead of the table in the "Leads" card view) */}
      {showCards && (
        <div className="lead-cards">
          {leads.length === 0 && <div className="card empty">No leads found.</div>}
          {leads.map((l) => (
            // UPDATED: card shows only the same details as the table columns -
            // Name, Project, Primary phone, Caller, 1st call, Call category,
            // Quote sent, Order booked - with WhatsApp + Edit at the bottom.
            // Edit opens the same "Edit lead" form as the table's Edit button.
            <div className="lead-card" key={l.id}>
              <div className="lc-name"><span className={`dot ${l.priority || "none"}`}></span>{l.name}</div>
              <div className="lc-grid">
                <span>Project</span><b>{l.project_name || "-"}</b>
                {/* ADDED: project type (2BHK / 3BHK / 4BHK / Villa / Commercial / Others) */}
                <span>Project type</span><b>{l.project_type || "-"}</b>
                <span>Primary phone</span>
                <b>
                  <a className="wa-link" href={`https://wa.me/${waNumber(l.primary_phone)}?text=${encodeURIComponent(waMessage(l))}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
                    {l.primary_phone}
                  </a>
                </b>
                {isAdmin && (<><span>Caller</span><b>{l.caller_name || <span className="chip none">Unassigned</span>}</b></>)}
                <span>1st call</span><b>{fmt(l.first_calling_date) || "-"}</b>
              </div>
              {/* same dropdowns as the table - changes save straight away */}
              <div className="lc-selects">
                <label>
                  <span>Call category</span>
                  <select className="inline" value={l.call_category || ""} onChange={(e) => inlineUpdate(l.id, "call_category", e.target.value)}>
                    <option value="">—</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  <span>Quote sent</span>
                  <select className="inline" value={l.quote_sent || ""} onChange={(e) => inlineUpdate(l.id, "quote_sent", e.target.value)}>
                    <option value="">—</option><option>Yes</option><option>No</option>
                  </select>
                </label>
                <label>
                  <span>Order booked</span>
                  <select className="inline" value={l.order_booked || ""} onChange={(e) => inlineUpdate(l.id, "order_booked", e.target.value)}>
                    <option value="">—</option><option>Yes</option><option>No</option>
                  </select>
                </label>
              </div>
              <div className="lc-actions">
                <button className="btn small wa-btn" title="Send WhatsApp message" onClick={() => openWhatsApp(l)}>
                  <WhatsAppIcon /><span style={{ marginLeft: 6 }}>WhatsApp</span>
                </button>
                <button className="btn small secondary" onClick={() => setModalLead(l)}>Edit</button>
                {/* ADDED: Delete on the card - admin only, same as the table (asks to confirm) */}
                {isAdmin && <button className="btn small danger" onClick={() => removeLead(l.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ORIGINAL table below - unchanged, shown normally and in "Table" view */}
      {!showCards && (
      <div className="card" style={{ padding: 0 }}>
        {/* ORIGINAL: <div className="table-wrap"> - scrollbar was only reachable
            after scrolling past all rows. sticky-scroll keeps it always visible. */}
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                {isAdmin && (
                  <th className="checkbox-cell">
                    <input type="checkbox" checked={leads.length > 0 && selected.length === leads.length} onChange={toggleAll} />
                  </th>
                )}
                <th>Name</th>
                {/* ADDED: mandatory Project Name from Excel import */}
                <th>Project</th>
                <th>Primary phone</th>
                {isAdmin && <th>Caller</th>}
                <th>1st call</th>
                <th>Call category</th>
                <th>Quote sent</th>
                <th>Order booked</th>
                <th>2nd call</th>
                <th>WhatsApp sent</th>
                <th>WA category</th>
                <th>Calling remark</th>
                {/* ADDED: 3 call remarks + 3 WhatsApp sent Yes/No */}
                <th>Call 1 remark</th>
                <th>Call 2 remark</th>
                <th>Call 3 remark</th>
                {/* UPDATED: WhatsApp 1/2/3 now show the sent DATE (was Yes/No) */}
                <th>WhatsApp 1 date</th>
                <th>WhatsApp 2 date</th>
                <th>WhatsApp 3 date</th>
                <th>Next call</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                // ORIGINAL: colSpan="15" - widened for the 6 new columns
                <tr><td colSpan="21" className="empty">No leads found.</td></tr>
              )}
              {leads.map((l) => (
                <tr key={l.id}>
                  {isAdmin && (
                    <td className="checkbox-cell">
                      <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                  )}
                  <td>
                    <span className={`dot ${l.priority || "none"}`}></span>
                    <strong>{l.name}</strong>
                  </td>
                  {/* ADDED: project name cell */}
                  <td>{l.project_name || "-"}</td>
                  <td>
                    {/* UPDATED: clicking the number opens WhatsApp with the greeting
                        pre-typed, using the same robust number handling as the icon. */}
                    <a
                      className="wa-link"
                      href={`https://wa.me/${waNumber(l.primary_phone)}?text=${encodeURIComponent(waMessage(l))}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open WhatsApp chat"
                    >
                      {l.primary_phone}
                    </a>
                  </td>
                  {isAdmin && <td>{l.caller_name || <span className="chip none">Unassigned</span>}</td>}
                  <td>{fmt(l.first_calling_date) || "-"}</td>
                  <td>
                    <select
                      className="inline"
                      value={l.call_category || ""}
                      onChange={(e) => inlineUpdate(l.id, "call_category", e.target.value)}
                    >
                      <option value="">—</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="inline" value={l.quote_sent || ""} onChange={(e) => inlineUpdate(l.id, "quote_sent", e.target.value)}>
                      <option value="">—</option><option>Yes</option><option>No</option>
                    </select>
                  </td>
                  <td>
                    <select className="inline" value={l.order_booked || ""} onChange={(e) => inlineUpdate(l.id, "order_booked", e.target.value)}>
                      <option value="">—</option><option>Yes</option><option>No</option>
                    </select>
                  </td>
                  <td>{fmt(l.second_calling_date) || "-"}</td>
                  <td>{fmt(l.whatsapp_sent_date) || "-"}</td>
                  <td>{l.whatsapp_category || "-"}</td>
                  <td className="remark">{l.calling_remark || "-"}</td>
                  {/* ADDED: 3 call remarks (edit via the Edit button) */}
                  <td className="remark">{l.call_remark_1 || "-"}</td>
                  <td className="remark">{l.call_remark_2 || "-"}</td>
                  <td className="remark">{l.call_remark_3 || "-"}</td>
                  {/* ORIGINAL: 3 WhatsApp sent Yes/No dropdowns (whatsapp_sent_N)
                      UPDATED: show the WhatsApp sent dates - set them with Edit */}
                  {[1, 2, 3].map((n) => (
                    <td key={`wa${n}`}>{fmt(l[`whatsapp_date_${n}`]) || "-"}</td>
                  ))}
                  <td>{fmt(l.next_call_date) || "-"}</td>
                  <td>
                    <div className="row-actions">
                      {/* ADDED: WhatsApp button - opens WhatsApp with number + message ready */}
                      <button
                        className="btn small wa-btn"
                        title="Send WhatsApp message"
                        onClick={() => openWhatsApp(l)}
                      >
                        <WhatsAppIcon />
                      </button>
                      <button className="btn small secondary" onClick={() => setModalLead(l)}>Edit</button>
                      {isAdmin && <button className="btn small danger" onClick={() => removeLead(l.id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <div className="pagination">
        <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {/* ADDED: walk-ins counted in the dashboard "Leads" card - read-only list.
          Edit walk-ins from the Walk-ins page as before. */}
      {isAdmin && filters.stage === "leads" && (
        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          <div style={{ padding: "14px 16px 0" }}>
            <h3>Walk-in leads ({walkinLeads.length})</h3>
          </div>
          {/* ADDED: walk-in cards (shown instead of the table in "Cards" view) */}
          {showCards && (
            <div className="lead-cards" style={{ padding: 16 }}>
              {walkinLeads.length === 0 && <div className="empty">No walk-ins found.</div>}
              {walkinLeads.map((w) => (
                <div className="lead-card" key={`wc${w.id}`}>
                  <div className="lc-head">
                    <div>
                      <div className="lc-name">{w.name}</div>
                      <div className="lc-sub">{w.project_name || "No project"} · Walk-in {fmt(w.visit_date)}</div>
                    </div>
                    {w.converted_lead_id
                      ? <span className="chip yes">✓ Lead</span>
                      : <span className="chip none">Walk-in</span>}
                  </div>
                  <a className="wa-link lc-phone" href={`https://wa.me/${waNumber(w.phone)}`} target="_blank" rel="noreferrer">{w.phone}</a>
                  <div className="lc-grid">
                    <span>Alt. mobile</span><b>{w.alt_phone || "-"}</b>
                    <span>Purpose</span><b>{w.purpose || "-"}</b>
                    <span>Budget</span><b>{w.budget || "-"}</b>
                    <span>Experience centre</span><b>{w.location || "-"}</b>
                    <span>Location</span><b>{[w.site_location, w.city].filter(Boolean).join(", ") || "-"}</b>
                    <span>Attended by</span><b>{w.attended_by || "-"}</b>
                    <span>Added by</span><b>{w.created_by_name || "-"}</b>
                  </div>
                  {(w.remarks || w.address) && (
                    <div className="lc-remarks">
                      {w.address && <div><span>Address:</span> {w.address}</div>}
                      {w.remarks && <div><span>Remarks:</span> {w.remarks}</div>}
                    </div>
                  )}
                  <div className="lc-actions">
                    {!w.converted_lead_id && (
                      <button className="btn small" onClick={() => setConvertWalkin(w)}>→ Convert to lead</button>
                    )}
                    <button className="btn small secondary" onClick={() => setModalWalkin(w)}>Edit</button>
                    <button className="btn small danger" onClick={() => removeWalkin(w)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* UPDATED: same columns and layout as the Walk-ins page
              (ORIGINAL table kept - shown in "Table" view) */}
          {!showCards && (
          <div className="table-wrap sticky-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone number</th>
                  <th>Alt. mobile</th>
                  <th>Project / villa</th>
                  <th>Visit date</th>
                  <th>Purpose</th>
                  <th>Experience centre</th>
                  <th>Location</th>
                  <th>City</th>
                  <th>Address</th>
                  <th>Budget</th>
                  <th>Attended by</th>
                  <th>Remarks</th>
                  <th>Added by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {walkinLeads.length === 0 && (
                  <tr><td colSpan={15} className="empty">No walk-ins found.</td></tr>
                )}
                {walkinLeads.map((w) => (
                  <tr key={`w${w.id}`}>
                    <td>{w.name}</td>
                    <td>
                      <a
                        className="wa-link"
                        href={`https://wa.me/${waNumber(w.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open WhatsApp chat"
                      >
                        {w.phone}
                      </a>
                    </td>
                    <td>
                      {w.alt_phone ? (
                        <a className="wa-link" href={`https://wa.me/${waNumber(w.alt_phone)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
                          {w.alt_phone}
                        </a>
                      ) : "-"}
                    </td>
                    <td>{w.project_name || "-"}</td>
                    <td>{fmt(w.visit_date) || "-"}</td>
                    <td>{w.purpose || "-"}</td>
                    <td>{w.location || "-"}</td>
                    <td>{w.site_location || "-"}</td>
                    <td>{w.city || "-"}</td>
                    <td className="remark">{w.address || "-"}</td>
                    <td>{w.budget || "-"}</td>
                    <td>{w.attended_by || "-"}</td>
                    <td className="remark">{w.remarks || "-"}</td>
                    <td>{w.created_by_name || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {/* ADDED: convert this walk-in to a lead (or show it is already a lead) */}
                      {w.converted_lead_id ? (
                        <span className="chip yes" style={{ marginRight: 6 }} title="Already added to Data (Leads)">✓ Lead</span>
                      ) : (
                        <button className="btn small" style={{ marginRight: 6 }} onClick={() => setConvertWalkin(w)}>→ Convert to lead</button>
                      )}
                      <button className="btn small secondary" onClick={() => setModalWalkin(w)}>Edit</button>
                      <button className="btn small danger" style={{ marginLeft: 6 }} onClick={() => removeWalkin(w)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* ADDED: convert walk-in to lead pop-up - refreshes both lists after */}
      {convertWalkin && (
        <ConvertWalkinModal
          walkin={convertWalkin}
          onClose={() => setConvertWalkin(null)}
          onConverted={(text) => {
            setConvertWalkin(null);
            setMsg({ type: "success", text });
            setTimeout(() => setMsg({ type: "", text: "" }), 3500);
            loadWalkinLeads();
            load();
          }}
        />
      )}

      {/* ADDED: same Walk-in edit form as the Walk-ins page */}
      {modalWalkin && (
        <WalkinModal
          walkin={modalWalkin}
          onClose={() => setModalWalkin(null)}
          onSaved={() => { setModalWalkin(null); loadWalkinLeads(); }}
        />
      )}

      {modalLead !== null && (
        <LeadModal
          lead={modalLead}
          telecallers={telecallers}
          isAdmin={isAdmin}
          onClose={() => setModalLead(null)}
          onSaved={() => { setModalLead(null); load(); }}
        />
      )}
    </div>
  );
}
