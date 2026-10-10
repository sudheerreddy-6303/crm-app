import React, { useCallback, useEffect, useState } from "react";
// ADDED: used by the project summary cards (click opens that project's leads)
import { useNavigate } from "react-router-dom";
// ADDED: Excel export of project names + phone numbers (same library the
// Import page already uses for its sample file)
import * as XLSX from "xlsx";
import { api, getUser } from "../api.js";
import ProjectModal, { PROJECT_TYPES, PROJECT_STATUSES } from "../components/ProjectModal.jsx";
// ADDED: read-only "View" pop-up for the project cards
import ProjectViewModal from "../components/ProjectViewModal.jsx";

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
  // ADDED: Cards / Table switch - cards are the default, the original table
  // is kept unchanged and shown in "Table" view.
  const [viewMode, setViewMode] = useState("cards");
  // ADDED: project shown in the read-only "View" pop-up
  const [viewProject, setViewProject] = useState(null);

  // ADDED: project summary cards (same cards as the Projects page opened from
  // the dashboard "Total projects" card) shown at the top of this page.
  // Same data source (GET /dashboard/project-summary) - read-only.
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  useEffect(() => {
    api("/dashboard/project-summary")
      .then((d) => setSummary(d.projects || []))
      .catch(() => setSummary([]))
      .finally(() => setSummaryLoading(false));
  }, []);

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

  // ADDED: export project name + phone numbers to Excel. Exports ALL projects
  // that match the current search / type / status filters (every page, not
  // just the 50 on screen). Read-only - nothing in the database is changed.
  const [exporting, setExporting] = useState(false);
  const exportPhones = async () => {
    setExporting(true);
    try {
      const all = [];
      const per = 200; // the API returns at most 200 per request
      for (let pg = 1; pg <= 1000; pg++) {
        const q = new URLSearchParams({ page: pg, limit: per });
        if (filters.search) q.set("search", filters.search);
        if (filters.type) q.set("type", filters.type);
        if (filters.status) q.set("status", filters.status);
        const d = await api(`/projects?${q}`);
        all.push(...(d.projects || []));
        if (!d.projects || d.projects.length < per || all.length >= d.total) break;
      }
      if (all.length === 0) { flash("error", "No projects to export"); return; }
      const rows = all.map((p) => ({
        "Project name": p.project_name || "",
        "Owner contact": p.owner_contact || "",
        "Secondary no.": p.secondary_number || "",
        "Phone 1": p.phone1 || "",
        "Phone 2": p.phone2 || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // keep numbers as text so they don't turn into 9.85E+09 in Excel
      Object.keys(ws).forEach((k) => { if (k[0] !== "!" && ws[k].t === "n") { ws[k].t = "s"; ws[k].v = String(ws[k].v); } });
      ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Project phones");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Project_Phone_Numbers_${today}.xlsx`);
    } catch (e) {
      flash("error", e.message);
    } finally {
      setExporting(false);
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
        {/* ORIGINAL: <button className="btn" onClick={() => setModalProject({})}>+ Add project</button>
            UPDATED: same button, now next to the new Export button */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={exportPhones} disabled={exporting} title="Download project names and phone numbers as Excel">
            {exporting ? "Exporting..." : "⬇ Export phone numbers"}
          </button>
          <button className="btn" onClick={() => setModalProject({})}>+ Add project</button>
        </div>
      </div>

      {msg.text && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}

      {/* ADDED: project summary cards - same as the Projects page. Click a
          card to open that project's leads. */}
      <h3 style={{ margin: "4px 0 10px" }}>Projects summary ({summary.length})</h3>
      {summaryLoading ? (
        <div className="empty">Loading projects...</div>
      ) : summary.length === 0 ? (
        <div className="empty">No projects found yet.</div>
      ) : (
        <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3" style={{ marginBottom: 22 }}>
          {summary.map((p) => (
            <div className="col" key={`ps${p.name}`}>
              <div
                className="kpi kpi-lg clickable k-blue"
                onClick={() => navigate(`/leads?project=${encodeURIComponent(p.name)}`)}
                title={`View leads for ${p.name}`}
              >
                <div className="label">{p.name}</div>
                <div className="value">{p.total_leads || 0}</div>
                <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--ink-soft)" }}>
                  Interested {p.interested || 0} · Follow up {p.follow_up || 0} · Orders {p.orders_booked || 0}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-soft)" }}>
                  Walk-ins {p.walkins || 0} · Quotations {p.quotes_sent || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADDED: heading for the existing project details list below */}
      <h3 style={{ margin: "4px 0 10px" }}>Project details ({total})</h3>

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
        {/* ADDED: Cards / Table switch (same as the Leads page) */}
        <div className="view-toggle" role="group" aria-label="View">
          <button className={`btn small ${viewMode === "cards" ? "" : "secondary"}`} onClick={() => setViewMode("cards")}>▦ Cards</button>
          <button className={`btn small ${viewMode === "table" ? "" : "secondary"}`} onClick={() => setViewMode("table")}>☰ Table</button>
        </div>
      </div>

      {/* ADDED: project cards - same details and buttons as the table row */}
      {viewMode === "cards" && (
        <div className="lead-cards">
          {projects.length === 0 && <div className="card empty">No projects yet. Click "+ Add project" to create one.</div>}
          {projects.map((p) => (
            <div className="lead-card" key={`pc${p.id}`}>
              <div className="lc-head">
                <div>
                  <div className="lc-name">{p.project_name}</div>
                  <div className="lc-sub">{[p.type, p.location].filter(Boolean).join(" · ") || "-"}</div>
                  {/* status shown under the name so long statuses don't squeeze it */}
                  {p.status && <span className="chip none" style={{ display: "inline-block", marginTop: 6 }}>{p.status}</span>}
                </div>
                {/* ADDED: "View" button on the right of the project name */}
                <button className="btn small secondary lc-view" title="View full details" onClick={() => setViewProject(p)}>View</button>
              </div>
              <div className="lc-grid">
                <span>Owner contact</span><b><WaCell value={p.owner_contact} /></b>
                <span>Secondary no.</span><b><WaCell value={p.secondary_number} /></b>
                <span>Sales executive</span><b>{p.sales_executive || "-"}</b>
                <span>Phone 1</span><b><WaCell value={p.phone1} /></b>
                <span>Phone 2</span><b><WaCell value={p.phone2} /></b>
                <span>Data in CRM</span><b>{p.data_in_crm || "-"}</b>
                <span>Marketing</span><b>{p.marketing || "-"}</b>
                <span>Rounds called</span><b>{p.rounds_called ?? 0}</b>
                <span>Last call</span><b>{fmt(p.last_calling_date) || "-"}</b>
                <span>Units booked</span><b>{p.units_booked_interiors ?? 0}</b>
                <span>Units sold</span><b>{p.units_sold ?? 0}</b>
              </div>
              {p.address && (
                <div className="lc-remarks"><div><span>Address:</span> {p.address}</div></div>
              )}
              <div className="lc-actions">
                <button className="btn small secondary" onClick={() => setModalProject(p)}>Edit</button>
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
      )}

      {pages > 1 && (
        <div className="filters" style={{ marginTop: 12 }}>
          <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {pages}</span>
          <button className="btn small secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* ADDED: read-only full project details pop-up */}
      {viewProject && (
        <ProjectViewModal project={viewProject} onClose={() => setViewProject(null)} />
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
