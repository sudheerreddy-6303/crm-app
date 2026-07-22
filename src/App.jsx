import React from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Leads from "./pages/Leads.jsx";
import Telecallers from "./pages/Telecallers.jsx";
import TelecallerDetail from "./pages/TelecallerDetail.jsx";
import ImportLeads from "./pages/ImportLeads.jsx";
// ADDED: Service Calls page for the new sidebar button
import ServiceCalls from "./pages/ServiceCalls.jsx";
// ADDED: Walk-ins page for the new sidebar button
import Walkins from "./pages/Walkins.jsx";
// ADDED: Project Details page for the new sidebar button
import ProjectDetails from "./pages/ProjectDetails.jsx";

function Shell({ children }) {
  const user = getUser();
  const navigate = useNavigate();

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          {/* ADDED: Deeraj Interiors logo above the TeleCRM wordmark */}
          <img
            className="di-logo"
            src="https://img1.wsimg.com/isteam/ip/e7e3142b-3f26-4173-bc29-b2315178edb8/DI%20logo%20(2).png/:/rs=w:559,h:192,cg:true,m/cr=w:559,h:192/qt=q:95"
            alt="Deeraj Interiors"
          />
          Tele<span>CRM</span>
        </div>
        <nav>
          <NavLink to="/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/leads">📋 Leads</NavLink>
          {/* ADDED: Service Calls button in the left sidebar */}
          <NavLink to="/service-calls">🛠️ Service Calls</NavLink>
          {/* ADDED: Walk-ins button in the left sidebar */}
          <NavLink to="/walkins">🚶 Walk-ins</NavLink>
          {/* ADDED: Project Details button in the left sidebar */}
          <NavLink to="/project-details">🏗️ Project Details</NavLink>
          {user?.role === "admin" && <NavLink to="/telecallers">👥 Telecallers</NavLink>}
          {user?.role === "admin" && <NavLink to="/import">⬆️ Import</NavLink>}
        </nav>
        <div className="user-box">
          <div>
            <div className="name">{user?.name}</div>
            <div className="role">{user?.role}</div>
          </div>
          <button onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Protected({ children, adminOnly = false }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/leads" element={<Protected><Leads /></Protected>} />
      <Route path="/telecallers" element={<Protected adminOnly><Telecallers /></Protected>} />
      <Route path="/telecallers/:id" element={<Protected adminOnly><TelecallerDetail /></Protected>} />
      <Route path="/import" element={<Protected adminOnly><ImportLeads /></Protected>} />
      {/* ADDED: route for the new Service Calls sidebar button */}
      <Route path="/service-calls" element={<Protected><ServiceCalls /></Protected>} />
      {/* ADDED: route for the new Walk-ins sidebar button */}
      <Route path="/walkins" element={<Protected><Walkins /></Protected>} />
      {/* ADDED: route for the new Project Details sidebar button */}
      <Route path="/project-details" element={<Protected><ProjectDetails /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
