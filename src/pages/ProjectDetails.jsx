import React, { useCallback, useEffect, useState } from "react";
import { api, getUser } from "../api.js";
import ProjectModal, { PROJECT_TYPES, PROJECT_STATUSES } from "../components/ProjectModal.jsx";

// ADDED: Project Details page - table of all projects, search + type/status
// filters, and a top-right "+ Add project" button. Mirrors the Walk-ins page.
// Phone numbers are WhatsApp links, like the other pages.

function waNumber(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}
// Render a phone value as a WhatsApp link, or "-" when empty.
function WaCell({ value }) {
  if (!value) return "-";
  return (
    <a className="wa-link" href={`https://wa.me/${waNumber(value)}`} target="_blank" rel="noreferrer" title="Open WhatsApp chat">
      {value}
    </a>
  );
}

export default function ProjectDetails() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });
  const [page, setPage] = useState(1);
  const limit = 50;
  const [modalProject, setModalProject] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit });
    if (filters.search) q.set("search", filters.search);
    if (filters.type) q.set("type", filters.type);
    if (filters.status) q.set("status", filters.status);
    api(`/projects?${q}`)
      .then((d) => { setProjects(d.projects); setTotal(d.total); })
      .catch((e) => setMsg({ type: "error", text: e.message }));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete project "${p.project_name}"?`)) return;
    try {
      await api(`/projects/${p.id}`, { method: "DELETE" });
      flash("success", "Project deleted");
      load();
    } catch (e) {
      flash("error", e.message);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  const fmt = (d) => (d ? String(d).slice(0, 10) : "");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">🏗️ Project Details</h1>
          <p className="page-sub">All projects and their sales / interior status ({total} total)</p>
        </div>
        <button className="btn" onClick={() => setModalProject({})}>+ Add project</button>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search name, number, location or executive..."
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }); }}
        />
        <select value={filters.type} onChange={(e) => { setPage(1); setFilters({ ...filters, type: e.target.value }); }}>
          <option value="">All types</option>
          {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }); }}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap sticky-scroll">
          <table>
            <thead>
              <tr>
                <th>Project name</th>
                <th>Owner contact</th>
                <th>Secondary no.</th>
                <th>Location</th>
                <th>Address</th>
                <th>Type</th>
                <th>Sales executive</th>
                <th>Phone 1</th>
                <th>Phone 2</th>
                <th>Status</th>
                <th>Data in CRM</th>
                <th>Marketing</th>
                <th>Rounds called</th>
                <th>Last call</th>
                <th>Units booked</th>
                <th>Units sold</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr><td colSpan={17} className="empty">No projects yet. Click "+ Add project" to create one.</td></tr>
              )}
              {projects.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.project_name}</strong></td>
                  <td><WaCell value={p.owner_contact} /></td>
                  <td><WaCell value={p.secondary_number} /></td>
                  <td>{p.location || "-"}</td>
                  <td className="remark">{p.address || "-"}</td>
                  <td>{p.type || "-"}</td>
                  <td>{p.sales_executive || "-"}</td>
                  <td><WaCell value={p.phone1} /></td>
                  <td><WaCell value={p.phone2} /></td>
                  <td>{p.status || "-"}</td>
                  <td>{p.data_in_crm || "-"}</td>
                  <td>{p.marketing || "-"}</td>
                  <td>{p.rounds_called ?? 0}</td>
                  <td>{fmt(p.last_calling_date) || "-"}</td>
                  <td>{p.units_booked_interiors ?? 0}</td>
                  <td>{p.units_sold ?? 0}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn small secondary" onClick={() => setModalProject(p)}>Edit</button>
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

      {modalProject && (
        <ProjectModal
          project={modalProject}
          onClose={() => setModalProject(null)}
          onSaved={() => {
            setModalProject(null);
            flash("success", modalProject.id ? "Project updated" : "Project added");
            load();
          }}
        />
      )}
    </div>
  );
}
