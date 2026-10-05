import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
import BusinessPartnerModal, { PARTNER_CATEGORIES } from "../components/BusinessPartnerModal.jsx";

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
  const limit = 50;
  const [modalPartner, setModalPartner] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.category) q.set("category", filters.category);
    api(`/business-partners?${q}`)
      .then((d) => { setPartners(d.partners); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  }, [page, filters]);

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

  const pages = Math.max(1, Math.ceil(total / limit));
  // ADDED: date display helper (YYYY-MM-DD)
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");
  const waLink = (num) =>
    num ? (
      <a className="wa-link" href={`https://wa.me/${waNumber(num)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
        {num}
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
        <button className="btn" onClick={() => setModalPartner({})}>+ Add</button>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, number, business or location..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">All categories</option>
          {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                <th>Person name</th>
                <th>Contact number</th>
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
                <tr><td colSpan={14} className="empty">No records yet. Click "+ Add" to create one.</td></tr>
              )}
              {partners.map((p) => (
                <tr key={p.id}>
                  <td>{p.person_name}</td>
                  <td>{waLink(p.contact)}</td>
                  <td>{p.business_name || "-"}</td>
                  <td>{p.location || "-"}</td>
                  <td>{waLink(p.whatsapp)}</td>
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

      {pages > 1 && (
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
