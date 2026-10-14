// ORIGINAL: import React from "react";
import React, { useState } from "react";
// ADDED: Telecaller name / Projects (multi-select) / Count form
import WhatsAppForm from "../components/WhatsAppForm.jsx";
// ADDED: saved requests history (from the database)
import WhatsAppHistory from "../components/WhatsAppHistory.jsx";

// ADDED: "Meta WhatsApp" page - opened from the sidebar WhatsApp menu.
// Placeholder page: the menu and route are ready; the actual Meta WhatsApp
// (WhatsApp Business / Cloud API) features will be added here.
export default function WhatsAppMeta() {
  // ADDED: bumps after each save so the history list reloads
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div>
      <h1 className="page-title">💬 Meta WhatsApp</h1>
      <p className="page-sub">Official WhatsApp Business (Meta) messaging</p>
      {/* ORIGINAL placeholder card (replaced by the form below):
      <div className="card wa-placeholder">
        <div className="wa-placeholder-icon">💬</div>
        <h3>Meta WhatsApp is being set up</h3>
        <p>This section will connect to your WhatsApp Business account (Meta) for sending official messages and templates to your leads.</p>
      </div>
      */}
      {/* ORIGINAL: <WhatsAppForm channel="Meta WhatsApp" /> */}
      <WhatsAppForm channel="Meta WhatsApp" channelKey="meta" onSaved={() => setReloadKey((k) => k + 1)} />
      {/* ADDED: history */}
      <WhatsAppHistory channel="Meta WhatsApp" channelKey="meta" reloadKey={reloadKey} />
    </div>
  );
}
