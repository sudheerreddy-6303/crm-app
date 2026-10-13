import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// UPDATED: getUser added (admin-only Export button)
import { api, getUser } from "../api.js";
// ADDED: admin "Export to Excel" (shared helper + button)
import ExportButton from "../components/ExportButton.jsx";
import { downloadExcel } from "../utils/exportExcel.js";

// ADDED: Project cards page. Reached by clicking the "Total projects" card on
// the dashboard. Shows one card per project (same set counted on that card).
// Clicking a project card opens the Leads page filtered to that project, so the
// user sees that project's related data.
export default function ProjectCards() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api("/dashboard/project-summary")
      .then((d) => setProjects(d.projects || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openProject = (name) => navigate(`/leads?project=${encodeURIComponent(name)}`);

  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div>
      {/* UPDATED: title row now also has the admin Export button on the right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <h1 className="page-title">🏗️ Projects</h1>
      {getUser()?.role === "admin" && <ExportButton onExport={async () => downloadExcel([{ name: "Projects summary", rows: projects.map((p) => ({
        "Project": p.name, "Type": p.type || "", "Location": p.location || "",
        "Total database": Number(p.total_leads || 0), "Walk-ins": Number(p.walkins || 0),
        "Quotes sent": Number(p.quotes_sent || 0), "Leads": Number(p.leads || 0),
        "Follow up": Number(p.follow_up || 0), "Interested": Number(p.interested || 0), "Orders": Number(p.orders_booked || 0),
      })), numberCols: ["Total database", "Walk-ins", "Quotes sent", "Leads", "Follow up", "Interested", "Orders"] }], "Projects_summary")} />}
      </div>
      <p className="page-sub">Click a project to see its related leads and data ({projects.length} total)</p>

      {loading ? (
        <div className="empty">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty">No projects found yet.</div>
      ) : (
        <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
          {projects.map((p) => (
            <div className="col" key={p.name}>
              <div
                className="kpi kpi-lg clickable k-blue"
                onClick={() => openProject(p.name)}
                title={`View leads for ${p.name}`}
              >
                {/* ORIGINAL: <div className="label">{p.name}</div>
                    UPDATED: project type on the right of the name, location below it */}
                <div className="pc-head">
                  <div className="label">{p.name}</div>
                  {p.type && <span className="chip none pc-type">{p.type}</span>}
                </div>
                <div className={`pc-loc${p.location ? "" : " pc-loc-missing"}`}>📍 {p.location || "Location not added"}</div>
                <div className="value">{p.total_leads || 0}</div>
                {/* UPDATED order (same as the dashboard): big number = total database,
                    then Walk-ins · Quotes sent · Leads · Follow up.
                    PREVIOUS lines: "Interested · Follow up · Orders" and
                    "Walk-ins · Quotations" - Interested and Orders kept on line 2 */}
                <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--ink-soft)" }}>
                  Walk-ins {p.walkins || 0} · Quotes sent {p.quotes_sent || 0} · Leads {p.leads || 0} · Follow up {p.follow_up || 0}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-soft)" }}>
                  Interested {p.interested || 0} · Orders {p.orders_booked || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
