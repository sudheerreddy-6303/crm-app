import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
import ServiceCallModal, { SERVICE_CATEGORIES } from "../components/ServiceCallModal.jsx";
// ADDED: Excel/CSV import modal for service calls
import ServiceCallImportModal from "../components/ServiceCallImportModal.jsx";

// ADDED: WhatsApp helpers (same pattern as the Leads page).
// Builds a wa.me link that opens WhatsApp (mobile app on phones, WhatsApp Web /
// Desktop on computers) with the service call's number selected and a greeting
// message pre-typed. WhatsApp does not allow auto-send; the user taps send.
function waNumber(rawPhone) {
  // keep digits only
  let digits = String(rawPhone || "").replace(/\D/g, "");
  // A plain 10-digit Indian mobile needs the 91 country code.
  // Numbers that already include a country code (11-15 digits) are used as-is.
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}
function waMessage(call) {
  const name = call.name ? ` ${call.name}` : "";
  const category = call.category ? ` regarding your *${call.category}* service request` : "";
  return `Hello${name}, this is Deeraj Interiors${category}. How can we help you today?`;
}
function openWhatsApp(call) {
  const num = waNumber(call.phone);
  if (!num || num.length < 11) {
    alert("This service call does not have a valid phone number for WhatsApp.");
    return;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(waMessage(call))}`;
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

// UPDATED: was a "coming soon" placeholder - now a full Service Calls page:
// table of service calls, search + category filter, and a top-right
// "+ Add service call" button that opens the modal (Name, Phone number,
// Category dropdown, Location, Remarks).
export default function ServiceCalls() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const [page, setPage] = useState(1);
  const limit = 50;
  const [modalCall, setModalCall] = useState(null);
  // ADDED: controls the Excel/CSV import modal
  const [showImport, setShowImport] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.category) q.set("category", filters.category);
    api(`/service-calls?${q}`)
      .then((d) => { setCalls(d.serviceCalls); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete service call for "${c.name}"?`)) return;
    try {
      await api(`/service-calls/${c.id}`, { method: "DELETE" });
      flash("success", "Service call deleted");
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
          <h1 className="page-title">🛠️ Service Calls</h1>
          <p className="page-sub">Track and manage customer service calls ({total} total)</p>
        </div>
        {/* ADDED: Import Excel button (admin only) - opens the import modal.
            Sits next to the existing "+ Add service call" button. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && (
            <button className="btn secondary" onClick={() => setShowImport(true)}>⬆️ Import Excel</button>
          )}
          <button className="btn" onClick={() => setModalCall({})}>+ Add service call</button>
        </div>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, phone or location..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">Categories</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone number</th>
                <th>Category</th>
                {/* ADDED: City + Experience columns (populated by the Excel import) */}
                <th>City</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Remarks</th>
                <th>Added by</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 && (
                <tr><td colSpan={10} className="empty">No service calls yet. Click "+ Add service call" to create one.</td></tr>
              )}
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.category || "-"}</td>
                  {/* ADDED: City + Experience cells */}
                  <td>{c.city || "-"}</td>
                  <td>{c.location || "-"}</td>
                  <td>{c.experience || "-"}</td>
                  <td>{c.remarks || "-"}</td>
                  <td>{c.created_by_name || "-"}</td>
                  <td>{fmt(c.created_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {/* ADDED: WhatsApp button - opens WhatsApp with number + message ready */}
                    <button
                      className="btn small wa-btn"
                      style={{ marginRight: 6 }}
                      title="Send WhatsApp message"
                      onClick={() => openWhatsApp(c)}
                    >
                      <WhatsAppIcon />
                    </button>
                    <button className="btn small secondary" onClick={() => setModalCall(c)}>Edit</button>
                    {isAdmin && (
                      <button className="btn small danger" style={{ marginLeft: 6 }} onClick={() => remove(c)}>Delete</button>
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

      {modalCall && (
        <ServiceCallModal
          call={modalCall}
          onClose={() => setModalCall(null)}
          onSaved={() => {
            setModalCall(null);
            flash("success", modalCall.id ? "Service call updated" : "Service call added");
            load();
          }}
        />
      )}

      {/* ADDED: Excel/CSV import modal */}
      {showImport && (
        <ServiceCallImportModal
          onClose={() => setShowImport(false)}
          onImported={(data) => {
            setShowImport(false);
            flash("success", (data && data.message) || "Service calls imported");
            setPage(1);
            load();
          }}
        />
      )}
    </div>
  );
}
