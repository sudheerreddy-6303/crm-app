import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getUser } from "../api.js";
import LeadModal from "../components/LeadModal.jsx";

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
  });
  const [selected, setSelected] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [modalLead, setModalLead] = useState(null); // null closed, {} new, {..} edit
  const [msg, setMsg] = useState({ type: "", text: "" });

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
        {isAdmin && (
          <select value={filters.assigned} onChange={(e) => { setPage(1); setFilters({ ...filters, assigned: e.target.value }); }}>
            <option value="">Telecallers</option>
            <option value="unassigned">Unassigned</option>
            {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {isAdmin && <button className="btn" onClick={() => setModalLead({})}>+ Add lead</button>}
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
                <th>Next call</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan="15" className="empty">No leads found.</td></tr>
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

      <div className="pagination">
        <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

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
