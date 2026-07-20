import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
import ServiceCallModal, { SERVICE_CATEGORIES } from "../components/ServiceCallModal.jsx";

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
        <button className="btn" onClick={() => setModalCall({})}>+ Add service call</button>
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
                <th>Location</th>
                <th>Remarks</th>
                <th>Added by</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 && (
                <tr><td colSpan={8} className="empty">No service calls yet. Click "+ Add service call" to create one.</td></tr>
              )}
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.category || "-"}</td>
                  <td>{c.location || "-"}</td>
                  <td>{c.remarks || "-"}</td>
                  <td>{c.created_by_name || "-"}</td>
                  <td>{fmt(c.created_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
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
    </div>
  );
}
