// ORIGINAL: import React from "react";
// ORIGINAL: import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
// UPDATED: useState / useEffect / useLocation added for the mobile menu button
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
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
// ADDED: Project cards page - opened from the dashboard "Total projects" card
import ProjectCards from "./pages/ProjectCards.jsx";
// ADDED: Business Associates & Franchise page for the new sidebar button
import BusinessPartners from "./pages/BusinessPartners.jsx";
// ADDED: app-wide success / error popup (shown after every save)
import Popup from "./components/Popup.jsx";

function Shell({ children }) {
  const user = getUser();
  const navigate = useNavigate();

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  // ADDED: mobile menu. On phones the sidebar becomes a slim top bar with a
  // "Menu" button; the links open/close below it. Desktop is unchanged
  // (the button is hidden there by CSS). The menu closes after opening a page.
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* ORIGINAL: <aside className="sidebar"> */}
      <aside className={`sidebar${menuOpen ? " menu-open" : ""}`}>
        {/* ADDED: menu button - only visible on mobile */}
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕ Close" : "☰ Menu"}
        </button>
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
          <NavLink to="/leads">📋 Data</NavLink>
          {/* ADDED: Service Calls button in the left sidebar */}
          <NavLink to="/service-calls">🛠️ Service Calls</NavLink>
          {/* ADDED: Walk-ins button in the left sidebar */}
          <NavLink to="/walkins">🚶 Walk-ins</NavLink>
          {/* ADDED: Project Details button in the left sidebar */}
          <NavLink to="/project-details">🏗️ Project Details</NavLink>
          {/* ADDED: Business Associates & Franchise button in the left sidebar */}
          <NavLink to="/business-partners">🤝 Business Associates &amp; Franchise</NavLink>
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
    // UPDATED: wrapped in a fragment so the app-wide <Popup /> sits next to the routes
    <>
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
      {/* ADDED: route for the project cards grid (from the dashboard "Total projects" card) */}
      <Route path="/project-cards" element={<Protected><ProjectCards /></Protected>} />
      {/* ADDED: route for the Business Associates & Franchise sidebar button */}
      <Route path="/business-partners" element={<Protected><BusinessPartners /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    {/* ADDED: success / error popup after every save (see components/Popup.jsx) */}
    <Popup />
    </>
  );
}
