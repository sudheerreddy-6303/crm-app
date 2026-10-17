import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
// ADDED: 2 rows of cards per page + page numbers
import Pager, { useTwoRowLimit } from "../components/Pager.jsx";
// ADDED: hide phone numbers on cards / table (xxxxxxx963)
// UPDATED: hidden for telecallers only (admin sees full numbers)
// PREVIOUS: import { maskPhone } from "../utils/maskPhone.js";
import { phoneText, cardPhone } from "../utils/maskPhone.js";
import BusinessPartnerModal, { PARTNER_CATEGORIES } from "../components/BusinessPartnerModal.jsx";
// ADDED: app-wide pop-up, shown after "Copy numbers"
import { showPopup } from "../components/Popup.jsx";
// ADDED: admin "Export to Excel" (shared helper + button)
import ExportButton from "../components/ExportButton.jsx";
import { fetchAllPages, downloadExcel, d10 } from "../utils/exportExcel.js";

// ADDED: Business Associates & Franchise page - table of all records, search +
// category filter, and a top-right "+ Add" button that opens the form.
// Mirrors the Walk-ins page. Contact and WhatsApp numbers open WhatsApp.

// WhatsApp number helper (same rule as the Leads / Walk-ins pages): 10-digit
// Indian mobiles get the 91 country code; numbers with a code are used as-is.
function waNumber(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}

export default function BusinessPartners() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [partners, setPartners] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const [page, setPage] = useState(1);
  // ORIGINAL: const limit = 50;  (now: 2 rows of cards per page, 50 in Table view - see useTwoRowLimit below)
  const [modalPartner, setModalPartner] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  // ADDED: Cards / Table switch - cards are the default, the original table
  // is kept unchanged and shown in "Table" view.
  const [viewMode, setViewMode] = useState("cards");
  // ADDED: Cards view shows 2 rows per page (+ page numbers); Table view 50 per page
  const { gridRef: cardsGridRef, limit } = useTwoRowLimit(viewMode === "cards", setPage);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.category) q.set("category", filters.category);
    api(`/business-partners?${q}`)
      .then((d) => { setPartners(d.partners); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  // ORIGINAL: }, [page, filters]);
  }, [page, filters, limit]);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete record for "${p.person_name}"?`)) return;
    try {
      await api(`/business-partners/${p.id}`, { method: "DELETE" });
      flash("success", "Record deleted");
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  // ADDED: "Copy numbers" - copies the contact + WhatsApp numbers of ALL
  // records matching the current search / category (every page, not just the
  // 50 on screen), one number per line, duplicates removed. Read-only.
  const [copying, setCopying] = useState(false);
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* fall back below */ }
    // fallback for older browsers / non-https
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "-1000px";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  };
  const copyNumbers = async () => {
    setCopying(true);
    try {
      const all = [];
      const per = 200; // the API returns at most 200 per request
      for (let pg = 1; pg <= 1000; pg++) {
        const q = new URLSearchParams({ page: pg, limit: per });
        if (filters.search) q.set("search", filters.search);
        if (filters.category) q.set("category", filters.category);
        const d = await api(`/business-partners?${q}`);
        all.push(...(d.partners || []));
        if (!d.partners || d.partners.length < per || all.length >= d.total) break;
      }
      const seen = new Set();
      const numbers = [];
      all.forEach((p) => {
        [p.contact, p.whatsapp].forEach((n) => {
          const v = String(n || "").trim();
          const key = v.replace(/\D/g, "").slice(-10); // same number written differently counts once
          if (v && key && !seen.has(key)) { seen.add(key); numbers.push(v); }
        });
      });
      // UPDATED: a pop-up is shown as well as the message line (both kept)
      if (numbers.length === 0) { flash("error", "No numbers to copy"); showPopup("error", "There are no phone numbers to copy.", "Nothing to copy"); return; }
      const ok = await copyToClipboard(numbers.join("\n"));
      const word = `number${numbers.length === 1 ? "" : "s"}`;
      if (ok) {
        flash("success", `Copied ${numbers.length} ${word} to clipboard`);
        showPopup("success", `${numbers.length} phone ${word} copied. You can paste ${numbers.length === 1 ? "it" : "them"} anywhere now.`, "Numbers copied");
      } else {
        flash("error", "Could not copy - your browser blocked the clipboard");
        showPopup("error", "Your browser blocked copying. Please try again.", "Could not copy");
      }
    } catch (e) {
      flash("error", e.message);
      showPopup("error", e.message, "Could not copy");
    } finally {
      setCopying(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  // ADDED: date display helper (YYYY-MM-DD)
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");
  // UPDATED: 2nd argument "card" = true on cards -> number hidden for everyone
  // ORIGINAL: const waLink = (num) =>
  const waLink = (num, card) =>
    num ? (
      <a className="wa-link" href={`https://wa.me/${waNumber(num)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
        {/* ORIGINAL: {num}  - UPDATED: only last 3 digits shown; full number in the Edit form */}
        {card ? cardPhone(num) : phoneText(num) /* PREVIOUS: {maskPhone(num)} */}
      </a>
    ) : "-";

  return (
    <div>
      {/* Top row: title on the left, Add button on the top right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">🤝 Business Associates &amp; Franchise</h1>
          <p className="page-sub">Business associates, builders, contractors and franchise prospects ({total} total)</p>
        </div>
        {/* ORIGINAL: <button className="btn" onClick={() => setModalPartner({})}>+ Add</button>
            UPDATED: same button, now next to the new "Copy numbers" button */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* ADDED: Export to Excel (admin only) */}
          {isAdmin && <ExportButton onExport={async () => {
            const rows = await fetchAllPages("/business-partners", { search: filters.search, category: filters.category }, "partners");
            return downloadExcel([{ name: "Business associates", rows: rows.map((p) => ({
              "Person name": p.person_name || "", "Contact number": p.contact || "", "Owner name": p.owner_name || "",
              "Business name": p.business_name || "", "Location": p.location || "", "WhatsApp": p.whatsapp || "",
              "Category": p.category || "", "Call 1 date": d10(p.calling_date), "Call 2 date": d10(p.calling_date_2),
              "WhatsApp 1 date": d10(p.whatsapp_sent_date), "WhatsApp 2 date": d10(p.whatsapp_sent_date_2),
              "Call 1 remark": p.call_remark_1 || "", "Call 2 remark": p.call_remark_2 || "",
              "Added by": p.created_by_name || "", "Created": d10(p.created_at),
            })) }], filters.category ? `Business_associates_${filters.category}` : "Business_associates");
          }} />}
          {/* UPDATED: admin only - telecallers must not see full numbers
              ORIGINAL: same button, shown to everyone */}
          {isAdmin && (
          <button className="btn secondary" onClick={copyNumbers} disabled={copying}
                  title="Copy all contact and WhatsApp numbers (matching the search / category)">
            {copying ? "Copying..." : "📋 Copy numbers"}
          </button>
          )}
          <button className="btn" onClick={() => setModalPartner({})}>+ Add</button>
        </div>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, owner, number, business or location..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">All categories</option>
          {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* ADDED: Cards / Table switch (same as the Leads / Project Details pages) */}
        <div className="view-toggle" role="group" aria-label="View">
          <button className={`btn small ${viewMode === "cards" ? "" : "secondary"}`} onClick={() => setViewMode("cards")}>▦ Cards</button>
          <button className={`btn small ${viewMode === "table" ? "" : "secondary"}`} onClick={() => setViewMode("table")}>☰ Table</button>
        </div>
      </div>

      {/* ADDED: one card per record - same details and buttons as the table row */}
      {viewMode === "cards" && (
        <div className="lead-cards" ref={cardsGridRef}>
          {partners.length === 0 && <div className="card empty">No records yet. Click "+ Add" to create one.</div>}
          {partners.map((p) => (
            <div className="lead-card" key={`bc${p.id}`}>
              <div className="lc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="lc-name">{p.person_name}</div>
                  <div className="lc-sub">{[p.business_name, p.location].filter(Boolean).join(" · ") || "-"}</div>
                </div>
                {p.category && <span className="chip none">{p.category}</span>}
              </div>
              <div className="lc-grid">
                <span>Contact number</span><b>{waLink(p.contact, true) /* ORIGINAL: waLink(p.contact) */}</b>
                {/* ADDED: owner's name */}
                <span>Owner name</span><b>{p.owner_name || "-"}</b>
                <span>WhatsApp</span><b>{waLink(p.whatsapp, true) /* ORIGINAL: waLink(p.whatsapp) */}</b>
                <span>Call 1 date</span><b>{fmt(p.calling_date) || "-"}</b>
                <span>Call 2 date</span><b>{fmt(p.calling_date_2) || "-"}</b>
                <span>WhatsApp 1 date</span><b>{fmt(p.whatsapp_sent_date) || "-"}</b>
                <span>WhatsApp 2 date</span><b>{fmt(p.whatsapp_sent_date_2) || "-"}</b>
                <span>Added by</span><b>{p.created_by_name || "-"}</b>
              </div>
              {(p.call_remark_1 || p.call_remark_2) && (
                <div className="lc-remarks">
                  {p.call_remark_1 && <div><span>Call 1 remark:</span> {p.call_remark_1}</div>}
                  {p.call_remark_2 && <div><span>Call 2 remark:</span> {p.call_remark_2}</div>}
                </div>
              )}
              <div className="lc-actions">
                <button className="btn small secondary" onClick={() => setModalPartner(p)}>Edit</button>
                {isAdmin && (
                  <button className="btn small danger" onClick={() => remove(p)}>Delete</button>
                )}
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
                <th>Person name</th>
                <th>Contact number</th>
                {/* ADDED: owner's name */}
                <th>Owner name</th>
                <th>Business name</th>
                <th>Location</th>
                <th>WhatsApp</th>
                <th>Category</th>
                {/* ADDED: calling date + WhatsApp sent date */}
                {/* UPDATED headers: Call 1 / Call 2 dates, WhatsApp 1 / WhatsApp 2 dates */}
                <th>Call 1 date</th>
                <th>Call 2 date</th>
                <th>WhatsApp 1 date</th>
                <th>WhatsApp 2 date</th>
                <th>Call 1 remark</th>
                <th>Call 2 remark</th>
                <th>Added by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 && (
                <tr><td colSpan={15} className="empty">No records yet. Click "+ Add" to create one.</td></tr>
              )}
              {partners.map((p) => (
                <tr key={p.id}>
                  <td>{p.person_name}</td>
                  <td>{waLink(p.contact, true) /* ORIGINAL: waLink(p.contact) */}</td>
                  {/* ADDED: owner's name */}
                  <td>{p.owner_name || "-"}</td>
                  <td>{p.business_name || "-"}</td>
                  <td>{p.location || "-"}</td>
                  <td>{waLink(p.whatsapp, true) /* ORIGINAL: waLink(p.whatsapp) */}</td>
                  <td>{p.category || "-"}</td>
                  {/* ADDED: calling date + WhatsApp sent date */}
                  <td>{fmt(p.calling_date) || "-"}</td>
                  {/* ADDED: 2nd call date */}
                  <td>{fmt(p.calling_date_2) || "-"}</td>
                  <td>{fmt(p.whatsapp_sent_date) || "-"}</td>
                  {/* ADDED: 2nd WhatsApp sent date */}
                  <td>{fmt(p.whatsapp_sent_date_2) || "-"}</td>
                  <td className="remark">{p.call_remark_1 || "-"}</td>
                  <td className="remark">{p.call_remark_2 || "-"}</td>
                  <td>{p.created_by_name || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn small secondary" onClick={() => setModalPartner(p)}>Edit</button>
                    {isAdmin && (
                      <button className="btn small danger" style={{ marginLeft: 6 }} onClick={() => remove(p)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ADDED: numbered pages for the Cards view (2 rows per page) */}
      {viewMode === "cards" && <Pager page={page} pages={pages} total={total} onPage={setPage} noun="records" />}

      {/* ORIGINAL Prev / Next - kept for the Table view */}
      {viewMode === "table" && pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {modalPartner && (
        <BusinessPartnerModal
          partner={modalPartner}
          onClose={() => setModalPartner(null)}
          onSaved={() => {
            setModalPartner(null);
            flash("success", modalPartner.id ? "Record updated" : "Record added");
            load();
          }}
        />
      )}
    </div>
  );
}
