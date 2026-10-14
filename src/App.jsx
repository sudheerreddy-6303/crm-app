// ORIGINAL: import React from "react";
// ORIGINAL: import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
// UPDATED: useState / useEffect / useLocation added for the mobile menu button
// UPDATED: useRef added (WhatsApp sidebar menu)
import React, { useState, useEffect, useRef } from "react";
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
// ADDED: notifications bell (top-right corner) for telecallers
import NotificationBell from "./components/NotificationBell.jsx";
// ADDED: WhatsApp sidebar menu pages (Meta WhatsApp / Bulk WhatsApp)
import WhatsAppMeta from "./pages/WhatsAppMeta.jsx";
import WhatsAppBulk from "./pages/WhatsAppBulk.jsx";

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
  // ADDED: WhatsApp sub-menu - opens on hover (computer) or tap (phone),
  // and stays open while a WhatsApp page is showing
  const onWhatsAppPage = location.pathname.startsWith("/whatsapp");
  const [waOpen, setWaOpen] = useState(false);
  // true while a real mouse is over the menu (taps on phones are not "hover")
  const waHover = useRef(false);

  // ADDED: Back button handler (see the button above the page content)
  const goBack = () => {
    const idx = window.history.state && window.history.state.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/dashboard");
  };

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
          {/* ADDED: WhatsApp menu - hover (or tap) shows Meta WhatsApp / Bulk WhatsApp */}
          <div
            className={`nav-group${waOpen || onWhatsAppPage ? " open" : ""}`}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") { waHover.current = true; setWaOpen(true); } }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") { waHover.current = false; setWaOpen(false); } }}
          >
            {/* tap (phone) toggles the menu; with a mouse it is already open from hover */}
            <button type="button" className={`nav-group-btn${onWhatsAppPage ? " active" : ""}`}
                    aria-expanded={waOpen || onWhatsAppPage} onClick={() => setWaOpen((o) => (waHover.current ? true : !o))}>
              <span>💬 WhatsApp</span><span className="nav-caret" aria-hidden="true">▸</span>
            </button>
            <div className="nav-submenu">
              <NavLink to="/whatsapp/meta">Meta WhatsApp</NavLink>
              <NavLink to="/whatsapp/bulk">Bulk WhatsApp</NavLink>
            </div>
          </div>
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
      {/* ORIGINAL: <main className="main">{children}</main>
          UPDATED: a "Back" button above every page (not on the Dashboard,
          which is the home page). It goes to the previous page; if there is
          no previous page in this tab (e.g. link opened directly) it goes to
          the Dashboard. Page content below is unchanged. */}
      <main className="main">
        {/* UPDATED: top bar - Back button on the left (unchanged), and the
            notifications bell on the right for telecallers */}
        {(location.pathname !== "/dashboard" || user?.role === "telecaller") && (
          <div className="main-topbar">
            {location.pathname !== "/dashboard" ? (
              <button type="button" className="btn small secondary back-btn" onClick={goBack} title="Go back">
                ← Back
              </button>
            ) : <span />}
            {user?.role === "telecaller" && <NotificationBell />}
          </div>
        )}
        {children}
      </main>
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
      {/* ADDED: WhatsApp sidebar menu pages */}
      <Route path="/whatsapp/meta" element={<Protected><WhatsAppMeta /></Protected>} />
      <Route path="/whatsapp/bulk" element={<Protected><WhatsAppBulk /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    {/* ADDED: success / error popup after every save (see components/Popup.jsx) */}
    <Popup />
    </>
  );
}
