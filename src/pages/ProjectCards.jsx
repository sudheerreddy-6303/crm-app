import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

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
      <h1 className="page-title">🏗️ Projects</h1>
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
                <div className="label">{p.name}</div>
                <div className="value">{p.total_leads || 0}</div>
                <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--ink-soft)" }}>
                  Interested {p.interested || 0} · Follow up {p.follow_up || 0} · Orders {p.orders_booked || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
