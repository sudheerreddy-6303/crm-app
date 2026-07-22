import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
import WalkinModal, { WALKIN_PURPOSES } from "../components/WalkinModal.jsx";

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
  const [msg, setMsg] = useState({ type: "", text: "" });

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
        <button className="btn" onClick={() => setModalWalkin({})}>+ Add walk-in</button>
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
      </div>

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

      {pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
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
