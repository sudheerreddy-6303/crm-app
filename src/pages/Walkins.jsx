import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
// ADDED: admin "Export to Excel" (shared helper + button)
import ExportButton from "../components/ExportButton.jsx";
import { fetchAllPages, downloadExcel, d10 } from "../utils/exportExcel.js";
import WalkinModal, { WALKIN_PURPOSES } from "../components/WalkinModal.jsx";
// ADDED: "Convert to lead" pop-up
import ConvertWalkinModal from "../components/ConvertWalkinModal.jsx";
// ADDED: walk-in cards - "Follow up" opens the same lead form as the lead
// cards; "View" (admin) shows all details read-only
import LeadModal from "../components/LeadModal.jsx";
import WalkinViewModal from "../components/WalkinViewModal.jsx";
import { showPopup } from "../components/Popup.jsx";

// ADDED: WhatsApp greeting + icon for the walk-in cards (same style as Leads)
function waMessage(w) {
  const name = w.name ? ` ${w.name}` : "";
  return `Hello${name}, this is Deeraj Interiors. Thank you for visiting our experience centre - how can we help you further?`;
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.7.9 3.7 1.4 5.8 1.4h.001C24.6 28.8 30 23.4 30 16.8 30 9.4 24.6 3 16 3zm.02 22.3c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.9 1 1-4.8-.3-.4C5.4 18.6 5 16.8 5 15c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-8.98 10.3zm5.5-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"/>
    </svg>
  );
}

// ADDED: Walk-ins page - table of all walk-in records, search + purpose filter,
// and a top-right "+ Add walk-in" button that opens the modal. Mirrors the
// Service Calls page. The phone number is a WhatsApp link, like the Leads page.

// WhatsApp number helper (same rule as the Leads page): 10-digit Indian mobiles
// get the 91 country code; numbers that already include a code are used as-is.
function waNumber(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}

export default function Walkins() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [walkins, setWalkins] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", purpose: "" });
  const [page, setPage] = useState(1);
  const limit = 50;
  const [modalWalkin, setModalWalkin] = useState(null);
  // ADDED: walk-in being converted to a lead (null = pop-up closed)
  const [convertWalkin, setConvertWalkin] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  // ADDED: cards view (default) / original table view
  const [viewMode, setViewMode] = useState("cards");
  // ADDED: walk-in shown in the read-only View pop-up (admin)
  const [viewWalkin, setViewWalkin] = useState(null);
  // ADDED: lead opened by "Follow up" (same lead form as the lead cards)
  const [followLead, setFollowLead] = useState(null);
  // ADDED: true when "Follow up" was clicked on a walk-in that is not a lead
  // yet - after "Convert to lead" its Follow up form opens automatically
  const [followAfterConvert, setFollowAfterConvert] = useState(false);
  // ADDED: telecaller list for the lead form's "Assigned telecaller" (admin)
  const [telecallers, setTelecallers] = useState([]);
  useEffect(() => {
    if (isAdmin) api("/users").then((rows) => setTelecallers((rows || []).filter((r) => r.role === "telecaller"))).catch(() => {});
  }, [isAdmin]);

  // ADDED: open the lead form for a walk-in that is already a lead
  const openLead = async (leadId) => {
    try {
      const lead = await api(`/leads/${leadId}`);
      // UPDATED: this lead came from a walk-in, so the form's "Walk-in" field
      // is pre-filled with "Yes" when it is still empty (saved with the form;
      // Source is already "Walk-in" from the conversion)
      // ORIGINAL: setFollowLead(lead);
      setFollowLead({ ...lead, walkin: lead.walkin || "Yes" });
    } catch (e) {
      showPopup("error", e.message, "Could not open follow up");
    }
  };
  // ADDED: "Follow up" button - converted walk-in -> its lead form;
  // not converted yet -> "Convert to lead" first, then the lead form
  // UPDATED: a walk-in that is not a lead yet is converted automatically
  // (same conversion as the "Convert to lead" button - walk-in record is kept)
  // and its lead Follow up form opens straight away, exactly like the lead
  // cards. Telecaller: the lead is assigned to them. Admin: pick the
  // telecaller in the form's "Assigned telecaller" field.
  // PREVIOUS: not converted -> setFollowAfterConvert(true); setConvertWalkin(w);
  const followUp = async (w) => {
    if (w.converted_lead_id) { openLead(w.converted_lead_id); return; }
    try {
      const data = await api(`/walkins/${w.id}/convert`, { method: "POST", body: JSON.stringify({ assigned_to: null }) });
      load();
      if (data && data.id) openLead(data.id);
    } catch (e) {
      // the app pop-up already shows the reason (e.g. phone already in Data)
      flash("error", e.message);
    }
  };

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.purpose) q.set("purpose", filters.purpose);
    api(`/walkins?${q}`)
      .then((d) => { setWalkins(d.walkins); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const remove = async (w) => {
    if (!window.confirm(`Delete walk-in for "${w.name}"?`)) return;
    try {
      await api(`/walkins/${w.id}`, { method: "DELETE" });
      flash("success", "Walk-in deleted");
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  // ADDED: export all walk-ins matching the search / purpose filter
  const exportAll = async () => {
    const rows = await fetchAllPages("/walkins", { search: filters.search, purpose: filters.purpose }, "walkins");
    return downloadExcel([{ name: "Walk-ins", rows: rows.map((w) => ({
      "Name": w.name || "", "Phone number": w.phone || "", "Alt. mobile": w.alt_phone || "",
      "Project / villa": w.project_name || "", "Visit date": d10(w.visit_date), "Purpose": w.purpose || "",
      "Experience centre": w.location || "", "Location": w.site_location || "", "City": w.city || "",
      "Address": w.address || "", "Budget": w.budget || "", "Attended by": w.attended_by || "",
      "Remarks": w.remarks || "", "Converted to lead": w.converted_lead_id ? "Yes" : "No",
      "Added by": w.created_by_name || "", "Created": d10(w.created_at),
    })) }], "Walk_ins");
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");

  return (
    <div>
      {/* Top row: title on the left, Add button on the top right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">🚶 Walk-ins</h1>
          <p className="page-sub">All customers who walked in to an experience centre ({total} total)</p>
        </div>
        {/* ORIGINAL: <button className="btn" onClick={() => setModalWalkin({})}>+ Add walk-in</button>
            UPDATED: same button, with the admin Export button beside it */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && <ExportButton onExport={exportAll} />}
          <button className="btn" onClick={() => setModalWalkin({})}>+ Add walk-in</button>
        </div>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, phone, location or staff..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.purpose} onChange={(e) => { setPage(1); setFilters({ ...filters, purpose: e.target.value }); }}>
          <option value="">All purposes</option>
          {WALKIN_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {/* ADDED: Cards / Table switch (same as the other pages) */}
        <div className="view-toggle" role="group" aria-label="View">
          <button className={`btn small ${viewMode === "cards" ? "" : "secondary"}`} onClick={() => setViewMode("cards")}>▦ Cards</button>
          <button className={`btn small ${viewMode === "table" ? "" : "secondary"}`} onClick={() => setViewMode("table")}>☰ Table</button>
        </div>
      </div>

      {/* ADDED: walk-in cards - same look as the lead cards */}
      {viewMode === "cards" && (
        <div className="lead-cards">
          {walkins.length === 0 && <div className="card empty">No walk-ins yet. Click "+ Add walk-in" to create one.</div>}
          {walkins.map((w) => (
            <div className="lead-card" key={`wk${w.id}`}>
              <div className="lc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="lc-name">{w.name}</div>
                  <div className="lc-sub">
                    {w.converted_lead_id ? <span className="chip yes" title="Already added to Data (Leads)">✓ Lead</span> : <span className="chip none">Walk-in</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button className="btn small secondary lc-view" title="View full details" onClick={() => setViewWalkin(w)}>View</button>
                )}
              </div>
              <div className="lc-grid">
                <span>Project / villa</span><b>{w.project_name || "-"}</b>
                <span>Purpose</span><b>{w.purpose || "-"}</b>
                <span>Phone number</span>
                <b><a className="wa-link" href={`https://wa.me/${waNumber(w.phone)}?text=${encodeURIComponent(waMessage(w))}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">{w.phone}</a></b>
                {w.alt_phone && (<><span>Alt. mobile</span><b><a className="wa-link" href={`https://wa.me/${waNumber(w.alt_phone)}`} target="_blank" rel="noreferrer">{w.alt_phone}</a></b></>)}
                <span>Visit date</span><b>{fmt(w.visit_date) || "-"}</b>
                <span>Experience centre</span><b>{w.location || "-"}</b>
                <span>Location</span><b>{[w.site_location, w.city].filter(Boolean).join(", ") || "-"}</b>
                <span>Budget</span><b>{w.budget || "-"}</b>
                <span>Attended by</span><b>{w.attended_by || "-"}</b>
              </div>
              {(w.remarks || w.address) && (
                <div className="lc-remarks">
                  {w.address && <div><span>Address:</span> {w.address}</div>}
                  {w.remarks && <div><span>Remarks:</span> {w.remarks}</div>}
                </div>
              )}
              <div className="lc-actions">
                <button className="btn small wa-btn" title="Send WhatsApp message"
                        onClick={() => window.open(`https://wa.me/${waNumber(w.phone)}?text=${encodeURIComponent(waMessage(w))}`, "_blank", "noopener,noreferrer")}>
                  <WhatsAppIcon /><span style={{ marginLeft: 6 }}>WhatsApp</span>
                </button>
                <button className="btn small secondary" title={w.converted_lead_id ? "Open the lead form" : "Convert to lead, then open the lead form"} onClick={() => followUp(w)}>Follow up</button>
                {/* REMOVED from the cards on request (Edit is still in Table view):
                    <button className="btn small secondary" title="Edit walk-in details" onClick={() => setModalWalkin(w)}>Edit</button> */}
                {isAdmin && <button className="btn small danger" onClick={() => remove(w)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ORIGINAL table below - unchanged, shown in "Table" view */}
      {viewMode === "table" && (
      <div className="card" style={{ padding: 0 }}>
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
              {walkins.length === 0 && (
                <tr><td colSpan={15} className="empty">No walk-ins yet. Click "+ Add walk-in" to create one.</td></tr>
              )}
              {walkins.map((w) => (
                <tr key={w.id}>
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
                  {/* ADDED: alternate mobile (also a WhatsApp link when present) */}
                  <td>
                    {w.alt_phone ? (
                      <a className="wa-link" href={`https://wa.me/${waNumber(w.alt_phone)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
                        {w.alt_phone}
                      </a>
                    ) : "-"}
                  </td>
                  {/* ADDED: project / villa name */}
                  <td>{w.project_name || "-"}</td>
                  <td>{fmt(w.visit_date) || "-"}</td>
                  <td>{w.purpose || "-"}</td>
                  <td>{w.location || "-"}</td>
                  {/* ADDED: customer location, city, address */}
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
                    {isAdmin && (
                      <button className="btn small danger" style={{ marginLeft: 6 }} onClick={() => remove(w)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* ADDED: convert walk-in to lead pop-up */}
      {convertWalkin && (
        <ConvertWalkinModal
          walkin={convertWalkin}
          // UPDATED: also clears the "Follow up" flag on close
          onClose={() => { setConvertWalkin(null); setFollowAfterConvert(false); }}
          // ORIGINAL: onConverted={(text) => { setConvertWalkin(null); flash("success", text); load(); }}
          // UPDATED: same, and when started from "Follow up" the new lead's form opens
          onConverted={(text, leadId) => {
            setConvertWalkin(null); flash("success", text); load();
            if (followAfterConvert && leadId) openLead(leadId);
            setFollowAfterConvert(false);
          }}
        />
      )}

      {/* ADDED: read-only walk-in details (admin) */}
      {isAdmin && viewWalkin && <WalkinViewModal walkin={viewWalkin} onClose={() => setViewWalkin(null)} />}

      {/* ADDED: the lead form opened by "Follow up" (same as the lead cards) */}
      {followLead && (
        <LeadModal
          lead={followLead}
          telecallers={telecallers}
          isAdmin={isAdmin}
          onClose={() => setFollowLead(null)}
          onSaved={() => { setFollowLead(null); load(); }}
        />
      )}

      {modalWalkin && (
        <WalkinModal
          walkin={modalWalkin}
          onClose={() => setModalWalkin(null)}
          onSaved={() => {
            setModalWalkin(null);
            flash("success", modalWalkin.id ? "Walk-in updated" : "Walk-in added");
            load();
          }}
        />
      )}
    </div>
  );
}
